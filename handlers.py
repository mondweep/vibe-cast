def process_support(**kwargs):
    """
    Mock support processing handler for the custom_worker workflow node.
    Accepts arbitrary kwargs representing the config.payload interpolated by SimpleAgents.
    """
    print("[Custom Worker] process_support invoked with payload:", kwargs)
    payload = kwargs.get("payload", {})
    urgency = payload.get("urgency", "medium")
    sentiment = payload.get("sentiment", "neutral")
    
    ticket_id = "TKT-884021"
    
    if urgency == "high" or sentiment == "negative":
        action_taken = "Escalated to Tier-2 Priority Support Team (SLA: 1 hour)"
    else:
        action_taken = "Routed to general support queue (SLA: 24 hours)"
        
    return {
        "status": "routed",
        "ticket_id": ticket_id,
        "action_taken": action_taken,
        "notes": f"Processed via python custom_worker. Urgency: {urgency}, Sentiment: {sentiment}."
    }

def log_complete(**kwargs):
    """
    Passthrough terminal custom worker handler for Gmail classification.
    """
    print("[Custom Worker] log_complete invoked")
    return {"status": "success"}
