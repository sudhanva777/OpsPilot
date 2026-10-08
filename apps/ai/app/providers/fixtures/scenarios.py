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

# ─── Novel Scenarios & Generic Baseline ──────────────────────────────────────

SCENARIO_BASELINE_NORMAL: Dict[str, Any] = {
    "name": "baseline-normal",
    "keywords": ["normal", "healthy", "baseline", "operational", "nominal"],
    "logs": [
        {
            "timestamp": "2026-10-08T20:50:00Z",
            "level": "INFO",
            "service": "api-service",
            "message": "Routine health check succeeded: HTTP 200 OK across all workers",
        },
        {
            "timestamp": "2026-10-08T20:50:10Z",
            "level": "INFO",
            "service": "api-service",
            "message": "Scheduled garbage collection cycle completed in 8ms",
        },
    ],
    "health": {
        "status": "healthy",
        "service": "api-service",
        "healthy": True,
        "checks": {
            "api-service-http": {"status": "ok", "latency_ms": 12},
            "database-connectivity": {"status": "ok", "latency_ms": 3},
            "cache": {"status": "ok", "latency_ms": 1},
        },
        "summary": "All system health checks operational within normal thresholds.",
    },
    "database": {
        "status": "healthy",
        "database_name": "primary_db",
        "active_connections": 5,
        "max_connections": 100,
        "pool_utilization": 0.05,
        "waiting_queries": 0,
        "slow_queries_count": 0,
        "summary": "Database operating with minimal load (5% pool utilization).",
    },
    "metrics": {
        "service": "api-service",
        "error_rate": 0.001,
        "latency_p99_ms": 48,
        "latency_p50_ms": 14,
        "request_rate_rps": 250,
        "cpu_utilization": 0.18,
        "memory_utilization": 0.32,
        "summary": "Nominal traffic and performance metrics within expected SLA parameters.",
    },
    "deployment": [
        {
            "service": "api-service",
            "version": "v1.4.0",
            "deployed_at": "2026-10-01T08:00:00Z",
            "status": "successful",
            "commit": "1f8e23a",
            "message": "Routine maintenance release",
        }
    ],
    "configuration": {
        "service": "api-service",
        "current": {"MAX_WORKERS": "16"},
        "recent_changes": [],
        "summary": "No recent configuration modifications.",
    },
}

SCENARIO_DEPENDENCY_LATENCY: Dict[str, Any] = {
    "name": "dependency-latency",
    "keywords": [
        "dependency",
        "inventory-service",
        "order-api",
        "downstream",
        "timeout calling",
        "upstream",
        "external",
    ],
    "logs": [
        {
            "timestamp": "2026-10-08T20:30:10Z",
            "level": "ERROR",
            "service": "order-api",
            "message": "Upstream request failed: HTTP 504 Gateway Timeout calling http://inventory-service.internal:8080/v1/stock/reserve after 8000ms",
            "context": {"dependency": "inventory-service", "endpoint": "/v1/stock/reserve"},
        },
        {
            "timestamp": "2026-10-08T20:30:15Z",
            "level": "ERROR",
            "service": "order-api",
            "message": "Repeated timeout errors calling downstream dependency inventory-service: connection deadline exceeded (8400ms)",
            "context": {"dependency": "inventory-service", "retry_count": 3},
        },
        {
            "timestamp": "2026-10-08T20:30:22Z",
            "level": "WARN",
            "service": "order-api",
            "message": "Circuit breaker degraded for inventory-service; falling back to synchronous degraded queue",
            "context": {"circuit_breaker": "inventory-service", "state": "HALF_OPEN"},
        },
    ],
    "health": {
        "status": "degraded",
        "service": "order-api",
        "healthy": False,
        "checks": {
            "order-api-http": {"status": "degraded", "latency_ms": 8400},
            "inventory-service": {
                "status": "failing",
                "message": "inventory-service response latency elevated to 8.4s",
                "latency_ms": 8420,
            },
            "database-connectivity": {"status": "ok", "latency_ms": 4},
            "redis-cache": {"status": "ok", "latency_ms": 2},
        },
        "summary": "Service degraded due to high downstream latency on inventory-service dependency",
    },
    "database": {
        "status": "healthy",
        "database_name": "orders_db",
        "active_connections": 8,
        "max_connections": 100,
        "pool_utilization": 0.08,
        "waiting_queries": 0,
        "slow_queries_count": 0,
        "summary": "Database is completely healthy with 8% connection pool utilization.",
    },
    "metrics": {
        "service": "order-api",
        "error_rate": 0.48,
        "latency_p99_ms": 8400,
        "latency_p50_ms": 220,
        "request_rate_rps": 380,
        "cpu_utilization": 0.24,
        "memory_utilization": 0.36,
        "summary": "P99 latency surged from 220ms to 8.4s due to downstream inventory-service timeouts; local CPU/DB normal.",
    },
    "deployment": [
        {
            "service": "order-api",
            "version": "v2.1.0",
            "deployed_at": "2026-10-02T14:00:00Z",
            "status": "successful",
            "commit": "8fe721a",
            "message": "Previous stable release",
        }
    ],
    "configuration": {
        "service": "order-api",
        "current": {"INVENTORY_TIMEOUT_MS": "8000"},
        "recent_changes": [],
        "summary": "No relevant configuration changes in the last 72 hours.",
    },
}

