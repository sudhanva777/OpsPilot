from langgraph.graph import StateGraph, START, END
from ..models.state import InvestigationGraphState
from .nodes import (
    GraphNodeContext,
    create_load_incident_node,
    create_plan_investigation_node,
    create_collect_logs_node,
    create_collect_health_node,
    create_collect_database_node,
    create_collect_metrics_node,
    create_collect_deployment_node,
    create_collect_configuration_node,
    create_analyze_evidence_node,
    create_evaluate_hypotheses_node,
    create_generate_recommendation_node,
    create_validate_result_node,
    create_finalize_investigation_node,
)


def build_investigation_graph(ctx: GraphNodeContext):
    """Assembles and compiles the full LangGraph investigation state machine."""
    workflow = StateGraph(InvestigationGraphState)

    # 1. Register Nodes
    workflow.add_node("load_incident", create_load_incident_node(ctx))
    workflow.add_node("plan_investigation", create_plan_investigation_node(ctx))
    workflow.add_node("collect_logs", create_collect_logs_node(ctx))
    workflow.add_node("collect_health", create_collect_health_node(ctx))
    workflow.add_node("collect_database", create_collect_database_node(ctx))
    workflow.add_node("collect_metrics", create_collect_metrics_node(ctx))
    workflow.add_node("collect_deployment", create_collect_deployment_node(ctx))
    workflow.add_node("collect_configuration", create_collect_configuration_node(ctx))
    workflow.add_node("analyze_evidence", create_analyze_evidence_node(ctx))
    workflow.add_node("evaluate_hypotheses", create_evaluate_hypotheses_node(ctx))
    workflow.add_node("generate_recommendation", create_generate_recommendation_node(ctx))
    workflow.add_node("validate_result", create_validate_result_node(ctx))
    workflow.add_node("finalize_investigation", create_finalize_investigation_node(ctx))

    # 2. Wire Control Flow
    workflow.add_edge(START, "load_incident")
    workflow.add_edge("load_incident", "plan_investigation")

    # Parallel evidence collection fan-out
    workflow.add_edge("plan_investigation", "collect_logs")
    workflow.add_edge("plan_investigation", "collect_health")
    workflow.add_edge("plan_investigation", "collect_database")
    workflow.add_edge("plan_investigation", "collect_metrics")
    workflow.add_edge("plan_investigation", "collect_deployment")
    workflow.add_edge("plan_investigation", "collect_configuration")

    # Fan-in aggregation to evidence analysis
    workflow.add_edge("collect_logs", "analyze_evidence")
    workflow.add_edge("collect_health", "analyze_evidence")
    workflow.add_edge("collect_database", "analyze_evidence")
    workflow.add_edge("collect_metrics", "analyze_evidence")
    workflow.add_edge("collect_deployment", "analyze_evidence")
    workflow.add_edge("collect_configuration", "analyze_evidence")

    # Evidence synthesis & RCA reasoning pipeline
    workflow.add_edge("analyze_evidence", "evaluate_hypotheses")
    workflow.add_edge("evaluate_hypotheses", "generate_recommendation")
    workflow.add_edge("generate_recommendation", "validate_result")
    workflow.add_edge("validate_result", "finalize_investigation")
    workflow.add_edge("finalize_investigation", END)

    return workflow.compile()
