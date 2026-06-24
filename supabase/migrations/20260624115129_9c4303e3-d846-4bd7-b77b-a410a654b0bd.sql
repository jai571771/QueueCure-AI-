
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('receptionist', 'doctor');
CREATE TYPE public.visit_type AS ENUM ('general','follow_up','prescription','lab_review','vaccination','emergency');
CREATE TYPE public.queue_status AS ENUM ('waiting','called','in_progress','completed','skipped','removed');
CREATE TYPE public.priority_level AS ENUM ('normal','urgent','emergency');
CREATE TYPE public.audit_event_type AS ENUM (
  'patient_added','token_called','consultation_started','consultation_completed',
  'patient_skipped','patient_removed','emergency_inserted','eta_recomputed'
);
CREATE TYPE public.eta_change_reason AS ENUM ('emergency','faster_consultations','slower_consultations','normal_progress');

-- ===== CLINICS =====
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinics TO authenticated, anon;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinics readable by everyone" ON public.clinics FOR SELECT USING (true);

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  default_clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== CLINIC MEMBERS =====
CREATE TABLE public.clinic_members (
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, user_id)
);
GRANT SELECT ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members self read" ON public.clinic_members FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_clinic_access(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE user_id = _user_id AND clinic_id = _clinic_id)
$$;

