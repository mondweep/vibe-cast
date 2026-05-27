def filter_top_news(**kwargs):
    """
    Filters news to select top items per category based on impact/severity/market potential scores.
    Limits total to 50 items across all categories.
    """
    import json
    print("[Custom Worker] filter_top_news invoked")
    payload = kwargs.get("payload", {})
    categories = payload.get("categories", {})
    max_per_category = payload.get("max_per_category", 12)
    max_total = payload.get("max_total", 50)

    filtered = {}

    for category, items in categories.items():
        if isinstance(items, list):
            if category == "enterprise_adoption":
                sorted_items = sorted(items, key=lambda x: x.get("impact_score", 0), reverse=True)
            elif category == "challenges":
                severity_order = {"high": 3, "medium": 2, "low": 1}
                sorted_items = sorted(items, key=lambda x: severity_order.get(x.get("severity", "low"), 0), reverse=True)
            elif category == "opportunities":
                potential_order = {"high": 3, "medium": 2, "low": 1}
                sorted_items = sorted(items, key=lambda x: potential_order.get(x.get("market_potential", "low"), 0), reverse=True)
            elif category == "evolving_trends":
                trend_order = {"emerging": 3, "growing": 2, "maturing": 1}
                sorted_items = sorted(items, key=lambda x: trend_order.get(x.get("trend_indicator", "maturing"), 0), reverse=True)
            else:
                sorted_items = items[:max_per_category]

            filtered[category] = sorted_items[:max_per_category]
        else:
            filtered[category] = []

    total_count = sum(len(v) for v in filtered.values())

    if total_count > max_total:
        excess = total_count - max_total
        for category in list(filtered.keys()):
            if excess > 0 and len(filtered[category]) > 8:
                removed = min(len(filtered[category]) - 8, excess)
                filtered[category] = filtered[category][:-removed]
                excess -= removed

    result = {
        "filtered_news": filtered,
        "total_count": sum(len(v) for v in filtered.values()),
        "status": "filtered"
    }
    print(f"[Custom Worker] Filtered to {result['total_count']} items")
    return result


def finalize_digest(**kwargs):
    """
    Finalizes the digest - saves to file and logs completion.
    """
    import json
    from datetime import datetime
    print("[Custom Worker] finalize_digest invoked")
    payload = kwargs.get("payload", {})
    digest = payload.get("digest", {})

    output = {
        "status": "complete",
        "generated_at": datetime.now().isoformat(),
        "title": digest.get("title", "Agentic AI Weekly Digest"),
        "publication_date": digest.get("publication_date", datetime.now().strftime("%Y-%m-%d"))
    }

    print(f"[Custom Worker] Digest finalized: {output['title']}")
    return output


def log_complete(**kwargs):
    """
    Passthrough terminal custom worker handler.
    """
    print("[Custom Worker] log_complete invoked")
    return {"status": "success"}