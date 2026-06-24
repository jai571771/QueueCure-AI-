
-- =========================================================
-- Phase 2 Intelligence Functions (read-only, no schema changes)
-- =========================================================

-- ---------- BOTTLENECK DETECTION ----------
CREATE OR REPLACE FUNCTION public.compute_bottlenecks(_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row RECORD;
  _result jsonb := '[]'::jsonb;
  _baseline INT;
  _today_avg DOUBLE PRECISION;
  _today_n INT;
  _last7_avg DOUBLE PRECISION;
  _severity TEXT;
  _deviation DOUBLE PRECISION;
  _impact_minutes INT;
  _trend TEXT;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR _row IN
    SELECT unnest(enum_range(NULL::visit_type)) AS vt
  LOOP
    _baseline := public.baseline_seconds(_row.vt);

    SELECT AVG(duration_seconds), COUNT(*) INTO _today_avg, _today_n
    FROM public.consultation_events
    WHERE clinic_id = _clinic_id AND visit_type = _row.vt
      AND created_at >= (now() AT TIME ZONE 'UTC')::date;

    SELECT AVG(duration_seconds) INTO _last7_avg
    FROM public.consultation_events
    WHERE clinic_id = _clinic_id AND visit_type = _row.vt
      AND created_at >= now() - interval '7 days'
      AND created_at < (now() AT TIME ZONE 'UTC')::date;

    IF _today_n IS NULL OR _today_n < 1 THEN CONTINUE; END IF;

    _deviation := (_today_avg - _baseline) / NULLIF(_baseline, 0);
    _impact_minutes := GREATEST(0, CEIL(((_today_avg - _baseline) * _today_n) / 60.0))::INT;

    IF _deviation >= 0.50 THEN _severity := 'severe';
    ELSIF _deviation >= 0.25 THEN _severity := 'moderate';
    ELSIF _deviation >= 0.10 THEN _severity := 'mild';
    ELSE CONTINUE;
    END IF;

    IF _last7_avg IS NULL THEN _trend := 'flat';
    ELSIF _today_avg > _last7_avg * 1.10 THEN _trend := 'up';
    ELSIF _today_avg < _last7_avg * 0.90 THEN _trend := 'down';
    ELSE _trend := 'flat';
    END IF;

    _result := _result || jsonb_build_object(
      'visit_type', _row.vt,
      'severity', _severity,
      'baseline_seconds', _baseline,
      'today_avg_seconds', ROUND(_today_avg)::INT,
      'today_samples', _today_n,
      'deviation_pct', ROUND(_deviation * 100)::INT,
      'impact_minutes', _impact_minutes,
      'trend', _trend,
      'explanation', format('%s averaging %sm vs %sm baseline — adds ~%s min to queue today',
        initcap(replace(_row.vt::text, '_', ' ')),
        ROUND(_today_avg/60.0, 1), ROUND(_baseline/60.0, 1), _impact_minutes)
    );
  END LOOP;

  RETURN _result;
END;
$$;

-- ---------- OPERATIONAL RECOMMENDATIONS ----------
CREATE OR REPLACE FUNCTION public.compute_recommendations(_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result jsonb := '[]'::jsonb;
  _risk jsonb;
  _health jsonb;
  _follow_up_count INT;
  _waiting INT;
  _emergencies_2h INT;
  _idle_doctor_seconds INT;
  _low_conf_count INT;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  _risk := public.compute_queue_risk(_clinic_id);
  _health := public.compute_queue_health(_clinic_id);

  -- Rule 1: Peak hour staffing
  IF (_risk->>'level') = 'high' AND (_risk->>'arrival_rate_per_hour')::INT > (_risk->>'service_rate_per_hour')::INT THEN
    _result := _result || jsonb_build_object(
      'id', 'add_doctor',
      'severity', 'high',
      'title', 'Add a doctor during peak hours',
      'rationale', format('Arrival rate %s/hr exceeds service capacity %s/hr', _risk->>'arrival_rate_per_hour', _risk->>'service_rate_per_hour'),
      'metric', _risk
    );
  END IF;

  -- Rule 2: Emergency slot reservation
  SELECT COUNT(*) INTO _emergencies_2h FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND priority = 'emergency' AND created_at > now() - interval '2 hours';
  IF _emergencies_2h >= 2 THEN
    _result := _result || jsonb_build_object(
      'id', 'reserve_emergency_slot',
      'severity', 'moderate',
      'title', 'Reserve a dedicated emergency consultation slot',
      'rationale', format('%s emergencies in the last 2 hours — consider keeping a doctor on standby', _emergencies_2h),
      'metric', jsonb_build_object('emergencies_2h', _emergencies_2h)
    );
  END IF;

  -- Rule 3: Follow-up clustering
  SELECT COUNT(*) FILTER (WHERE visit_type = 'follow_up'), COUNT(*) INTO _follow_up_count, _waiting
    FROM public.queue_patients WHERE clinic_id = _clinic_id AND status IN ('waiting','called');
  IF _waiting >= 5 AND _follow_up_count::DOUBLE PRECISION / _waiting > 0.40 THEN
    _result := _result || jsonb_build_object(
      'id', 'batch_followups',
      'severity', 'mild',
      'title', 'Batch follow-ups into a dedicated window',
      'rationale', format('%s of %s waiting are follow-ups — batching reduces context switching', _follow_up_count, _waiting),
      'metric', jsonb_build_object('follow_up', _follow_up_count, 'waiting', _waiting)
    );
  END IF;

  -- Rule 4: Idle doctor with backlog
  IF (_health->>'waiting')::INT > 5 AND (_health->>'active_doctors')::INT = 1 THEN
    SELECT EXTRACT(EPOCH FROM (now() - MAX(completed_at)))::INT INTO _idle_doctor_seconds
      FROM public.queue_patients WHERE clinic_id = _clinic_id AND status = 'completed';
    IF _idle_doctor_seconds IS NOT NULL AND _idle_doctor_seconds > 900 THEN
      _result := _result || jsonb_build_object(
        'id', 'doctor_idle',
        'severity', 'moderate',
        'title', 'Reassign idle capacity to the queue',
        'rationale', format('Last consultation completed %s min ago while %s patients wait',
          CEIL(_idle_doctor_seconds/60.0), _health->>'waiting'),
        'metric', jsonb_build_object('idle_seconds', _idle_doctor_seconds, 'waiting', _health->>'waiting')
      );
    END IF;
  END IF;

  -- Rule 5: Confidence gap
  SELECT COUNT(*) INTO _low_conf_count FROM public.duration_stats
    WHERE clinic_id = _clinic_id AND sample_count < 5;
  IF _low_conf_count > 0 THEN
    _result := _result || jsonb_build_object(
      'id', 'calibrate_predictions',
      'severity', 'mild',
      'title', 'Calibrate predictions for low-sample visit types',
      'rationale', format('%s visit types have fewer than 5 completed consultations', _low_conf_count),
      'metric', jsonb_build_object('low_confidence_types', _low_conf_count)
    );
  END IF;

  RETURN _result;
END;
$$;

-- ---------- PREDICTION PERFORMANCE ----------
CREATE OR REPLACE FUNCTION public.compute_prediction_accuracy(_clinic_id uuid, _days INT DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _within_5 INT := 0;
  _total INT := 0;
  _mae DOUBLE PRECISION := 0;
  _bias DOUBLE PRECISION := 0;
  _weekly jsonb := '[]'::jsonb;
  _per_type jsonb := '[]'::jsonb;
  _conf jsonb;
  _row RECORD;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RETURN '{}'::jsonb;
  END IF;

  WITH pairs AS (
    SELECT qp.id, qp.visit_type, qp.predicted_duration_minutes,
           CEIL(ce.duration_seconds/60.0)::INT AS actual_minutes
    FROM public.queue_patients qp
    JOIN public.consultation_events ce ON ce.patient_id = qp.id
    WHERE qp.clinic_id = _clinic_id
      AND ce.created_at > now() - (_days || ' days')::interval
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ABS(predicted_duration_minutes - actual_minutes) <= 5),
    COALESCE(AVG(ABS(predicted_duration_minutes - actual_minutes)), 0),
    COALESCE(AVG(predicted_duration_minutes - actual_minutes), 0)
  INTO _total, _within_5, _mae, _bias FROM pairs;

  -- Weekly trend (last 8 weeks)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'week_start', week_start, 'accuracy_pct', accuracy_pct, 'samples', samples
  ) ORDER BY week_start), '[]'::jsonb) INTO _weekly
  FROM (
    SELECT date_trunc('week', ce.created_at)::date AS week_start,
           COUNT(*) AS samples,
           ROUND(100.0 * COUNT(*) FILTER (WHERE ABS(qp.predicted_duration_minutes - CEIL(ce.duration_seconds/60.0)) <= 5) / NULLIF(COUNT(*), 0))::INT AS accuracy_pct
    FROM public.queue_patients qp
    JOIN public.consultation_events ce ON ce.patient_id = qp.id
    WHERE qp.clinic_id = _clinic_id
      AND ce.created_at > now() - interval '8 weeks'
    GROUP BY 1
  ) w;

  -- Per visit type
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'visit_type', visit_type, 'samples', samples, 'accuracy_pct', accuracy_pct, 'mae_minutes', mae_minutes
  )), '[]'::jsonb) INTO _per_type
  FROM (
    SELECT qp.visit_type::text,
           COUNT(*) AS samples,
           ROUND(100.0 * COUNT(*) FILTER (WHERE ABS(qp.predicted_duration_minutes - CEIL(ce.duration_seconds/60.0)) <= 5) / NULLIF(COUNT(*), 0))::INT AS accuracy_pct,
           ROUND(AVG(ABS(qp.predicted_duration_minutes - CEIL(ce.duration_seconds/60.0))))::INT AS mae_minutes
    FROM public.queue_patients qp
    JOIN public.consultation_events ce ON ce.patient_id = qp.id
    WHERE qp.clinic_id = _clinic_id
      AND ce.created_at > now() - (_days || ' days')::interval
    GROUP BY qp.visit_type
  ) pt;

  -- Confidence distribution
  SELECT jsonb_build_object(
    'high', COALESCE(SUM(CASE WHEN sample_count >= 20 THEN 1 ELSE 0 END), 0),
    'medium', COALESCE(SUM(CASE WHEN sample_count BETWEEN 5 AND 19 THEN 1 ELSE 0 END), 0),
    'low', COALESCE(SUM(CASE WHEN sample_count < 5 THEN 1 ELSE 0 END), 0)
  ) INTO _conf FROM public.duration_stats WHERE clinic_id = _clinic_id;

  RETURN jsonb_build_object(
    'samples', _total,
    'accuracy_pct', CASE WHEN _total > 0 THEN ROUND(100.0 * _within_5 / _total)::INT ELSE NULL END,
    'mae_minutes', ROUND(_mae, 1),
    'bias_minutes', ROUND(_bias, 1),
    'weekly', _weekly,
    'per_visit_type', _per_type,
    'confidence_distribution', _conf
  );
