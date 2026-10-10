# OpsPilot V2 — AI Investigation Engine & Control Room

## 1. Overview & Objective

OpsPilot V2 elevates the platform from an incident tracker into an **Autonomous AI Investigation Engine**.
When an incident is reported, SRE teams require deep, evidence-backed root cause analysis rather than speculative hallucination.

The core principle of OpsPilot V2 is **Evidence-First Reasoning**:
```text
Telemetry Sources (Logs, Health, DB, Metrics, Deployments, Config)
                              ↓
              Controlled Provider Abstraction
                              ↓
                 Specialized Agent Inspection
                              ↓
                      Evidence Store
                              ↓
                 Competing Hypotheses Engine
                              ↓
                 Root Cause Determination (RCA)
                              ↓
                Confidence Score & Factor Attribution
                              ↓
             Approval-Gated Remediation Recommendation
                              ↓
           React Control Room Operator Verification
```

---

## 2. Service Boundaries

| Service | Technology | Ownership & Responsibility |
| :--- | :--- | :--- |
| **Product API** | NestJS 12, TypeORM, PostgreSQL | Authentication, Authorization, Project membership, Incident state machine, Audit logging, Investigation lifecycle persistence. React communicates **only** with NestJS. |
| **AI Investigation Service** | Python 3.14, FastAPI, LangGraph, Gemini / Groq | Stateful LangGraph workflow orchestration, specialized domain agents, telemetry collection tools, hypothesis comparison, RCA & confidence scoring. |
| **Control Room UI** | React 19, TypeScript, Vite | SRE operator interface, live investigation telemetry radar, evidence exploration, hypotheses comparison, agent execution run inspector. |

React **never** connects directly to FastAPI. Every investigation invocation is authenticated via JWT and authorized through project membership before being dispatched from NestJS to FastAPI.

---

## 3. LangGraph Workflow Graph

The investigation is modeled as a stateful, typed `StateGraph(InvestigationGraphState)`:

```text
                      [START]
                         │
                         ▼
                  load_incident
                         │
                         ▼
                plan_investigation
                         │
        ┌──────────┬─────┴────┬──────────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼          ▼
    collect    collect    collect    collect    collect    collect
      logs     health    database   metrics   deployment   config
        │          │          │          │          │          │
        └──────────┴─────┬────┴──────────┴──────────┴──────────┘
                         ▼
                  analyze_evidence
                         │
                         ▼
                evaluate_hypotheses
                         │
                         ▼
               generate_recommendation
                         │
                         ▼
                  validate_result
                         │
                         ▼
               finalize_investigation
                         │
                         ▼
                       [END]
```

### Concurrency
Evidence collection across all six telemetry domains executes concurrently in parallel, preventing artificial latency bottlenecks.

---

## 4. Specialized Domain Agents

OpsPilot avoids monolithic or generic agent roles in favor of specialized operational agents:

1. **Investigation Orchestrator**: Coordinates execution plan, manages lifecycle transitions (`PENDING` → `RUNNING` → `COMPLETED`/`FAILED`), and tracks global telemetry findings.
2. **Log Agent**: Queries service logs, isolates error patterns (5xx, timeouts), parses timestamps, and builds structured log evidence.
3. **Health Agent**: Inspects service endpoints and dependency graphs (databases, caches, third-party gateways) for degradation.
4. **Database Agent**: Inspects connection pool saturation, waiting queries in queue, active locks, deadlocks, and slow queries.
5. **Metrics Agent**: Evaluates operational telemetry, including P50/P99 latencies, HTTP error rates, throughput (RPS), and server CPU/memory utilization.
6. **Deployment Agent**: Inspects recent releases, commits, and deploys to correlate regression onset with release timestamps.
7. **Configuration Agent**: Inspects environment parameters, feature flags, and recent configuration diffs.
8. **RCA Agent**: Evaluates competing hypotheses against collected evidence, rejecting unsupported theories and formulating the evidence-backed root cause.
9. **Recommendation Agent**: Formulates safe, approval-gated mitigation recommendations. **No automated remediation is executed in V2.**

---

## 5. Controlled Investigation Tools & Security Guardrails

The LLM is strictly prohibited from executing arbitrary shell commands, raw filesystem operations, or direct database administration:
- Every tool is strongly typed with Pydantic input/output schemas.
- Inputs are validated and sanitized against injection.
- Telemetry logs and configuration diffs are treated as **untrusted data**, immunizing the system against prompt injection attacks (e.g. `IGNORE ALL PREVIOUS INSTRUCTIONS`).
- Tools identify their source and log audit trails.

---

## 6. Provider Abstraction & Pluggable Evidence Model

To avoid throwaway architecture, all telemetry collection relies on abstract interfaces:
```python
LogProvider               -> SimulatedLogProvider           (V3: CloudWatch / Loki / OpenTelemetry)
HealthProvider            -> SimulatedHealthProvider        (V3: Kubernetes / Docker / Consul)
DatabaseProvider          -> SimulatedDatabaseProvider      (V3: PostgreSQL pg_stat_activity / MySQL)
MetricsProvider           -> SimulatedMetricsProvider       (V3: Prometheus / Datadog)
DeploymentProvider        -> SimulatedDeploymentProvider    (V3: GitHub Actions / ArgoCD / GitLab)
ConfigurationProvider     -> SimulatedConfigurationProvider (V3: AWS AppConfig / Vault / Consul)
```

