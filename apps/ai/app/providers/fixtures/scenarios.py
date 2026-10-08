from typing import Any, Dict, List

SCENARIO_PAYMENT_DB_POOL: Dict[str, Any] = {
    "name": "payment-failure",
    "keywords": ["payment", "500", "pool", "database", "checkout", "transaction"],
    "logs": [
        {
            "timestamp": "2026-10-08T20:44:12Z",
            "level": "ERROR",
            "service": "payment-service",
            "message": "Failed to acquire database connection from pool: connection pool exhausted (active=50, max=50, wait_time=5002ms)",
            "context": {"pool_size": 50, "active": 50, "idle": 0, "waiters": 142},
        },
        {
            "timestamp": "2026-10-08T20:44:15Z",
            "level": "ERROR",
            "service": "payment-service",
            "message": "Payment processing failed for order #88412: HTTP 500 Internal Server Error (DatabaseConnectionTimeout)",
            "context": {"orderId": "88412", "endpoint": "/api/v1/payments/charge"},
        },
        {
            "timestamp": "2026-10-08T20:44:20Z",
            "level": "WARN",
            "service": "payment-service",
            "message": "Retrying connection to database master (attempt 3/3) timed out after 5000ms",
            "context": {"retry": 3, "target": "postgres-primary:5432"},
        },
        {
            "timestamp": "2026-10-08T20:44:25Z",
            "level": "ERROR",
            "service": "payment-service",
            "message": "Circuit breaker OPEN for database cluster pg-payments-primary due to repeated timeout failures",
            "context": {"circuit_breaker": "pg-payments-primary", "state": "OPEN"},
        },
    ],
    "health": {
        "status": "degraded",
        "service": "payment-service",
        "healthy": False,
        "checks": {
            "payment-service-http": {"status": "ok", "latency_ms": 12},
            "database-connectivity": {
                "status": "failing",
                "message": "Timeout acquiring pool connection after 5000ms",
            },
            "redis-cache": {"status": "ok", "latency_ms": 3},
            "payment-gateway-stripe": {"status": "ok", "latency_ms": 140},
        },
        "summary": "Payment service degraded: database connectivity check failed due to pool exhaustion",
    },
    "database": {
        "status": "critical",
        "database_name": "payments_db",
        "active_connections": 50,
        "max_connections": 50,
        "pool_utilization": 1.0,
        "waiting_queries": 142,
        "slow_queries_count": 2,
        "deadlocks": 0,
        "connection_errors_last_hour": 1480,
        "summary": "Database connection pool exhausted. 100% capacity in use with 142 queries blocked in queue.",
    },
    "metrics": {
        "service": "payment-service",
        "error_rate": 0.84,
        "latency_p99_ms": 12450,
        "latency_p50_ms": 480,
        "request_rate_rps": 415,
        "cpu_utilization": 0.34,
        "memory_utilization": 0.52,
        "database_pool_saturation": 1.0,
        "summary": "Spike in 5xx error rate to 84% starting at 20:44:00Z; P99 latency exceeded 12s; CPU and memory healthy.",
    },
    "deployment": [
        {
            "service": "payment-service",
            "version": "v1.9.4",
            "deployed_at": "2026-10-04T14:20:00Z",
            "deployed_by": "ci-release-bot",
            "status": "successful",
            "commit": "a4d812f",
            "message": "Bump dependency security patches",
        }
    ],
    "configuration": {
        "service": "payment-service",
        "current": {
            "DB_MAX_POOL_SIZE": "50",
            "DB_CONNECTION_TIMEOUT_MS": "5000",
            "IDLE_TIMEOUT_MS": "30000",
        },
        "recent_changes": [],
        "summary": "No configuration changes detected in the last 72 hours.",
    },
}