END;
$$;

-- ---------- EXTENDED FORECASTING ----------
CREATE OR REPLACE FUNCTION public.compute_forecast(_clinic_id uuid, _horizon TEXT DEFAULT 'next_2h')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _slots jsonb := '[]'::jsonb;
  _slot_minutes INT;
  _num_slots INT;
  _start TIMESTAMPTZ;
  _waiting INT;
  _avg_service_minutes DOUBLE PRECISION;
  _active_doctors INT;
  _service_per_slot DOUBLE PRECISION;
  _row RECORD;
  _expected_waiting DOUBLE PRECISION;
  _arrivals_recent INT;
  _arrival_per_min DOUBLE PRECISION;
  _slot_arrivals DOUBLE PRECISION;
  _i INT;
  _slot_start TIMESTAMPTZ;
  _slot_end TIMESTAMPTZ;
  _hist_avg DOUBLE PRECISION;
  _confidence TEXT;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RETURN '{}'::jsonb;
  END IF;

  IF _horizon = 'next_2h' THEN _slot_minutes := 15; _num_slots := 8;
  ELSIF _horizon = 'rest_of_day' THEN _slot_minutes := 60; _num_slots := GREATEST(1, 21 - EXTRACT(HOUR FROM now())::INT);
  ELSIF _horizon = 'tomorrow' THEN _slot_minutes := 60; _num_slots := 12;
  ELSE _slot_minutes := 15; _num_slots := 8;
  END IF;

  IF _horizon = 'tomorrow' THEN
    _start := date_trunc('day', now() + interval '1 day') + interval '9 hours';
  ELSE
    _start := date_trunc('minute', now());
  END IF;

  SELECT COUNT(*) INTO _waiting FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status IN ('waiting','called');

  SELECT COALESCE(AVG(ewma_seconds)/60.0, 8) INTO _avg_service_minutes
    FROM public.duration_stats WHERE clinic_id = _clinic_id;

  SELECT GREATEST(1, COUNT(DISTINCT doctor_id)) INTO _active_doctors
    FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status = 'in_progress' AND doctor_id IS NOT NULL;
  IF _active_doctors IS NULL OR _active_doctors = 0 THEN _active_doctors := 1; END IF;

  _service_per_slot := (_slot_minutes / GREATEST(1, _avg_service_minutes)) * _active_doctors;

  -- Recent arrivals per minute (last 30 min)
  SELECT COUNT(*) INTO _arrivals_recent FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND created_at > now() - interval '30 minutes';
  _arrival_per_min := _arrivals_recent / 30.0;

  _expected_waiting := _waiting;

  FOR _i IN 0.._num_slots - 1 LOOP
    _slot_start := _start + (_i * _slot_minutes || ' minutes')::interval;
    _slot_end := _slot_start + (_slot_minutes || ' minutes')::interval;

    IF _horizon IN ('tomorrow', 'rest_of_day') THEN
      -- Historical: same DOW + hour, last 4 weeks
      SELECT COALESCE(AVG(c), 0) INTO _hist_avg FROM (
        SELECT COUNT(*) AS c FROM public.queue_audit_log
        WHERE clinic_id = _clinic_id AND event = 'patient_added'
          AND created_at > now() - interval '4 weeks'
          AND EXTRACT(DOW FROM created_at) = EXTRACT(DOW FROM _slot_start)
          AND EXTRACT(HOUR FROM created_at) = EXTRACT(HOUR FROM _slot_start)
        GROUP BY date_trunc('day', created_at)
      ) sub;
      _slot_arrivals := _hist_avg;
      _confidence := CASE WHEN _hist_avg > 0 THEN 'medium' ELSE 'low' END;
    ELSE
      _slot_arrivals := _arrival_per_min * _slot_minutes;
      _confidence := CASE WHEN _arrivals_recent >= 5 THEN 'high' WHEN _arrivals_recent >= 2 THEN 'medium' ELSE 'low' END;
    END IF;

    _expected_waiting := GREATEST(0, _expected_waiting + _slot_arrivals - _service_per_slot);

    _slots := _slots || jsonb_build_object(
      'slot_start', _slot_start,
      'slot_end', _slot_end,
      'expected_arrivals', ROUND(_slot_arrivals, 1),
      'expected_waiting', ROUND(_expected_waiting)::INT,
      'expected_clearance_minutes', CEIL(_expected_waiting * _avg_service_minutes / GREATEST(1, _active_doctors))::INT,
      'confidence', _confidence
    );
  END LOOP;

  RETURN jsonb_build_object(
    'horizon', _horizon,
    'slot_minutes', _slot_minutes,
    'slots', _slots,
    'baseline', jsonb_build_object(
      'waiting_now', _waiting,
      'avg_service_minutes', ROUND(_avg_service_minutes, 1),
      'active_doctors', _active_doctors,
      'arrival_per_min_recent', ROUND(_arrival_per_min, 2)
    ),
    'staffing_window', CASE
      WHEN _horizon = 'next_2h' AND _arrival_per_min * 60 > _service_per_slot * (60.0/_slot_minutes)
        THEN 'Consider adding capacity in the next hour'
      ELSE NULL
    END
  );
