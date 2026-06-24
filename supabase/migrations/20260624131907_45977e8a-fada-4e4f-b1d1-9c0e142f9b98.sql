
-- 1. Public ETA history for /track timeline (no auth required)
CREATE OR REPLACE FUNCTION public.get_public_eta_history(_clinic_slug text, _token integer)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _clinic_id uuid;
  _patient_id uuid;
  _result jsonb := '[]'::jsonb;
  r RECORD;
  _what text; _why text; _impact text; _action text;
  _delta int;
BEGIN
  SELECT id INTO _clinic_id FROM public.clinics WHERE slug = _clinic_slug;
  IF _clinic_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT id INTO _patient_id FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND token_number = _token
    ORDER BY created_at DESC LIMIT 1;
  IF _patient_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  FOR r IN
    SELECT eta_before_minutes, eta_after_minutes, reason, created_at, event
    FROM public.queue_audit_log
    WHERE patient_id = _patient_id AND event = 'eta_recomputed'
      AND eta_before_minutes IS NOT NULL
    ORDER BY created_at DESC LIMIT 8
  LOOP
    _delta := COALESCE(r.eta_after_minutes,0) - COALESCE(r.eta_before_minutes,0);
    _what := format('ETA changed %sm → %sm', r.eta_before_minutes, r.eta_after_minutes);
    _why := CASE r.reason::text
      WHEN 'emergency' THEN 'Emergency case inserted ahead of you'
      WHEN 'faster_consultations' THEN 'Consultations are running faster than predicted'
      WHEN 'slower_consultations' THEN 'Consultations are running slower than predicted'
      ELSE 'Queue progressed normally'
    END;
    _impact := CASE WHEN _delta > 0 THEN format('+%s min added to your wait', _delta)
                    WHEN _delta < 0 THEN format('%s min earlier than before', _delta)
                    ELSE 'No material change' END;
    _action := CASE
      WHEN r.reason::text = 'emergency' THEN 'No action needed — we will notify you 15 min before your turn'
      WHEN _delta >= 10 THEN 'Consider leaving home a bit later — we''ll keep updating you'
      WHEN _delta <= -10 THEN 'Head over sooner if you can — your turn is coming up'
      ELSE 'Stay on track — predictions are holding'
    END;
    _result := _result || jsonb_build_object(
      'at', r.created_at,
      'eta_before', r.eta_before_minutes,
      'eta_after', r.eta_after_minutes,
      'delta', _delta,
      'reason', r.reason,
      'what', _what, 'why', _why, 'impact', _impact, 'action', _action,
      'severity', CASE WHEN ABS(_delta) >= 10 THEN 'high' WHEN ABS(_delta) >= 5 THEN 'moderate' ELSE 'mild' END
    );
  END LOOP;

  RETURN _result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_eta_history(text, integer) TO anon, authenticated;