SCENARIO_HIGH_LATENCY: Dict[str, Any] = {
    "name": "high-latency",
    "keywords": ["latency", "slow", "performance", "timeout", "degradation"],
    "logs": [
        {
            "timestamp": "2026-10-08T19:30:10Z",
            "level": "WARN",
            "service": "order-service",
            "message": "Query exceeded slow_query_threshold (1000ms): SELECT * FROM user_orders WHERE status = 'pending' AND updated_at > NOW() - INTERVAL '30 days' took 8420ms (Seq Scan on user_orders)",
            "context": {"query_time_ms": 8420, "plan": "Seq Scan"},
        },
        {
            "timestamp": "2026-10-08T19:31:05Z",
            "level": "WARN",
            "service": "order-service",
            "message": "Worker thread pool queue depth elevated: 94 pending requests awaiting execution",
            "context": {"queue_depth": 94, "max_queue": 100},
        },
    ],
    "health": {
        "status": "degraded",
        "service": "order-service",
        "healthy": True,
        "checks": {
            "order-service-http": {"status": "ok", "latency_ms": 1800},
            "database-query-latency": {
                "status": "degraded",
                "message": "P99 query latency elevated to 8.4s",
            },
        },
        "summary": "Service responding slowly due to unindexed sequential scan query contention",
    },
    "database": {
        "status": "degraded",
        "database_name": "orders_db",
        "active_connections": 24,
        "max_connections": 100,
        "pool_utilization": 0.24,
        "waiting_queries": 18,
        "slow_queries_count": 64,
        "deadlocks": 0,
        "top_slow_query": "SELECT * FROM user_orders WHERE status = 'pending' AND updated_at > ...",
        "summary": "High query execution times caused by sequential scan on user_orders table missing composite index.",
    },
    "metrics": {
        "service": "order-service",
        "error_rate": 0.04,
        "latency_p99_ms": 9400,
        "latency_p50_ms": 1950,
        "request_rate_rps": 320,
        "cpu_utilization": 0.89,
        "memory_utilization": 0.65,
        "summary": "P99 latency surged to 9.4s; CPU utilization at 89% on database node; low 5xx error rate.",
    },
    "deployment": [
        {
            "service": "order-service",
            "version": "v3.1.0",
            "deployed_at": "2026-10-02T10:00:00Z",
            "status": "successful",
            "commit": "9bc110a",
        }
    ],
    "configuration": {
        "service": "order-service",
        "current": {"SLOW_QUERY_THRESHOLD_MS": "1000"},
        "recent_changes": [],
        "summary": "No recent configuration changes.",
    },
}

SCENARIO_BAD_DEPLOYMENT: Dict[str, Any] = {
    "name": "bad-deployment",
    "keywords": ["deploy", "regression", "release", "crash", "nullpointer", "syntax"],
    "logs": [
        {
            "timestamp": "2026-10-08T20:15:22Z",
            "level": "ERROR",
            "service": "checkout-service",
            "message": "TypeError: Cannot read properties of undefined (reading 'billingAddress') at OrderProcessor.process (order.service.ts:89)",
            "context": {"stack": "TypeError: Cannot read properties of undefined..."},
        },
        {
            "timestamp": "2026-10-08T20:15:30Z",
            "level": "ERROR",
            "service": "checkout-service",
            "message": "Unhandled rejection in POST /api/v2/checkout: HTTP 500 returned to client",
            "context": {"endpoint": "/api/v2/checkout"},
        },
    ],
    "health": {
        "status": "degraded",
        "service": "checkout-service",
        "healthy": False,
        "checks": {
            "checkout-service-http": {"status": "failing", "error_rate": "92%"},
            "database-connectivity": {"status": "ok", "latency_ms": 5},
        },
        "summary": "Checkout service failing with 500 errors immediately after release v2.4.1",
    },
    "database": {
        "status": "healthy",
        "database_name": "checkout_db",
        "active_connections": 12,
        "max_connections": 100,
        "pool_utilization": 0.12,
        "waiting_queries": 0,
        "slow_queries_count": 0,
        "summary": "Database healthy; low load.",
    },
    "metrics": {
        "service": "checkout-service",
        "error_rate": 0.92,
        "latency_p99_ms": 110,
        "latency_p50_ms": 45,
        "request_rate_rps": 290,
        "cpu_utilization": 0.22,
        "memory_utilization": 0.38,
        "summary": "Immediate surge in 5xx error rate to 92% coincident with deployment timestamp at 20:14:00Z.",
    },
    "deployment": [
        {
            "service": "checkout-service",
            "version": "v2.4.1",
            "deployed_at": "2026-10-08T20:14:00Z",
            "deployed_by": "ci-release-bot",
            "status": "successful",
            "commit": "c8f2a1b",
            "message": "Refactor billing address parsing logic in checkout flow",
        },
        {
            "service": "checkout-service",
            "version": "v2.4.0",
            "deployed_at": "2026-10-01T11:00:00Z",
            "status": "successful",
            "commit": "3d5f12e",
            "message": "Previous stable release",
        },
    ],
    "configuration": {
        "service": "checkout-service",
        "current": {},
        "recent_changes": [],
        "summary": "No configuration changes.",
    },
}