END;
$$;

-- ---------- ARRIVAL INTELLIGENCE (patient-facing) ----------
CREATE OR REPLACE FUNCTION public.compute_arrival_intel(_clinic_id uuid, _patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _p public.queue_patients%ROWTYPE;
  _eta INT;
  _crowd TEXT;
  _crowd_label TEXT;
  _expected_at_arrival INT;
  _waiting INT;
  _avg_service_minutes DOUBLE PRECISION;
  _arrivals_recent INT;
  _arrival_per_min DOUBLE PRECISION;
  _service_per_min DOUBLE PRECISION;
  _active_doctors INT;
  _minutes_until_arrival INT;
BEGIN
  SELECT * INTO _p FROM public.queue_patients WHERE id = _patient_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  _eta := COALESCE(_p.current_eta_minutes, 0);

  SELECT COUNT(*) INTO _waiting FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND status IN ('waiting','called');

  IF _waiting <= 5 THEN _crowd := 'low'; _crowd_label := 'Low Wait';
  ELSIF _waiting <= 15 THEN _crowd := 'moderate'; _crowd_label := 'Moderate Wait';
  ELSE _crowd := 'high'; _crowd_label := 'High Traffic';
  END IF;

  SELECT COALESCE(AVG(ewma_seconds)/60.0, 8) INTO _avg_service_minutes
    FROM public.duration_stats WHERE clinic_id = _clinic_id;

  SELECT GREATEST(1, COUNT(DISTINCT doctor_id)) INTO _active_doctors
    FROM public.queue_patients WHERE clinic_id = _clinic_id AND status = 'in_progress' AND doctor_id IS NOT NULL;
  IF _active_doctors IS NULL OR _active_doctors = 0 THEN _active_doctors := 1; END IF;

  SELECT COUNT(*) INTO _arrivals_recent FROM public.queue_patients
    WHERE clinic_id = _clinic_id AND created_at > now() - interval '30 minutes';
  _arrival_per_min := _arrivals_recent / 30.0;
  _service_per_min := _active_doctors / GREATEST(1, _avg_service_minutes);

  -- Expected queue length when patient arrives (at recommended_arrival_at = now + eta - 10)
  _minutes_until_arrival := GREATEST(0, _eta - 10);
  _expected_at_arrival := GREATEST(0,
    _waiting + ROUND(_arrival_per_min * _minutes_until_arrival - _service_per_min * _minutes_until_arrival)::INT
  );

  RETURN jsonb_build_object(
    'crowd_level', _crowd,
    'crowd_label', _crowd_label,
    'waiting_now', _waiting,
    'recommended_arrival_at', GREATEST(now(), now() + (_minutes_until_arrival || ' minutes')::interval),
    'minutes_until_recommended_arrival', _minutes_until_arrival,
    'expected_queue_length_at_arrival', _expected_at_arrival,
    'avg_service_minutes', ROUND(_avg_service_minutes, 1)
  );
END;
$$;

-- ---------- CLINIC EFFICIENCY SCORE ----------
CREATE OR REPLACE FUNCTION public.compute_efficiency_score(_clinic_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _avg_wait_minutes DOUBLE PRECISION;
  _wait_score INT;
  _accuracy_pct INT;
  _accuracy_score INT;
  _clearance_minutes INT;
  _clearance_score INT;
  _utilization_pct INT;
  _utilization_score INT;
  _busy_seconds DOUBLE PRECISION;
  _window_seconds DOUBLE PRECISION;
  _active_doctors INT;
  _total INT;
  _within_5 INT;
  _final_score INT;
  _grade TEXT;
  _biggest_lever TEXT;
  _min_score INT;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Avg wait: created_at -> called_at, today
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (called_at - created_at))/60.0), 0)
    INTO _avg_wait_minutes
  FROM public.queue_patients
  WHERE clinic_id = _clinic_id AND called_at IS NOT NULL
    AND created_at >= (now() AT TIME ZONE 'UTC')::date;
  -- Target: 15 min. 0min=100, 30min=0.
  _wait_score := GREATEST(0, LEAST(100, ROUND(100 - (_avg_wait_minutes - 15) * (100.0/15.0))::INT));
  IF _avg_wait_minutes <= 15 THEN _wait_score := 100; END IF;

  -- Accuracy
  SELECT COUNT(*), COUNT(*) FILTER (WHERE ABS(qp.predicted_duration_minutes - CEIL(ce.duration_seconds/60.0)) <= 5)
    INTO _total, _within_5
  FROM public.queue_patients qp
  JOIN public.consultation_events ce ON ce.patient_id = qp.id
  WHERE qp.clinic_id = _clinic_id AND ce.created_at > now() - interval '7 days';
  IF _total > 0 THEN
    _accuracy_pct := ROUND(100.0 * _within_5 / _total)::INT;
  ELSE _accuracy_pct := 70;
  END IF;
  _accuracy_score := _accuracy_pct;

  -- Clearance speed: ideal ≤ 30 min current clearance
  SELECT (compute_queue_health(_clinic_id)->>'clearance_minutes')::INT INTO _clearance_minutes;
  IF _clearance_minutes <= 30 THEN _clearance_score := 100;
  ELSIF _clearance_minutes >= 120 THEN _clearance_score := 0;
  ELSE _clearance_score := ROUND(100 - ((_clearance_minutes - 30) * 100.0 / 90))::INT;
  END IF;

  -- Doctor utilization: today's consultation seconds / (active_doctors * elapsed_workday)
  SELECT COALESCE(SUM(duration_seconds), 0) INTO _busy_seconds
  FROM public.consultation_events
  WHERE clinic_id = _clinic_id AND created_at >= (now() AT TIME ZONE 'UTC')::date;

  SELECT GREATEST(1, COUNT(DISTINCT doctor_id)) INTO _active_doctors
  FROM public.consultation_events
  WHERE clinic_id = _clinic_id AND created_at >= (now() AT TIME ZONE 'UTC')::date;

  _window_seconds := EXTRACT(EPOCH FROM (now() - GREATEST(
    date_trunc('day', now()) + interval '9 hours', now() - interval '8 hours'
  )));
  IF _window_seconds <= 0 THEN _window_seconds := 1; END IF;
  _utilization_pct := LEAST(100, ROUND(100.0 * _busy_seconds / (_active_doctors * _window_seconds))::INT);
  -- Sweet spot 60-85%
  IF _utilization_pct BETWEEN 60 AND 85 THEN _utilization_score := 100;
  ELSIF _utilization_pct < 60 THEN _utilization_score := ROUND(_utilization_pct * 100.0/60)::INT;
  ELSE _utilization_score := GREATEST(0, ROUND(100 - (_utilization_pct - 85) * 100.0/15)::INT);
  END IF;

  _final_score := ROUND(
    _wait_score * 0.30 + _accuracy_score * 0.25 + _clearance_score * 0.20 + _utilization_score * 0.25
  )::INT;

  IF _final_score >= 90 THEN _grade := 'A';
  ELSIF _final_score >= 80 THEN _grade := 'B';
  ELSIF _final_score >= 70 THEN _grade := 'C';
  ELSE _grade := 'D';
  END IF;

  _min_score := LEAST(_wait_score, _accuracy_score, _clearance_score, _utilization_score);
  IF _min_score = _wait_score THEN _biggest_lever := 'Reduce average wait time';
  ELSIF _min_score = _accuracy_score THEN _biggest_lever := 'Improve prediction accuracy';
  ELSIF _min_score = _clearance_score THEN _biggest_lever := 'Speed up queue clearance';
  ELSE _biggest_lever := 'Optimize doctor utilization';
  END IF;

  RETURN jsonb_build_object(
    'score', _final_score,
    'grade', _grade,
    'sub_scores', jsonb_build_object(
      'avg_wait', jsonb_build_object('score', _wait_score, 'value_minutes', ROUND(_avg_wait_minutes, 1), 'weight', 30),
      'prediction_accuracy', jsonb_build_object('score', _accuracy_score, 'value_pct', _accuracy_pct, 'weight', 25),
      'clearance_speed', jsonb_build_object('score', _clearance_score, 'value_minutes', _clearance_minutes, 'weight', 20),
      'doctor_utilization', jsonb_build_object('score', _utilization_score, 'value_pct', _utilization_pct, 'weight', 25)
    ),
    'biggest_lever', _biggest_lever
  );
