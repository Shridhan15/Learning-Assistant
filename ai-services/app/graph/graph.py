
from dotenv import load_dotenv
load_dotenv()
from langgraph.graph import StateGraph, START, END

from app.graph.nodes import safety_guard_node,intent_prep_node,refusal_node,small_talk_node,query_rephrase_node,rag_retrieval_node,generation_node,persistence_node,route_intent,route_safety,out_of_scope_handler_node
from app.graph.state import TutorState


workflow = StateGraph(TutorState)

# Add Nodes
workflow.add_node("safety_guard", safety_guard_node)
workflow.add_node("intent_prep", intent_prep_node)
workflow.add_node("refusal", refusal_node)
workflow.add_node("small_talk", small_talk_node)
workflow.add_node("query_rephrase", query_rephrase_node)
workflow.add_node("rag_retrieval", rag_retrieval_node)
workflow.add_node("out_of_scope_handler", out_of_scope_handler_node)
workflow.add_node("generation", generation_node)
workflow.add_node("persistence", persistence_node)

# Add Edges
workflow.add_edge(START, "safety_guard")

# Step 1: Branch on Safety
workflow.add_conditional_edges(
    "safety_guard",
    route_safety,
    {
        "refusal": "refusal",
        "intent_prep": "intent_prep"
    }
)

# Step 2: Branch on Intent
workflow.add_conditional_edges(
    "intent_prep",
    route_intent,
    {
        "small_talk": "small_talk",
        "query_rephrase": "query_rephrase"
    }
)

# Connect the rest of the educational pipeline
workflow.add_edge("query_rephrase", "rag_retrieval")
workflow.add_conditional_edges(
    "rag_retrieval",
    lambda state: state["relevance"], # Checks the output of rag_retrieval_node
    {
        "relevant": "generation", 
        "irrelevant": "out_of_scope_handler" # Skips expensive generation!
    }
) 

# Re-converge to persistence
workflow.add_edge("generation", "persistence")
workflow.add_edge("small_talk", "persistence")
workflow.add_edge("out_of_scope_handler", "persistence")
workflow.add_edge("refusal", "persistence")
workflow.add_edge("persistence", END)

tutor_agent = workflow.compile()