-- ===== TOKEN COUNTERS (atomic generation) =====
CREATE TABLE public.token_counters (
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  counter_date DATE NOT NULL,
  last_token INT NOT NULL DEFAULT 0,
  PRIMARY KEY (clinic_id, counter_date)
);
GRANT ALL ON public.token_counters TO service_role;
ALTER TABLE public.token_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_token(_clinic_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _next INT;
BEGIN
  INSERT INTO public.token_counters (clinic_id, counter_date, last_token)
  VALUES (_clinic_id, _today, 0)
  ON CONFLICT (clinic_id, counter_date) DO NOTHING;

  UPDATE public.token_counters
  SET last_token = last_token + 1
  WHERE clinic_id = _clinic_id AND counter_date = _today
  RETURNING last_token INTO _next;

  RETURN _next;
END;
$$;

-- ===== QUEUE PATIENTS =====
CREATE TABLE public.queue_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  token_number INT NOT NULL,
  patient_name TEXT NOT NULL,
  age INT,
  phone TEXT,
  visit_type public.visit_type NOT NULL DEFAULT 'general',
  priority public.priority_level NOT NULL DEFAULT 'normal',
  status public.queue_status NOT NULL DEFAULT 'waiting',
  predicted_duration_minutes INT NOT NULL DEFAULT 8,
  current_eta_minutes INT,
  notes TEXT,
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  called_by UUID,
  doctor_id UUID
);
CREATE INDEX idx_queue_patients_clinic_status ON public.queue_patients(clinic_id, status);
CREATE INDEX idx_queue_patients_clinic_created ON public.queue_patients(clinic_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_patients TO authenticated;
GRANT ALL ON public.queue_patients TO service_role;
ALTER TABLE public.queue_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue select clinic members" ON public.queue_patients FOR SELECT TO authenticated
  USING (public.has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "queue insert receptionists" ON public.queue_patients FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_access(auth.uid(), clinic_id) AND public.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "queue update clinic members" ON public.queue_patients FOR UPDATE TO authenticated
  USING (public.has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (public.has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "queue delete receptionists" ON public.queue_patients FOR DELETE TO authenticated
  USING (public.has_clinic_access(auth.uid(), clinic_id) AND public.has_role(auth.uid(), 'receptionist'));

-- ===== CONSULTATION EVENTS =====
CREATE TABLE public.consultation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.queue_patients(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL,
  visit_type public.visit_type NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_seconds INT GENERATED ALWAYS AS (GREATEST(0, EXTRACT(EPOCH FROM (completed_at - started_at))::INT)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consult_events_clinic_vt ON public.consultation_events(clinic_id, visit_type);
GRANT SELECT, INSERT ON public.consultation_events TO authenticated;
GRANT ALL ON public.consultation_events TO service_role;
ALTER TABLE public.consultation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consult events select" ON public.consultation_events FOR SELECT TO authenticated
  USING (public.has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "consult events insert doctor" ON public.consultation_events FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_access(auth.uid(), clinic_id) AND public.has_role(auth.uid(), 'doctor'));

-- ===== DURATION STATS (EWMA) =====
CREATE TABLE public.duration_stats (
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  visit_type public.visit_type NOT NULL,
  ewma_seconds DOUBLE PRECISION NOT NULL DEFAULT 480,
  variance DOUBLE PRECISION NOT NULL DEFAULT 0,
  sample_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, visit_type)
);
GRANT SELECT ON public.duration_stats TO authenticated;
GRANT ALL ON public.duration_stats TO service_role;
ALTER TABLE public.duration_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stats select clinic members" ON public.duration_stats FOR SELECT TO authenticated
  USING (public.has_clinic_access(auth.uid(), clinic_id));

-- ===== QUEUE AUDIT LOG =====
CREATE TABLE public.queue_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID,
  actor_id UUID,
  event public.audit_event_type NOT NULL,
  from_status public.queue_status,
  to_status public.queue_status,
  eta_before_minutes INT,
  eta_after_minutes INT,
  reason public.eta_change_reason,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_clinic_created ON public.queue_audit_log(clinic_id, created_at DESC);
CREATE INDEX idx_audit_patient_created ON public.queue_audit_log(patient_id, created_at DESC);
GRANT SELECT ON public.queue_audit_log TO authenticated;
GRANT ALL ON public.queue_audit_log TO service_role;
ALTER TABLE public.queue_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit select clinic members" ON public.queue_audit_log FOR SELECT TO authenticated
  USING (public.has_clinic_access(auth.uid(), clinic_id));

-- ===== BASELINE DURATIONS =====
CREATE OR REPLACE FUNCTION public.baseline_seconds(_vt public.visit_type)
RETURNS INT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE _vt
    WHEN 'general' THEN 480
    WHEN 'follow_up' THEN 240
    WHEN 'prescription' THEN 180
    WHEN 'lab_review' THEN 300
    WHEN 'vaccination' THEN 120
    WHEN 'emergency' THEN 900
  END;
$$;

CREATE OR REPLACE FUNCTION public.predicted_seconds(_clinic_id UUID, _vt public.visit_type)
RETURNS INT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ewma DOUBLE PRECISION; _n INT;
BEGIN
  SELECT ewma_seconds, sample_count INTO _ewma, _n
  FROM public.duration_stats WHERE clinic_id = _clinic_id AND visit_type = _vt;
  IF _n IS NULL OR _n < 3 THEN
    RETURN public.baseline_seconds(_vt);
  END IF;
  RETURN GREATEST(60, _ewma)::INT;
END;
$$;

-- ===== ETA RECOMPUTE =====
CREATE OR REPLACE FUNCTION public.recompute_clinic_etas(_clinic_id UUID, _reason public.eta_change_reason)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  _cum INT := 0;
  _in_progress_remaining INT := 0;
  _ipr RECORD;
  _old INT;
BEGIN
  -- estimate remaining time for in-progress patient
  SELECT id, started_at, predicted_duration_minutes INTO _ipr
  FROM public.queue_patients
  WHERE clinic_id = _clinic_id AND status = 'in_progress'
  ORDER BY started_at ASC LIMIT 1;

  IF FOUND THEN
    _in_progress_remaining := GREATEST(0,
      _ipr.predicted_duration_minutes - FLOOR(EXTRACT(EPOCH FROM (now() - _ipr.started_at))/60)::INT
    );
  END IF;

  _cum := _in_progress_remaining;

  FOR r IN
    SELECT id, predicted_duration_minutes, current_eta_minutes
    FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status IN ('waiting','called')
    ORDER BY
      CASE priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
      created_at ASC
  LOOP
    _old := r.current_eta_minutes;
    UPDATE public.queue_patients SET current_eta_minutes = _cum WHERE id = r.id;
    IF _old IS DISTINCT FROM _cum AND (_old IS NULL OR ABS(_old - _cum) >= 1) THEN
      INSERT INTO public.queue_audit_log (clinic_id, patient_id, event, eta_before_minutes, eta_after_minutes, reason)
      VALUES (_clinic_id, r.id, 'eta_recomputed', _old, _cum, _reason);
    END IF;
    _cum := _cum + COALESCE(r.predicted_duration_minutes, 8);
  END LOOP;
END;
$$;

-- ===== TRIGGER: queue_patients audit + emergency recompute =====
CREATE OR REPLACE FUNCTION public.tg_queue_patients_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.queue_audit_log (clinic_id, patient_id, actor_id, event, to_status, metadata)
    VALUES (NEW.clinic_id, NEW.id, _actor,
      CASE WHEN NEW.priority = 'emergency' THEN 'emergency_inserted'::audit_event_type ELSE 'patient_added'::audit_event_type END,
      NEW.status,
      jsonb_build_object('token', NEW.token_number, 'visit_type', NEW.visit_type, 'priority', NEW.priority));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.queue_audit_log (clinic_id, patient_id, actor_id, event, from_status, to_status, metadata)
      VALUES (NEW.clinic_id, NEW.id, _actor,
        CASE NEW.status
          WHEN 'called' THEN 'token_called'::audit_event_type
          WHEN 'in_progress' THEN 'consultation_started'::audit_event_type
          WHEN 'completed' THEN 'consultation_completed'::audit_event_type
          WHEN 'skipped' THEN 'patient_skipped'::audit_event_type
          WHEN 'removed' THEN 'patient_removed'::audit_event_type
          ELSE 'patient_added'::audit_event_type
        END,
        OLD.status, NEW.status,
        jsonb_build_object('token', NEW.token_number));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER queue_patients_audit_trg
AFTER INSERT OR UPDATE ON public.queue_patients
FOR EACH ROW EXECUTE FUNCTION public.tg_queue_patients_audit();

CREATE OR REPLACE FUNCTION public.tg_queue_patients_after()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.priority = 'emergency' THEN
    PERFORM public.recompute_clinic_etas(NEW.clinic_id, 'emergency');
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_clinic_etas(NEW.clinic_id, 'normal_progress');
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.recompute_clinic_etas(NEW.clinic_id, 'normal_progress');
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER queue_patients_after_trg
AFTER INSERT OR UPDATE ON public.queue_patients
FOR EACH ROW EXECUTE FUNCTION public.tg_queue_patients_after();

-- ===== TRIGGER: consultation_events -> EWMA + recompute =====
CREATE OR REPLACE FUNCTION public.tg_consult_event_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _alpha CONSTANT DOUBLE PRECISION := 0.3;
  _old_ewma DOUBLE PRECISION;
  _old_n INT;
  _new_ewma DOUBLE PRECISION;
  _new_var DOUBLE PRECISION;
  _delta DOUBLE PRECISION;
  _reason public.eta_change_reason := 'normal_progress';
  _baseline INT := public.baseline_seconds(NEW.visit_type);
BEGIN
  SELECT ewma_seconds, sample_count INTO _old_ewma, _old_n
  FROM public.duration_stats
  WHERE clinic_id = NEW.clinic_id AND visit_type = NEW.visit_type;

  IF _old_n IS NULL THEN
    _new_ewma := NEW.duration_seconds;
    _new_var := 0;
    INSERT INTO public.duration_stats (clinic_id, visit_type, ewma_seconds, variance, sample_count, updated_at)
    VALUES (NEW.clinic_id, NEW.visit_type, _new_ewma, _new_var, 1, now());
  ELSE
    _new_ewma := _alpha * NEW.duration_seconds + (1 - _alpha) * _old_ewma;
    _delta := NEW.duration_seconds - _old_ewma;
    SELECT variance INTO _new_var FROM public.duration_stats
      WHERE clinic_id = NEW.clinic_id AND visit_type = NEW.visit_type;
    _new_var := (1 - _alpha) * (_new_var + _alpha * _delta * _delta);
    UPDATE public.duration_stats
      SET ewma_seconds = _new_ewma, variance = _new_var,
          sample_count = sample_count + 1, updated_at = now()
      WHERE clinic_id = NEW.clinic_id AND visit_type = NEW.visit_type;
  END IF;

  -- update all waiting patients' predicted_duration_minutes for this visit_type
  UPDATE public.queue_patients
    SET predicted_duration_minutes = GREATEST(1, CEIL(public.predicted_seconds(NEW.clinic_id, visit_type)::numeric / 60)::INT)
    WHERE clinic_id = NEW.clinic_id AND status IN ('waiting','called');

  IF _new_ewma < _baseline * 0.9 THEN
    _reason := 'faster_consultations';
  ELSIF _new_ewma > _baseline * 1.1 THEN
    _reason := 'slower_consultations';
  END IF;

  PERFORM public.recompute_clinic_etas(NEW.clinic_id, _reason);
  RETURN NEW;
END;
$$;

CREATE TRIGGER consult_event_stats_trg
AFTER INSERT ON public.consultation_events
FOR EACH ROW EXECUTE FUNCTION public.tg_consult_event_stats();

-- ===== QUEUE HEALTH + RISK =====
CREATE OR REPLACE FUNCTION public.compute_queue_health(_clinic_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _waiting INT;
  _avg_seconds DOUBLE PRECISION;
  _clearance_minutes INT;
  _status TEXT;
  _action TEXT;
  _active_doctors INT;
BEGIN
  SELECT COUNT(*) INTO _waiting FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status IN ('waiting','called');

  SELECT COALESCE(AVG(ewma_seconds), 480) INTO _avg_seconds
    FROM public.duration_stats WHERE clinic_id = _clinic_id;

  SELECT GREATEST(1, COUNT(DISTINCT doctor_id)) INTO _active_doctors
    FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status = 'in_progress' AND doctor_id IS NOT NULL;
  IF _active_doctors IS NULL OR _active_doctors = 0 THEN _active_doctors := 1; END IF;

  _clearance_minutes := CEIL((_waiting * _avg_seconds / 60.0) / _active_doctors)::INT;

  IF _waiting <= 5 THEN
    _status := 'healthy';
    _action := 'Operating normally — no action required.';
  ELSIF _waiting <= 15 THEN
    _status := 'moderate';
    _action := 'Queue load is building. Encourage faster intake handoffs.';
  ELSE
    _status := 'critical';
    _action := 'Consider assigning another doctor during peak hours.';
  END IF;

  RETURN jsonb_build_object(
    'status', _status,
    'waiting', _waiting,
    'avg_service_seconds', ROUND(_avg_seconds)::INT,
    'clearance_minutes', _clearance_minutes,
    'active_doctors', _active_doctors,
    'recommended_action', _action
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_queue_risk(_clinic_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _arrivals INT;
  _arrival_rate DOUBLE PRECISION;
  _service_rate DOUBLE PRECISION;
  _avg_min DOUBLE PRECISION;
  _waiting INT;
  _emergency INT;
  _active_doctors INT;
  _ratio DOUBLE PRECISION;
  _level TEXT;
  _reason TEXT;
  _clearance_minutes INT;
  _avg_seconds DOUBLE PRECISION;
BEGIN
  SELECT COUNT(*) INTO _arrivals FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND created_at > now() - interval '30 minutes';
  _arrival_rate := _arrivals * 2.0;

  SELECT COUNT(*) INTO _waiting FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status IN ('waiting','called');
  SELECT COUNT(*) INTO _emergency FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status IN ('waiting','called') AND priority = 'emergency';

  SELECT COALESCE(AVG(ewma_seconds), 480) INTO _avg_seconds
    FROM public.duration_stats WHERE clinic_id = _clinic_id;
  _avg_min := GREATEST(1.0, _avg_seconds / 60.0);

  SELECT GREATEST(1, COUNT(DISTINCT doctor_id)) INTO _active_doctors
    FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status = 'in_progress' AND doctor_id IS NOT NULL;
  IF _active_doctors IS NULL OR _active_doctors = 0 THEN _active_doctors := 1; END IF;

  _service_rate := _active_doctors * (60.0 / _avg_min);
  _ratio := _arrival_rate / GREATEST(_service_rate, 1.0);

  IF _emergency > 0 OR _waiting > 15 OR _ratio > 1.1 THEN
    _level := 'high';
    _reason := 'Current demand exceeds service capacity.';
  ELSIF _ratio >= 0.85 OR _waiting > 5 THEN
    _level := 'moderate';
    _reason := 'Queue load is increasing.';
  ELSE
    _level := 'low';
    _reason := 'Queue operating normally.';
  END IF;

  _clearance_minutes := CEIL((_waiting * _avg_min) / _active_doctors)::INT;

  RETURN jsonb_build_object(
    'level', _level,
    'reason', _reason,
    'arrival_rate_per_hour', ROUND(_arrival_rate)::INT,
    'service_rate_per_hour', ROUND(_service_rate)::INT,
    'queue_load', _waiting,
    'active_doctors', _active_doctors,
    'clearance_minutes', _clearance_minutes,
    'expected_clearance_at', (now() + (_clearance_minutes || ' minutes')::interval)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_queue_health(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.compute_queue_risk(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_clinic_access(UUID, UUID) TO authenticated;

-- ===== PUBLIC TRACKING FUNCTION =====
CREATE OR REPLACE FUNCTION public.get_public_tracking(_clinic_slug TEXT, _token INT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _clinic public.clinics%ROWTYPE;
  _p public.queue_patients%ROWTYPE;
  _ahead INT;
  _eta INT;
  _confidence_tier TEXT;
  _sample INT;
  _last_change RECORD;
  _health JSONB;
  _risk JSONB;
BEGIN
  SELECT * INTO _clinic FROM public.clinics WHERE slug = _clinic_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO _p FROM public.queue_patients
    WHERE clinic_id = _clinic.id AND token_number = _token
    ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COUNT(*) INTO _ahead FROM public.queue_patients
    WHERE clinic_id = _clinic.id AND status IN ('waiting','called')
      AND (
        (CASE priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
         created_at)
        <
        (CASE _p.priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
         _p.created_at)
      );

  _eta := COALESCE(_p.current_eta_minutes, 0);

  SELECT COALESCE(sample_count, 0) INTO _sample
    FROM public.duration_stats WHERE clinic_id = _clinic.id AND visit_type = _p.visit_type;
  IF _sample IS NULL THEN _sample := 0; END IF;

  IF _sample >= 20 THEN _confidence_tier := 'high';
  ELSIF _sample >= 5 THEN _confidence_tier := 'medium';
  ELSE _confidence_tier := 'low';
  END IF;

  SELECT eta_before_minutes, eta_after_minutes, reason, created_at INTO _last_change
    FROM public.queue_audit_log
    WHERE patient_id = _p.id AND event = 'eta_recomputed'
    ORDER BY created_at DESC LIMIT 1;

  _health := public.compute_queue_health(_clinic.id);
  _risk := public.compute_queue_risk(_clinic.id);

  RETURN jsonb_build_object(
    'clinic_name', _clinic.name,
    'clinic_slug', _clinic.slug,
    'token_number', _p.token_number,
    'status', _p.status,
    'visit_type', _p.visit_type,
    'priority', _p.priority,
    'patients_ahead', _ahead,
    'eta_minutes', _eta,
    'predicted_call_at', (now() + (_eta || ' minutes')::interval),
    'recommended_arrival_at', GREATEST(now(), (now() + ((_eta - 10) || ' minutes')::interval)),
    'confidence_tier', _confidence_tier,
    'sample_count', _sample,
    'last_change', CASE WHEN _last_change.created_at IS NOT NULL THEN jsonb_build_object(
      'eta_before', _last_change.eta_before_minutes,
      'eta_after', _last_change.eta_after_minutes,
      'reason', _last_change.reason,
      'at', _last_change.created_at
    ) ELSE NULL END,
    'health', _health,
    'risk', _risk,
    'patient_id', _p.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tracking(TEXT, INT) TO anon, authenticated;

-- ===== HANDLE NEW USER =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== REALTIME =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_audit_log;

-- ===== SEED CLINIC =====
INSERT INTO public.clinics (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'QueueCure Demo Clinic', 'demo');