END;
$$;

-- ---------- DOCTOR PRODUCTIVITY ----------
CREATE OR REPLACE FUNCTION public.compute_doctor_productivity(_clinic_id uuid, _doctor_id uuid, _days INT DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _seen INT;
  _avg_seconds DOUBLE PRECISION;
  _median_seconds DOUBLE PRECISION;
  _on_time_pct INT;
  _active_minutes INT;
  _idle_minutes INT;
  _per_hour jsonb;
  _per_type jsonb;
  _accuracy jsonb;
BEGIN
  IF NOT public.has_clinic_access(auth.uid(), _clinic_id) THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COUNT(*), COALESCE(AVG(duration_seconds), 0),
         COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds), 0)
    INTO _seen, _avg_seconds, _median_seconds
  FROM public.consultation_events
  WHERE clinic_id = _clinic_id AND doctor_id = _doctor_id
    AND created_at > now() - (_days || ' days')::interval;

  SELECT CASE WHEN COUNT(*) > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE ABS(qp.predicted_duration_minutes - CEIL(ce.duration_seconds/60.0)) <= 5) / COUNT(*))::INT
    ELSE 0 END
  INTO _on_time_pct
  FROM public.consultation_events ce
  JOIN public.queue_patients qp ON qp.id = ce.patient_id
  WHERE ce.clinic_id = _clinic_id AND ce.doctor_id = _doctor_id
    AND ce.created_at > now() - (_days || ' days')::interval;

  _active_minutes := COALESCE(ROUND(_avg_seconds * _seen / 60.0), 0)::INT;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'hour', hr, 'count', cnt
  ) ORDER BY hr), '[]'::jsonb) INTO _per_hour
  FROM (
    SELECT EXTRACT(HOUR FROM created_at)::INT AS hr, COUNT(*) AS cnt
    FROM public.consultation_events
    WHERE clinic_id = _clinic_id AND doctor_id = _doctor_id
      AND created_at > now() - (_days || ' days')::interval
    GROUP BY 1
  ) h;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'visit_type', vt, 'count', cnt, 'avg_seconds', avg_s
  )), '[]'::jsonb) INTO _per_type
  FROM (
    SELECT visit_type::text AS vt, COUNT(*) AS cnt, ROUND(AVG(duration_seconds))::INT AS avg_s
    FROM public.consultation_events
    WHERE clinic_id = _clinic_id AND doctor_id = _doctor_id
      AND created_at > now() - (_days || ' days')::interval
    GROUP BY visit_type
  ) t;

  RETURN jsonb_build_object(
    'patients_seen', _seen,
    'avg_minutes', ROUND(_avg_seconds/60.0, 1),
    'median_minutes', ROUND(_median_seconds/60.0, 1),
    'on_time_pct', _on_time_pct,
    'active_minutes', _active_minutes,
    'per_hour', _per_hour,
    'per_visit_type', _per_type
  );
