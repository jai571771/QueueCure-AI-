# Phase 3 — Predictive Healthcare Ops, Judge-Ready (Final)

Narrative throughout: **Predict · Explain · Impact · Recommend · Optimize**. Every intelligence surface answers the 4-field Explainability Contract. Build strictly in tier order — Tier 1 must ship.

---

## Explainability Contract (applies everywhere)

Every intelligence component renders exactly these four labelled fields:

1. **What happened** — observable status sentence
2. **Why it happened** — data-grounded reason
3. **Impact** — quantified effect (minutes added, patients affected, score delta)
4. **Recommended action** — concrete next step

Enforced by a shared `<ExplainCard what why impact action severity />` component reused by:
- ETA Timeline entries (`/track`)
- Queue Risk widget
- Bottleneck panel
- Recommendations feed
- Efficiency Score gauge
- Intelligence Alerts feed

SQL JSON payloads (`compute_queue_risk`, `compute_bottlenecks`, `compute_recommendations`, `compute_efficiency_score`, `get_public_eta_history`) all gain `what / why / impact / action` keys so the UI never composes explanations client-side.

---

## Tier 1 — Critical (must ship, never delayed)

### 1.1 Scenario Simulator + "Start Judge Demo" walkthrough
Single button on `/_authenticated/demo` runs an 8-step orchestrated story (~75s, ~8–10s per step) with pause/skip:

| # | Step | Mechanism |
|---|---|---|
| 1 | Normal Queue | `seed_scenario('normal')` |
| 2 | Patient Tracking | inline iframe to `/track/<slug>/<token>` |
| 3 | Emergency Inserted | `seed_scenario('emergency')` |
| 4 | ETA Recalculated | existing trigger → ETA Timeline animates |
| 5 | Patient Notified | `useTrackingNotifications` toast |
| 6 | Queue Risk Updated | `compute_queue_risk` refetch |
| 7 | Recommendation Generated | `compute_recommendations` |
| 8 | Efficiency Score Updated | `compute_efficiency_score` + lift |

`JudgeDemoRunner` drives state machine: fires server fn → spotlights `data-demo-id` target with framer-motion ring → shows `ExplainCard` caption (What/Why/Impact/Next) → advances.

Manual scenario cards remain (Normal / Emergency / Doctor Delay / Rush Hour). `resetDemoData` button always available.

### 1.2 Demo Success Metrics — "System Impact" widget
Compact card on top of `/demo` page, live-updating, proves the platform is working:

```
ETA Accuracy:        87% (±5 min, last 24h)
Prediction Confidence: High · 142 samples
Queue Health:        Good · 3 active, 0 overdue
Realtime Status:     ● Connected · 12 events/min
Notifications Sent:  8 in this demo session
```

Powered by `compute_demo_health(_clinic_id)` SQL fn aggregating existing intel + a tiny client-side counter for notifications-this-session and realtime channel state.

### 1.3 Presentation Mode
Toggle in `AppHeader`, persisted `localStorage`. When on: larger KPI typography via `html[data-presentation="on"]` CSS vars, framer-motion entrances, product tagline "Predictive Healthcare Operations Platform" subline, hides dev affordances.

### 1.4 ETA Timeline (Explainability on /track)
Public SQL fn `get_public_eta_history(_clinic_slug, _token)` returns audit entries. `EtaTimelineCard` renders vertical timeline; each entry is an `ExplainCard`:
- **What**: "ETA changed 22 → 31 min"
- **Why**: "Emergency case inserted ahead of you"
- **Impact**: "+9 min wait"
- **Next**: "No action needed — we'll notify you 15 min before your turn"

Empty state: "ETA stable — predictions holding within ±2 min."

