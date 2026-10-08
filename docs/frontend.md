# OpsPilot Frontend Architecture & SRE Control Room Design System

## Overview

The OpsPilot frontend (`apps/web`) is a high-performance, single-page application built for Site Reliability Engineers (SREs), Incident Commanders, and DevOps teams. It provides a mission-critical operations control room interface for managing production incidents, tracking telemetry, and supervising autonomous AI investigations.

---

## 1. Design System & Tokens

OpsPilot adopts a **dark-mode first, high-density telemetry aesthetic** inspired by modern operational consoles (Linear, Datadog, Grafana) rather than consumer or marketing dashboards.

### Color Tokens

| Token | Value | Semantic Usage |
|---|---|---|
| `--bg-canvas` | `#07090e` | Deep space background |
| `--bg-primary` | `#0b0f19` | Surface panels and cards |
| `--bg-secondary` | `#111827` | Elevated containers, table headers |
| `--bg-tertiary` | `#1a2234` | Popovers, active interactive states |
| `--border-primary` | `#1e293b` | Primary borders and dividers |
| `--border-secondary` | `#2d3748` | Interactive and hover borders |
| `--accent` | `#38bdf8` | SRE cyan / primary operational focus |
| `--accent-hover` | `#0284c7` | Interactive accent hover |
| `--text-primary` | `#f1f5f9` | High-contrast body & header text |
| `--text-secondary` | `#94a3b8` | Supporting metadata & labels |
| `--text-muted` | `#64748b` | Timestamps, deactivated states |

### Severity & Status Colors

- **CRITICAL**: `#f43f5e` (Rose/Red)
- **HIGH**: `#fb923c` (Amber/Orange)
- **MEDIUM**: `#facc15` (Yellow)
- **LOW**: `#38bdf8` (Cyan)
- **INVESTIGATING**: `#38bdf8` (Pulsing radar indicator)
- **MITIGATED**: `#fbbf24` (Amber)
- **RESOLVED / SUCCESS**: `#10b981` (Emerald)

---

## 2. Component Architecture

```text
apps/web/src/
├── app/
│   ├── App.tsx                     # TanStack Query & Auth Provider setup
│   └── router.tsx                  # Declarative client routes
├── components/
│   ├── ui/                         # Base design system primitives
│   │   ├── Badge.tsx               # Severity, Status, Risk, and Domain badges
│   │   ├── ConfidenceMeter.tsx     # Calibrated confidence gauge & factors
│   │   ├── EmptyState.tsx          # Contextual empty state with guidance
│   │   └── LoadingSkeleton.tsx     # Low-noise shimmer skeleton
│   ├── layout/                     # Global application shell
│   │   ├── AppLayout.tsx           # Shell orchestrator with responsive container
│   │   ├── Sidebar.tsx             # Collapsible SRE navigation with live system status
│   │   ├── Topbar.tsx              # Quick search, environment context, notifications
│   │   ├── CommandPalette.tsx      # Ctrl+K modal for rapid incident/project navigation
│   │   └── NotificationCenter.tsx  # Operational alert popover
│   ├── incident/                   # Incident management components
│   │   ├── IncidentImpactBanner.tsx# Real-time blast radius and error metrics
│   │   ├── IncidentTimeline.tsx    # Chronological lifecycle & audit trail
│   │   └── ServiceTopologyView.tsx # Dynamic dependency and datastore graph
│   └── investigation/              # Flagship AI Control Room
│       ├── InvestigationControlRoom.tsx # Master investigation coordinator
│       ├── InvestigationPipelineTracker.tsx # LangGraph stage execution pipeline
│       ├── RootCausePanel.tsx      # Primary RCA summary and confidence
│       ├── HypothesisComparison.tsx# Competing hypotheses comparison bars
│       ├── FindingsList.tsx        # Synthesized findings layer
│       ├── EvidenceExplorer.tsx    # Multimodal evidence viewer with domain filters
│       └── RecommendationPanel.tsx # Approval-gated remediation actions
├── pages/
│   ├── DashboardPage.tsx           # System health & global incident overview
│   ├── IncidentsPage.tsx           # Searchable, filterable global incident list
│   ├── IncidentDetailPage.tsx      # Flagship incident workspace
│   ├── ProjectsPage.tsx            # Project catalog with create flow
│   ├── ProjectDetailPage.tsx       # Project incident management
│   ├── LoginPage.tsx               # Secure authentication
│   └── RegisterPage.tsx            # Team member onboarding
└── services/
    ├── api/                        # Axios clients with JWT injection
    │   ├── apiClient.ts            # Base client with interceptors
    │   ├── authApi.ts
    │   ├── projectsApi.ts
    │   ├── incidentsApi.ts
    │   └── investigationsApi.ts
    └── auth.ts                     # Token storage & lifecycle
```

---

## 3. Cognitive Pipeline UX

OpsPilot enforces strict separation between different layers of reasoning so engineers can distinguish observed facts from inferences:

```text
EVIDENCE (Observed telemetry: logs, metrics, health, db, deploy)
   ↓
FINDINGS (Synthesized factual observations)
   ↓
COMPETING HYPOTHESES (Ranked theories with supporting/contradicting counts)
   ↓
ROOT CAUSE & CONFIDENCE (Most probable failure mechanism with calibrated confidence)
   ↓
RECOMMENDATIONS (Approval-gated action plans with risk ratings)
   ↓
HUMAN APPROVAL (Explicit gatekeeper before any remediation)
```

---

## 4. Operational Safety & Approval Gating

The frontend strictly enforces safety guarantees:
1. **Approval Gating**: Remediations are displayed with explicit risk badges (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and mandatory approval banners.
2. **Zero Fake Executions**: The frontend never simulates action executions or creates unverified mock state.
3. **No Fake AI Spinners**: Animation is tied strictly to active server polling states (`refetchInterval: 3000` when running).

---

## 5. Keyboard Navigation & Accessibility

- **Global Command Palette**: Accessible via `Ctrl+K` or `Cmd+K` anywhere in the app. Allows instant jumping to Incidents, Projects, or specific active incidents.
- **Semantic HTML**: Interactive elements use button and anchor elements with high-contrast visible focus rings.
- **Color-Independent Status**: Every status badge couples color with an icon (`AlertOctagon`, `CheckCircle2`, `Activity`, `Clock`) and clear text.