SCENARIO_AUTH_CONFIG: Dict[str, Any] = {
    "name": "auth-config",
    "keywords": ["auth", "token", "jwt", "unauthorized", "signature", "jwks", "401"],
    "logs": [
        {
            "timestamp": "2026-10-08T18:45:10Z",
            "level": "ERROR",
            "service": "api-gateway",
            "message": "JWT validation failed: Audience mismatch. Expected 'api.opspilot.internal', but token contained 'opspilot-v1'",
            "context": {"expected_aud": "api.opspilot.internal", "actual_aud": "opspilot-v1"},
        },
        {
            "timestamp": "2026-10-08T18:45:15Z",
            "level": "WARN",
            "service": "api-gateway",
            "message": "Rejected request to /api/v1/projects with HTTP 401 Unauthorized",
            "context": {"status": 401},
        },
    ],
    "health": {
        "status": "degraded",
        "service": "api-gateway",
        "healthy": False,
        "checks": {
            "api-gateway-http": {"status": "ok"},
            "auth-verification": {"status": "failing", "message": "Audience verification failure"},
        },
        "summary": "Gateway rejecting authenticated requests due to configuration mismatch on JWT audience",
    },
    "database": {
        "status": "healthy",
        "database_name": "auth_db",
        "active_connections": 6,
        "max_connections": 50,
        "pool_utilization": 0.12,
        "waiting_queries": 0,
        "slow_queries_count": 0,
        "summary": "Database healthy.",
    },
    "metrics": {
        "service": "api-gateway",
        "error_rate": 0.78,
        "latency_p99_ms": 75,
        "latency_p50_ms": 30,
        "request_rate_rps": 550,
        "cpu_utilization": 0.18,
        "memory_utilization": 0.32,
        "summary": "Surge in 401 Unauthorized responses to 78% after configuration change at 18:44:00Z.",
    },
    "deployment": [
        {
            "service": "api-gateway",
            "version": "v1.2.0",
            "deployed_at": "2026-09-28T12:00:00Z",
            "status": "successful",
            "commit": "781ab22",
        }
    ],
    "configuration": {
        "service": "api-gateway",
        "current": {"AUTH_AUDIENCE": "opspilot-v1", "JWKS_CACHE_TTL": "3600"},
        "recent_changes": [
            {
                "changed_at": "2026-10-08T18:44:00Z",
                "key": "AUTH_AUDIENCE",
                "old_value": "api.opspilot.internal",
                "new_value": "opspilot-v1",
                "changed_by": "operator@opspilot.com",
            }
        ],
        "summary": "AUTH_AUDIENCE config changed 25 minutes ago from 'api.opspilot.internal' to 'opspilot-v1'.",
    },
}

    # Update keywords with domain-specific terms
SCENARIO_PAYMENT_DB_POOL["keywords"] = ["payment", "pool", "exhaust", "500", "database timeout", "payments_db"]
SCENARIO_HIGH_LATENCY["keywords"] = ["latency", "slow", "performance", "order-service", "orders_db", "degradation"]
SCENARIO_BAD_DEPLOYMENT["keywords"] = ["deploy", "release", "regression", "checkout-service", "v2.4.1", "billingaddress", "crash"]
SCENARIO_AUTH_CONFIG["keywords"] = ["auth", "token", "jwt", "unauthorized", "signature", "jwks", "401", "api-gateway", "audience"]

ALL_SCENARIOS = [
    SCENARIO_PAYMENT_DB_POOL,
    SCENARIO_HIGH_LATENCY,
    SCENARIO_BAD_DEPLOYMENT,
    SCENARIO_AUTH_CONFIG,
]


def match_scenario(title: str, description: str = "", service: str = "") -> Dict[str, Any]:
    """Matches the most appropriate deterministic scenario based on incident context."""
    text = f"{title} {description} {service}".lower()

    best_scenario = SCENARIO_PAYMENT_DB_POOL
    best_score = 0

    for scenario in ALL_SCENARIOS:
        score = sum(1 for kw in scenario["keywords"] if kw in text)
        if score > best_score:
            best_score = score
            best_scenario = scenario

    return best_scenario