-- 2. Demo health (System Impact widget)
CREATE OR REPLACE FUNCTION public.compute_demo_health(_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _acc jsonb;
  _waiting int; _overdue int;
  _samples int; _conf text;
  _events_per_min numeric;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN RETURN '{}'::jsonb; END IF;
  _acc := public.compute_prediction_accuracy(_clinic_id, 1);
  SELECT COUNT(*), COUNT(*) FILTER (WHERE current_eta_minutes IS NOT NULL AND current_eta_minutes < 0)
    INTO _waiting, _overdue
  FROM public.queue_patients WHERE clinic_id = _clinic_id AND status IN ('waiting','called');
  SELECT COALESCE(SUM(sample_count),0) INTO _samples FROM public.duration_stats WHERE clinic_id = _clinic_id;
  IF _samples >= 60 THEN _conf := 'High';
  ELSIF _samples >= 15 THEN _conf := 'Medium';
  ELSE _conf := 'Low'; END IF;
  SELECT COUNT(*)::numeric / 5.0 INTO _events_per_min
    FROM public.queue_audit_log WHERE clinic_id = _clinic_id AND created_at > now() - interval '5 minutes';
  RETURN jsonb_build_object(
    'eta_accuracy_pct', COALESCE((_acc->>'accuracy_pct')::int, 0),
    'eta_mae_minutes', COALESCE((_acc->>'mae_minutes')::numeric, 0),
    'confidence_label', _conf,
    'confidence_samples', _samples,
    'queue_active', _waiting,
    'queue_overdue', _overdue,
    'queue_health', CASE WHEN _overdue > 0 OR _waiting > 15 THEN 'Strained'
                         WHEN _waiting > 5 THEN 'Moderate' ELSE 'Good' END,
    'events_per_min', ROUND(_events_per_min, 1)
  );
END;
$$;

-- 3. Scenario seeding (judge demo)
CREATE OR REPLACE FUNCTION public.seed_scenario(_clinic_id uuid, _scenario text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _doctor uuid;
  _new_patient_id uuid;
  _tok int;
  _names text[] := ARRAY['Aarav Sharma','Priya Patel','Rohan Khan','Anaya Singh','Vikram Iyer','Sara Reddy','Ishaan Das','Meera Mehta'];
  _vts text[] := ARRAY['general','follow_up','prescription','lab_review','vaccination'];
  _baselines int[] := ARRAY[8,4,3,5,2];
  _i int; _vt text; _base int; _pid uuid;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO _doctor FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND role = 'doctor' LIMIT 1;

  IF _scenario = 'emergency' THEN
    _tok := public.generate_token(_clinic_id);
    INSERT INTO public.queue_patients (clinic_id, token_number, patient_name, age, visit_type, priority, predicted_duration_minutes, doctor_id)
    VALUES (_clinic_id, _tok, 'Emergency: Chest Pain', 58, 'emergency', 'emergency', 15, _doctor)
    RETURNING id INTO _new_patient_id;
    RETURN jsonb_build_object('ok', true, 'scenario', 'emergency', 'token', _tok, 'patient_id', _new_patient_id);

  ELSIF _scenario = 'doctor_delay' THEN
    -- Insert synthetic slow consultation events to push avg up
    FOR _i IN 1..5 LOOP
      INSERT INTO public.consultation_events (clinic_id, doctor_id, visit_type, started_at, completed_at, duration_seconds)
      VALUES (_clinic_id, _doctor, 'general',
        now() - interval '1 hour', now() - interval '40 minutes', 20 * 60 + (random()*300)::int);
    END LOOP;
    PERFORM public.recompute_clinic_etas(_clinic_id, 'slower_consultations');
    RETURN jsonb_build_object('ok', true, 'scenario', 'doctor_delay');

  ELSIF _scenario = 'rush_hour' THEN
    FOR _i IN 1..5 LOOP
      _vt := _vts[1 + (_i % 5)];
      _base := _baselines[1 + (_i % 5)];
      _tok := public.generate_token(_clinic_id);
      INSERT INTO public.queue_patients (clinic_id, token_number, patient_name, age, visit_type, priority, predicted_duration_minutes)
      VALUES (_clinic_id, _tok, _names[1+(_i % 8)], 25+_i*3, _vt::visit_type, 'normal', _base);
    END LOOP;
    RETURN jsonb_build_object('ok', true, 'scenario', 'rush_hour', 'added', 5);

  ELSIF _scenario = 'normal' THEN
    -- Top up to 6 waiting if low
    DECLARE _c int;
    BEGIN
      SELECT COUNT(*) INTO _c FROM public.queue_patients
        WHERE clinic_id = _clinic_id AND status IN ('waiting','called');
      WHILE _c < 6 LOOP
        _i := 1 + (random() * 4.999)::int;
        _vt := _vts[_i]; _base := _baselines[_i];
        _tok := public.generate_token(_clinic_id);
        INSERT INTO public.queue_patients (clinic_id, token_number, patient_name, age, visit_type, priority, predicted_duration_minutes)
        VALUES (_clinic_id, _tok, _names[1+((random()*7.999)::int)], 22+(random()*45)::int, _vt::visit_type, 'normal', _base);
        _c := _c + 1;
      END LOOP;
    END;
    -- Back-fill consultation history to lift confidence
    FOR _i IN 1..5 LOOP
      _vt := _vts[_i]; _base := _baselines[_i];
      INSERT INTO public.consultation_events (clinic_id, doctor_id, visit_type, started_at, completed_at, duration_seconds)
      SELECT _clinic_id, _doctor, _vt::visit_type,
             now() - ((g || ' hours')::interval),
             now() - ((g || ' hours')::interval) + ((_base*60 + (random()*120 - 60)::int) || ' seconds')::interval,
             _base*60 + (random()*120 - 60)::int
      FROM generate_series(1, 22) g
      WHERE NOT EXISTS (
        SELECT 1 FROM public.duration_stats
        WHERE clinic_id = _clinic_id AND visit_type = _vt::visit_type AND sample_count >= 20
      );
    END LOOP;
    PERFORM public.recompute_clinic_etas(_clinic_id, 'normal_progress');
    RETURN jsonb_build_object('ok', true, 'scenario', 'normal');
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'unknown scenario');
END;
$$;

-- 4. Reset demo data
CREATE OR REPLACE FUNCTION public.reset_demo_data(_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.queue_audit_log WHERE clinic_id = _clinic_id;
  DELETE FROM public.consultation_events WHERE clinic_id = _clinic_id;
  DELETE FROM public.queue_patients WHERE clinic_id = _clinic_id;
  DELETE FROM public.duration_stats WHERE clinic_id = _clinic_id;
  DELETE FROM public.token_counters WHERE clinic_id = _clinic_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 5. Extend efficiency score with what/why/impact/action + estimated_lift_points
CREATE OR REPLACE FUNCTION public.compute_efficiency_score(_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _avg_wait_minutes DOUBLE PRECISION;
  _wait_score INT; _accuracy_pct INT; _accuracy_score INT;
  _clearance_minutes INT; _clearance_score INT;
  _utilization_pct INT; _utilization_score INT;
  _busy_seconds DOUBLE PRECISION; _window_seconds DOUBLE PRECISION;
  _active_doctors INT; _total INT; _within_5 INT;
  _final_score INT; _grade TEXT;
  _biggest_lever TEXT; _min_score INT;
  _lift INT;
  _what TEXT; _why TEXT; _impact TEXT; _action TEXT;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN RETURN '{}'::jsonb; END IF;

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (called_at - created_at))/60.0), 0)
    INTO _avg_wait_minutes
  FROM public.queue_patients WHERE clinic_id = _clinic_id AND called_at IS NOT NULL
    AND created_at >= (now() AT TIME ZONE 'UTC')::date;
  _wait_score := GREATEST(0, LEAST(100, ROUND(100 - (_avg_wait_minutes - 15) * (100.0/15.0))::INT));
  IF _avg_wait_minutes <= 15 THEN _wait_score := 100; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE ABS(qp.predicted_duration_minutes - CEIL(ce.duration_seconds/60.0)) <= 5)
    INTO _total, _within_5
  FROM public.queue_patients qp
  JOIN public.consultation_events ce ON ce.patient_id = qp.id
  WHERE qp.clinic_id = _clinic_id AND ce.created_at > now() - interval '7 days';
  IF _total > 0 THEN _accuracy_pct := ROUND(100.0 * _within_5 / _total)::INT;
  ELSE _accuracy_pct := 70; END IF;
  _accuracy_score := _accuracy_pct;

  SELECT (compute_queue_health(_clinic_id)->>'clearance_minutes')::INT INTO _clearance_minutes;
  IF _clearance_minutes <= 30 THEN _clearance_score := 100;
  ELSIF _clearance_minutes >= 120 THEN _clearance_score := 0;
  ELSE _clearance_score := ROUND(100 - ((_clearance_minutes - 30) * 100.0 / 90))::INT; END IF;

  SELECT COALESCE(SUM(duration_seconds), 0) INTO _busy_seconds
  FROM public.consultation_events WHERE clinic_id = _clinic_id
    AND created_at >= (now() AT TIME ZONE 'UTC')::date;
  SELECT GREATEST(1, COUNT(DISTINCT doctor_id)) INTO _active_doctors
  FROM public.consultation_events WHERE clinic_id = _clinic_id
    AND created_at >= (now() AT TIME ZONE 'UTC')::date;
  _window_seconds := EXTRACT(EPOCH FROM (now() - GREATEST(
    date_trunc('day', now()) + interval '9 hours', now() - interval '8 hours'
  )));
  IF _window_seconds <= 0 THEN _window_seconds := 1; END IF;
  _utilization_pct := LEAST(100, ROUND(100.0 * _busy_seconds / (_active_doctors * _window_seconds))::INT);
  IF _utilization_pct BETWEEN 60 AND 85 THEN _utilization_score := 100;
  ELSIF _utilization_pct < 60 THEN _utilization_score := ROUND(_utilization_pct * 100.0/60)::INT;
  ELSE _utilization_score := GREATEST(0, ROUND(100 - (_utilization_pct - 85) * 100.0/15)::INT); END IF;

  _final_score := ROUND(_wait_score*0.30 + _accuracy_score*0.25 + _clearance_score*0.20 + _utilization_score*0.25)::INT;
  _grade := CASE WHEN _final_score>=90 THEN 'A' WHEN _final_score>=80 THEN 'B' WHEN _final_score>=70 THEN 'C' ELSE 'D' END;
  _min_score := LEAST(_wait_score, _accuracy_score, _clearance_score, _utilization_score);
  IF _min_score = _wait_score THEN
    _biggest_lever := 'Reduce average wait time';
    _why := format('Average wait today is %s min (target ≤15 min)', ROUND(_avg_wait_minutes,1));
    _action := 'Add capacity during peak intake or reduce intake handoff time';
  ELSIF _min_score = _accuracy_score THEN
    _biggest_lever := 'Improve prediction accuracy';
    _why := format('Only %s%% of consults finished within ±5 min of prediction', _accuracy_pct);
    _action := 'Calibrate low-sample visit types — keep recording consultation events';
  ELSIF _min_score = _clearance_score THEN
    _biggest_lever := 'Speed up queue clearance';
    _why := format('Queue clears in %s min — target ≤30 min', _clearance_minutes);
    _action := 'Bring on an extra doctor or batch follow-ups together';
  ELSE
    _biggest_lever := 'Optimize doctor utilization';
    _why := format('Doctor utilization is %s%% — sweet spot is 60–85%%', _utilization_pct);
    _action := CASE WHEN _utilization_pct < 60 THEN 'Increase intake — doctor has spare capacity'
                    ELSE 'Reduce load — doctors are over-utilized and burning out' END;
  END IF;
  _lift := GREATEST(0, ROUND((100 - _min_score) *
    CASE
      WHEN _min_score = _wait_score THEN 0.30
      WHEN _min_score = _accuracy_score THEN 0.25
      WHEN _min_score = _clearance_score THEN 0.20
      ELSE 0.25 END)::INT);
  _what := format('Efficiency score %s (grade %s)', _final_score, _grade);
  _impact := format('Fixing %s could lift score by ~%s points',
    lower(_biggest_lever), _lift);

  RETURN jsonb_build_object(
    'score', _final_score, 'grade', _grade,
    'sub_scores', jsonb_build_object(
      'avg_wait', jsonb_build_object('score', _wait_score, 'value_minutes', ROUND(_avg_wait_minutes, 1), 'weight', 30),
      'prediction_accuracy', jsonb_build_object('score', _accuracy_score, 'value_pct', _accuracy_pct, 'weight', 25),
      'clearance_speed', jsonb_build_object('score', _clearance_score, 'value_minutes', _clearance_minutes, 'weight', 20),
      'doctor_utilization', jsonb_build_object('score', _utilization_score, 'value_pct', _utilization_pct, 'weight', 25)
    ),
    'biggest_lever', _biggest_lever,
    'estimated_lift_points', _lift,
    'what', _what, 'why', _why, 'impact', _impact, 'action', _action
  );
END;
$$;