END;
$$;

-- ---------- Extend public tracking with arrival intel ----------
CREATE OR REPLACE FUNCTION public.get_public_tracking(_clinic_slug text, _token integer)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
  _arrival JSONB;
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
        (CASE priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END, created_at)
        <
        (CASE _p.priority WHEN 'emergency' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END, _p.created_at)
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

  -- Arrival intel inlined (compute_arrival_intel does not require has_clinic_access)
  DECLARE
    _waiting INT; _avg_min DOUBLE PRECISION; _arr_recent INT; _arr_pm DOUBLE PRECISION;
    _sv_pm DOUBLE PRECISION; _active INT; _mins_until INT; _expected INT; _crowd TEXT; _crowd_label TEXT;
  BEGIN
    SELECT COUNT(*) INTO _waiting FROM public.queue_patients
      WHERE clinic_id = _clinic.id AND status IN ('waiting','called');
    IF _waiting <= 5 THEN _crowd := 'low'; _crowd_label := 'Low Wait';
    ELSIF _waiting <= 15 THEN _crowd := 'moderate'; _crowd_label := 'Moderate Wait';
    ELSE _crowd := 'high'; _crowd_label := 'High Traffic';
    END IF;
    SELECT COALESCE(AVG(ewma_seconds)/60.0, 8) INTO _avg_min
      FROM public.duration_stats WHERE clinic_id = _clinic.id;
    SELECT GREATEST(1, COUNT(DISTINCT doctor_id)) INTO _active FROM public.queue_patients
      WHERE clinic_id = _clinic.id AND status = 'in_progress' AND doctor_id IS NOT NULL;
    IF _active IS NULL OR _active = 0 THEN _active := 1; END IF;
    SELECT COUNT(*) INTO _arr_recent FROM public.queue_patients
      WHERE clinic_id = _clinic.id AND created_at > now() - interval '30 minutes';
    _arr_pm := _arr_recent / 30.0;
    _sv_pm := _active / GREATEST(1, _avg_min);
    _mins_until := GREATEST(0, _eta - 10);
    _expected := GREATEST(0, _waiting + ROUND((_arr_pm - _sv_pm) * _mins_until)::INT);
    _arrival := jsonb_build_object(
      'crowd_level', _crowd,
      'crowd_label', _crowd_label,
      'waiting_now', _waiting,
      'minutes_until_recommended_arrival', _mins_until,
      'expected_queue_length_at_arrival', _expected,
      'confidence_basis_samples', _sample
    );
  END;

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
    'arrival_intel', _arrival,
    'patient_id', _p.id
  );
END;
$$;
