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
| **AI Investigation Service** | Python 3.14, FastAPI, LangGraph, Groq | Stateful LangGraph workflow orchestration, specialized domain agents, telemetry collection tools, hypothesis comparison, RCA & confidence scoring. |
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

## 6. Provider Abstraction & V3 Extensibility

To avoid throwaway architecture, all telemetry collection relies on abstract interfaces:
```python
LogProvider               -> SimulatedLogProvider           (V3: CloudWatch / Loki)
HealthProvider            -> SimulatedHealthProvider        (V3: Kubernetes / Docker)
DatabaseProvider          -> SimulatedDatabaseProvider      (V3: PostgreSQL pg_stat_activity)
MetricsProvider           -> SimulatedMetricsProvider       (V3: Prometheus / Datadog)
DeploymentProvider        -> SimulatedDeploymentProvider    (V3: GitHub Actions / ArgoCD)
ConfigurationProvider     -> SimulatedConfigurationProvider (V3: AWS AppConfig / Vault)
```

In V2, high-fidelity deterministic fixtures simulate four real-world production incident scenarios:
1. **Payment Failure**: Connection pool exhaustion in payment-service causing cascading HTTP 500 errors.
2. **High Latency**: Missing database index causing sequential table scans and thread pool starvation.
3. **Bad Deployment**: Null pointer exception introduced in release `v2.4.1` causing immediate 5xx error spikes.
4. **Auth Configuration Mismatch**: JWT audience modified in gateway configuration rejecting client tokens with 401 Unauthorized.

---

## 7. Future Remediation Contract (V3/V4)

Even though V2 does not execute remediation, recommendations conform to future execution contracts:
```json
{
  "action": "increase_database_connection_capacity",
  "reason": "All 50 available pool connections exhausted.",
  "riskLevel": "HIGH",
  "confidence": 0.93,
  "requiresApproval": true,
  "remediationExecuted": false
}
```
In V3/V4, this structured contract feeds into the human approval gateway and remediation runner.