SCENARIO_QUEUE_BACKLOG: Dict[str, Any] = {
    "name": "queue-backlog",
    "keywords": [
        "queue",
        "backlog",
        "consumer",
        "worker",
        "background",
        "jobs",
        "celery",
        "sqs",
        "rabbitmq",
        "stuck",
    ],
    "logs": [
        {
            "timestamp": "2026-10-08T20:25:00Z",
            "level": "WARN",
            "service": "worker-service",
            "message": "Queue backlog threshold exceeded: 2000000 pending jobs waiting in queue 'orders-processing'",
            "context": {"queue_depth": 2000000, "queue": "orders-processing"},
        },
        {
            "timestamp": "2026-10-08T20:25:15Z",
            "level": "ERROR",
            "service": "worker-service",
            "message": "Consumer processing throughput collapsed to 0.05 jobs/sec; queue processing stalled",
            "context": {"throughput": 0.05, "expected": 500},
        },
    ],
    "health": {
        "status": "degraded",
        "service": "worker-service",
        "healthy": False,
        "checks": {
            "worker-process": {"status": "ok", "message": "Worker process alive"},
            "queue-depth": {
                "status": "critical",
                "message": "Queue depth at 2,000,000 items with near-zero drain rate",
            },
            "database-connectivity": {"status": "ok", "latency_ms": 3},
        },
        "summary": "Worker processing halted due to massive queue backlog and stalled consumers",
    },
    "database": {
        "status": "healthy",
        "database_name": "jobs_db",
        "active_connections": 4,
        "max_connections": 100,
        "pool_utilization": 0.04,
        "waiting_queries": 0,
        "slow_queries_count": 0,
        "summary": "Database healthy.",
    },
    "metrics": {
        "service": "worker-service",
        "queue_depth": 2000000,
        "error_rate": 0.02,
        "request_rate_rps": 0.05,
        "latency_p99_ms": 45000,
        "cpu_utilization": 0.09,
        "memory_utilization": 0.28,
        "summary": "Queue depth reached 2,000,000; consumer throughput near zero; worker process healthy.",
    },
    "deployment": [
        {
            "service": "worker-service",
            "version": "v1.8.0",
            "deployed_at": "2026-10-01T09:00:00Z",
            "status": "successful",
            "commit": "5a4192b",
        }
    ],
    "configuration": {
        "service": "worker-service",
        "current": {"MAX_CONCURRENCY": "20"},
        "recent_changes": [],
        "summary": "No recent worker configuration changes.",
    },
}