The investigation engine depends strictly on **provider contracts and evidence schemas**, never on scenario fixtures or hardcoded scenario IDs. Providers supply raw evidence describing reality; the reasoning engine interprets observations independently.

---

## 7. Evidence-First Reasoning & Separation of Concerns

The generalized OpsPilot V2 engine enforces strict separation across analytical phases:
```text
Provider Telemetry
       ↓
Raw Evidence Items (Describing Observations)
       ↓
Evidence Normalization
       ↓
Finding Extraction (Interpreted observations with severity)
       ↓
Dynamic Competing Hypotheses Generation (Open-ended, service-agnostic)
       ↓
Hypothesis Evaluation (Supporting vs Contradicting evidence IDs)
       ↓
Root Cause Determination & Attribution
       ↓
Confidence Calculation & Factor Penalties (Missing evidence penalty)
       ↓
Remediation Recommendation Formulation (Approval-gated)
```

### Key Generalization Guarantees:
1. **Zero Scenario-Based RCA**: No `if scenario == ...` conditionals exist in production code. Conclusions emerge entirely from evidence signals.
2. **Open-Ended Hypotheses**: The system investigates arbitrary failure modes (downstream dependency latency, queue backlogs, memory pressure/OOM, Redis cache failure, network transport degradation, configuration drift, database pool exhaustion, query contention, deployment regressions).
3. **Cross-Service Attribution**: Separates symptom service (e.g., `api-gateway` returning 504) from root-cause service (e.g., `auth-service` or `inventory-service` latency).
4. **Temporal Correlation**: Directly cross-references deployment and configuration change timestamps against error onset timestamps. If degradation began before a release, the deployment hypothesis is actively rejected.
5. **Missing Evidence & Uncertainty Handling**: If telemetry domains are missing or unavailable, the engine applies confidence penalties and records limitations rather than fabricating certainty. For healthy or non-anomalous systems, the engine returns `INCONCLUSIVE` (confidence < 0.50).
6. **Dual Reasoning Layers**: Multi-provider LLM inference (Google Gemini & Groq) with automated, deterministic algorithmic fallback guaranteeing complete reliability under API outages.

---

## 8. Test Matrix & Validation Scenarios

The test suite validates both deterministic regression scenarios and novel, unprompted failure modes:

| Test / Scenario | Failure Mode | Validation Objective |
| :--- | :--- | :--- |
| **Acceptance Test 1** | Downstream dependency latency (`inventory-service`) | Proves conclusion emerges from evidence without pre-existing fixture. |
| **Acceptance Test 2** | Queue backlog (`worker-service`, depth 2,000,000) | Identifies consumer processing bottleneck without queue scenario name. |
| **Acceptance Test 3** | External dependency latency (`search-cluster`) | Isolates 5s external API latency from normal CPU/memory. |
| **Anti-Hardcoding** | Incident title perturbation | Identical evidence yields equivalent RCA regardless of incident naming. |
| **Evidence Perturbation** | Deployment vs Database evidence swap | Directly alters root cause when evidence changes. |
| **Conflicting Timing** | Degradation started before deployment | Temporal contradiction engine rejects deployment regression hypothesis. |
| **Missing Evidence** | Unavailable metrics and deployment providers | Applies missing domain penalties and notes limitations. |
| **Inconclusive Baseline** | Nominal operating telemetry | Returns `INCONCLUSIVE` (confidence < 0.50) without fabricating false causes. |
| **Memory Pressure** | ETL worker heap saturation (98% memory, GC pause) | Identifies memory exhaustion and recommends heap profile. |
| **Cache Failure** | Redis cluster connection refused | Identifies cache unavailability and database read pressure. |
| **Network Degradation** | DNS timeouts and transport resets | Detects transport degradation and recommends DNS resolver audit. |
| **Configuration Drift** | Secret rotation mismatch (`AUTH_AUDIENCE_URL`) | Identifies configuration incompatibility and token rejection. |
| **Multiple Causes** | Competing database and dependency signals | Returns `ROOT_CAUSE_LIKELY` with bounded confidence (<= 0.75). |
| **Cross-Service** | Ingress gateway 504 due to auth-service | Distinguishes symptom service from root cause service. |
| **LLM Failure Resilience** | Upstream provider error (Gemini/Groq) | Seamlessly falls back to algorithmic engine without crashing. |
| **Regression Scenarios** | Payment failure, Bad deploy, High latency, Auth | Preserves 100% backward compatibility with V2 demo fixtures. |

---

## 9. Future Remediation Contract (V3/V4)

Even though V2 does not execute remediation, recommendations conform to future execution contracts:
```json
{
  "action": "Scale database connection pool capacity and investigate active connection leaks for payment-service",
  "reason": "Database connection pool reached saturation (100% capacity) with 142 queued queries.",
  "riskLevel": "HIGH",
  "confidence": 0.88,
  "requiresApproval": true,
  "remediationExecuted": false
}
```
In V3/V4, this structured contract feeds into the human approval gateway and remediation runner.

