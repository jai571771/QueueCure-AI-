
REVOKE EXECUTE ON FUNCTION public.compute_bottlenecks(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_recommendations(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_prediction_accuracy(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_forecast(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_efficiency_score(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_doctor_productivity(uuid, uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_arrival_intel(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.compute_bottlenecks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_recommendations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_prediction_accuracy(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_forecast(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_efficiency_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_doctor_productivity(uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_arrival_intel(uuid, uuid) TO authenticated;