SCENARIO_MEMORY_PRESSURE: Dict[str, Any] = {
    "name": "memory-pressure",
    "keywords": ["memory", "leak", "oom", "heap", "gc pause", "rss"],
    "logs": [
        {
            "timestamp": "2026-10-08T20:20:00Z",
            "level": "ERROR",
            "service": "analytics-service",
            "message": "Fatal process error: java.lang.OutOfMemoryError: Java heap space during buffer allocation",
            "context": {"heap_used_mb": 4096, "heap_max_mb": 4096},
        },
        {
            "timestamp": "2026-10-08T20:20:12Z",
            "level": "WARN",
            "service": "analytics-service",
            "message": "Prolonged GC pause detected: full garbage collection stopped the world for 14200ms",
            "context": {"gc_pause_ms": 14200},
        },
    ],
    "health": {
        "status": "critical",
        "service": "analytics-service",
        "healthy": False,
        "checks": {
            "memory-headroom": {"status": "critical", "message": "Heap utilization 99.2%"},
            "http-endpoint": {"status": "degraded", "latency_ms": 14500},
        },
        "summary": "Service experiencing severe memory pressure and frequent out-of-memory crashes",
    },
    "database": {
        "status": "healthy",
        "database_name": "analytics_db",
        "active_connections": 10,
        "max_connections": 100,
        "pool_utilization": 0.10,
        "waiting_queries": 0,
        "slow_queries_count": 0,
        "summary": "Database healthy.",
    },
    "metrics": {
        "service": "analytics-service",
        "error_rate": 0.72,
        "latency_p99_ms": 14500,
        "latency_p50_ms": 820,
        "cpu_utilization": 0.42,
        "memory_utilization": 0.99,
        "summary": "Memory utilization saturated at 99%; severe GC pauses driving P99 latency to 14.5s.",
    },
    "deployment": [
        {
            "service": "analytics-service",
            "version": "v3.0.1",
            "deployed_at": "2026-10-05T12:00:00Z",
            "status": "successful",
            "commit": "3c9102f",
        }
    ],
    "configuration": {
        "service": "analytics-service",
        "current": {"JVM_MAX_HEAP": "4g"},
        "recent_changes": [],
        "summary": "No recent configuration changes.",
    },
}

SCENARIO_CACHE_FAILURE: Dict[str, Any] = {
    "name": "cache-failure",
    "keywords": ["cache", "redis", "memcached", "eviction", "miss rate"],
    "logs": [
        {
            "timestamp": "2026-10-08T20:10:00Z",
            "level": "ERROR",
            "service": "catalog-service",
            "message": "RedisConnectionException: Connection timed out to redis-cluster:6379 after 3000ms",
            "context": {"target": "redis-cluster:6379"},
        },
        {
            "timestamp": "2026-10-08T20:10:15Z",
            "level": "WARN",
            "service": "catalog-service",
            "message": "Cache miss rate surged to 99.4%; falling back directly to primary database",
            "context": {"miss_rate": 0.994},
        },
    ],
    "health": {
        "status": "degraded",
        "service": "catalog-service",
        "healthy": False,
        "checks": {
            "redis-cache": {"status": "failing", "message": "Cluster unreachable"},
            "database": {"status": "degraded", "message": "Elevated load from cache bypass"},
        },
        "summary": "Cache cluster unreachable, triggering complete cache miss storm",
    },
    "database": {
        "status": "degraded",
        "database_name": "catalog_db",
        "active_connections": 65,
        "max_connections": 100,
        "pool_utilization": 0.65,
        "waiting_queries": 12,
        "slow_queries_count": 18,
        "summary": "Database load elevated due to upstream cache misses.",
    },
    "metrics": {
        "service": "catalog-service",
        "error_rate": 0.28,
        "latency_p99_ms": 4200,
        "latency_p50_ms": 450,
        "cpu_utilization": 0.68,
        "memory_utilization": 0.45,
        "summary": "Cache cluster offline causing query storm on database and elevated response latency.",
    },
    "deployment": [
        {
            "service": "catalog-service",
            "version": "v2.0.4",
            "deployed_at": "2026-10-04T10:00:00Z",
            "status": "successful",
            "commit": "81ab22d",
        }
    ],
    "configuration": {
        "service": "catalog-service",
        "current": {"REDIS_TIMEOUT_MS": "3000"},
        "recent_changes": [],
        "summary": "No configuration changes.",
    },
}

ALL_SCENARIOS = [
    SCENARIO_PAYMENT_DB_POOL,
    SCENARIO_HIGH_LATENCY,
    SCENARIO_BAD_DEPLOYMENT,
    SCENARIO_AUTH_CONFIG,
    SCENARIO_DEPENDENCY_LATENCY,
    SCENARIO_QUEUE_BACKLOG,
    SCENARIO_MEMORY_PRESSURE,
    SCENARIO_CACHE_FAILURE,
    SCENARIO_BASELINE_NORMAL,
]


def match_scenario(title: str, description: str = "", service: str = "") -> Dict[str, Any]:
    """Matches deterministic regression scenario or returns baseline normal when no match found."""
    text = f"{title} {description} {service}".lower()

    best_scenario = SCENARIO_BASELINE_NORMAL
    best_score = 0

    for scenario in ALL_SCENARIOS:
        if scenario["name"] == "baseline-normal":
            continue
        score = sum(1 for kw in scenario.get("keywords", []) if kw in text)
        if score > best_score:
            best_score = score
            best_scenario = scenario

    return best_scenario