### 1.5 QR Tracking
Install `qrcode`. `QrCodeDialog` from AddPatient success + per-row QR icon in reception. Shows QR → `${origin}/track/${slug}/${token}` plus printable token slip (token #, clinic, recommended arrival, QR). `@media print` clean layout.

### 1.6 Seed-Rich Demo Data
`seed_scenario('normal')` seeds realistic mix (General, Follow-up, Vaccination, Lab Review) + back-dated `consultation_events` (≥20 per common visit_type over last 7 days) so on first launch:
- High-confidence chips render
- `compute_prediction_accuracy` has data
- `compute_bottlenecks` finds at least one realistic bottleneck (Follow-up running long)
- `compute_recommendations` returns ≥2 actionable items
- `compute_forecast` shows non-empty bands
- Efficiency Score lands in B/C range with clear biggest-lever

No empty dashboards anywhere on first visit.

---

## Tier 2 — Important (after all Tier 1 ships)

### 2.1 Intelligence Alerts Feed
Mounted on Reception + Doctor dashboards. Aggregates `compute_bottlenecks`, `compute_recommendations`, `compute_queue_risk`, new `compute_confidence_alerts`. Every item is an `ExplainCard` with severity chip + dismiss. Subscribed to `queue_audit_log` realtime; debounced refetch on `emergency_inserted` / `eta_recomputed` / `consultation_completed`.

### 2.2 Arrival Intelligence — "When should I leave home?"
Rebuild `ArrivalIntelCard` as a navigation-ETA experience:
```
Recommended Arrival: 10:45 AM
   2 patients ahead · Avg consult today 8 min · 1 doctor active
[Crowd: Moderate] [Confidence: High · 24 samples]
Expected queue length when you arrive: 1
```
Extend `get_public_tracking` arrival_intel payload with `reasoning_summary` + `confidence_tier`.

### 2.3 Notification Center
`useTrackingNotifications(tracking)` requests `Notification.permission` on explicit user action; fires on status change, ETA delta ≥5 min, emergency, arrival thresholds (15/5/0 min). `NotificationCenter` drawer lists last 10 events (per-token `localStorage`). Sonner fallback. Notification count feeds the System Impact widget.

---

## Tier 3 — Optional (only if Tier 1 + 2 fully complete)

### 3.1 Reports — `/_authenticated/reports`
Daily Clinic Summary, Prediction Accuracy (1d/7d/30d), Efficiency Trend (last 7 daily snapshots from new `clinic_efficiency_daily` table). Print + Copy-as-Markdown. No PDF/email.

### 3.2 Accessibility Menu
Large text + High contrast toggles in `AppHeader`, persisted, applied via `html[data-*]` CSS vars.

### 3.3 Localization — EN + HI only
`react-i18next` + minimal `en` / `hi` dictionaries covering `/track`, Arrival card, ETA timeline, AppHeader, judge demo captions. Staff dashboards stay EN. Language switcher in `AccessibilityMenu`. **No ES or other locales this phase.**

---

## Technical details

### SQL migration (single file)
1. `get_public_eta_history(_clinic_slug text, _token int)` — public; returns rows with `what/why/impact/action`.
2. `compute_confidence_alerts(_clinic_id uuid)` — gated.
3. `seed_scenario(_clinic_id uuid, _scenario text)` — `normal | emergency | doctor_delay | rush_hour`; seeds queue + back-dated history.
4. `reset_demo_data(_clinic_id uuid)`.
5. Replace `compute_efficiency_score` to return `{score, grade, what, why, impact, action, biggest_lever, estimated_lift_points}`.
6. Extend `compute_queue_risk`, `compute_bottlenecks`, `compute_recommendations` to include `what/why/impact/action`.
7. Extend `get_public_tracking` arrival_intel with `reasoning_summary` + `confidence_tier`.
8. `compute_demo_health(_clinic_id uuid)` — returns `{eta_accuracy, confidence_label, confidence_samples, queue_health, queue_active, queue_overdue}`.
9. (Tier 3) `clinic_efficiency_daily` table + GRANTs + RLS + `snapshot_efficiency` upsert.

All new fns SECURITY DEFINER, `search_path=public`, `has_clinic_access` gated except `get_public_eta_history`.

### Server functions
- `src/lib/demo.functions.ts` — `runJudgeDemoStep`, `runScenario`, `resetDemo`, `getDemoHealth`.
- `src/lib/intel.functions.ts` — `getConfidenceAlerts`; updated `getEfficiencyScore` shape.
- `src/lib/tracking.functions.ts` — public `getEtaHistory({ slug, token })` via server publishable client.
- Tier 3: `src/lib/reports.functions.ts`.

### Components
- `src/components/common/ExplainCard.tsx` — the contract enforcer (used everywhere).
- `src/components/demo/{JudgeDemoRunner,ScenarioCard,DemoStoryCaption,Spotlight,SystemImpactWidget,PresentationModeToggle}.tsx`
- `src/components/track/{EtaTimelineCard,NotificationCenter,ArrivalIntelCard (rewrite)}.tsx`
- `src/components/queue/QrCodeDialog.tsx`
- `src/components/intel/IntelligenceAlertsFeed.tsx` (existing intel cards refactored to use `ExplainCard`)
- Tier 3: `src/components/reports/*`, `src/components/a11y/AccessibilityMenu.tsx`, `src/i18n/*`.

### Hooks
`use-tracking-notifications`, `use-presentation-mode`, `use-judge-demo`, `use-demo-health`. Tier 3: `use-a11y-prefs`.

### Routes
- `src/routes/_authenticated/demo.tsx` (Tier 1)
- Tier 3: `src/routes/_authenticated/reports.tsx`

### Deps
- Tier 1: `qrcode`, `@types/qrcode`
- Tier 3: `react-i18next`, `i18next`

### Out of scope
Admin panel · multi-clinic switcher · AI chatbots · voice intake · SMS/WhatsApp · PDF/email reports · server-side push · ES/other locales.

---

## Narrative reinforcement (every screen)

- AppHeader subtitle (Presentation mode on): "Predictive Healthcare Operations Platform"
- Reception / Doctor / Demo headers each carry one of the verbs (Predict · Explain · Impact · Recommend · Optimize) as a section eyebrow tied to the dominant widget.
- Patient `/track` reframed top-to-bottom: Predict (Arrival Intel) → Explain (ETA Timeline) → Impact (Queue position card) → Recommend (Recommended arrival CTA) → Notify (Notification Center).

---

## Build order
1. SQL migration (all functions, including `compute_demo_health` + payload reshape).
2. `bun add qrcode @types/qrcode`.
3. `ExplainCard` + refactor existing intel widgets to consume new payloads.
4. Tier 1: Demo route → JudgeDemoRunner → SystemImpactWidget → Presentation toggle → EtaTimeline → QR → verify seed data fills every dashboard.
5. Tier 2: Intelligence Alerts → Arrival rewrite → Notification Center (wire counter into SystemImpactWidget).
6. Tier 3 (only if time): Reports → Accessibility → i18n (EN+HI).
