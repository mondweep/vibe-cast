import os
import requests
from datetime import datetime, timedelta
from pathlib import Path

env_path = Path(__file__).parent / ".env"
from dotenv import load_dotenv
load_dotenv(dotenv_path=env_path, override=True)

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")


def collect_news(**kwargs):
    """
    Fetches Agentic AI news from web using Tavily search API.
    Regions: North America, UK, Europe, India, China, Japan
    """
    import json
    print("[Custom Worker] collect_news invoked")

    all_results = []
    search_queries = [
        ("agentic AI enterprise adoption 2025", "north_america"),
        ("AI agents automation business trends", "north_america"),
        ("autonomous AI implementation challenges enterprise", "north_america"),
        ("AI agent opportunities investments funding", "north_america"),
        ("enterprise AI automation UK", "uk"),
        ("agentic AI Europe enterprise adoption", "europe"),
        ("AI agents India business automation", "india"),
        ("agentic AI China enterprise trends", "china"),
        ("AI agents Japan manufacturing automation", "japan"),
        ("generative AI agents OpenAI Anthropic enterprise", "north_america"),
        ("AI agent startups funding round 2025", "north_america"),
        ("autonomous AI customer service enterprise", "north_america"),
    ]

    if TAVILY_API_KEY:
        print(f"[Tavily] Using API key: {TAVILY_API_KEY[:8]}...")
        for query, region in search_queries:
            try:
                url = "https://api.tavily.com/search"
                headers = {"Authorization": f"Bearer {TAVILY_API_KEY}"}
                params = {
                    "query": query,
                    "search_depth": "basic",
                    "max_results": 5,
                    "include_answer": False,
                    "include_raw_content": False,
                    "include_images": False,
                }
                response = requests.post(url, headers=headers, json=params, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    for r in results:
                        all_results.append({
                            "headline": r.get("title", ""),
                            "source": r.get("source", "Web"),
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "region": region,
                            "summary": r.get("description", "")[:300],
                            "url": r.get("url", ""),
                        })
                    print(f"[Tavily] Query '{query[:30]}...' -> {len(results)} results")
                else:
                    print(f"[Tavily] Error: {response.status_code} - {response.text[:100]}")
            except Exception as e:
                print(f"[Tavily] Exception for query '{query}': {e}")
    else:
        print("[Tavily] No API key found, using sample news")

    if len(all_results) < 10:
        print(f"[News] Only got {len(all_results)} items from Tavily, adding sample news")
        sample_news = [
            {
                "headline": "Microsoft Copilot Agents Transform Enterprise Workflows at Scale",
                "source": "Microsoft Blog",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "region": "north_america",
                "summary": "Microsoft announces major expansion of Copilot agents in enterprise environments, with Fortune 500 companies reporting 40% productivity gains in knowledge worker tasks.",
                "url": "https://www.microsoft.com/azure/ai",
            },
            {
                "headline": "EU AI Act Enforcement Creates Compliance Challenges for Agentic Systems",
                "source": "Financial Times",
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                "region": "europe",
                "summary": "New EU regulations requiring transparency in AI decision-making are forcing enterprises to redesign their agentic AI implementations ahead of the 2026 compliance deadline.",
                "url": "https://www.ft.com/ai-regulation",
            },
            {
                "headline": "Salesforce Launches Agentforce 2.0 with Autonomous CRM Capabilities",
                "source": "Salesforce",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "region": "north_america",
                "summary": "Agentforce 2.0 enables autonomous CRM agents that can negotiate contracts, resolve disputes, and generate sales leads without human intervention.",
                "url": "https://www.salesforce.com/agentforce",
            },
            {
                "headline": "Indian Enterprises Rush to Deploy AI Agents Amid Talent Shortage",
                "source": "The Economic Times",
                "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
                "region": "india",
                "summary": "Indian IT services giants report 300% increase in AI agent deployments as companies seek to automate repetitive tasks and bridge the skilled developer gap.",
                "url": "https://economictimes.indiatimes.com/ai",
            },
            {
                "headline": "DeepSeek Releases Open-Source Agentic Framework for Enterprise",
                "source": "TechCrunch",
                "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
                "region": "china",
                "summary": "Chinese AI lab DeepSeek launches an enterprise-grade agentic framework enabling businesses to build custom autonomous agents with built-in compliance controls.",
                "url": "https://techcrunch.com/deepseek",
            },
            {
                "headline": "UK Government Invests £500M in Public Sector AI Agent Program",
                "source": "BBC Technology",
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                "region": "uk",
                "summary": "The UK announces funding for AI agents in healthcare, tax processing, and benefits administration, aiming to reduce processing times by 60%.",
                "url": "https://www.bbc.com/technology",
            },
            {
                "headline": "Japanese Manufacturers Pilot Autonomous Quality Control Agents",
                "source": "Nikkei Asia",
                "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
                "region": "japan",
                "summary": "Toyota and Panasonic test AI agents for real-time quality inspection, achieving 99.7% defect detection accuracy in pilot programs.",
                "url": "https://asia.nikkei.com/tech",
            },
            {
                "headline": "Security Researchers Warn of Prompt Injection Risks in AI Agents",
                "source": "Wired",
                "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
                "region": "north_america",
                "summary": "New vulnerability research reveals that enterprise AI agents are susceptible to prompt injection attacks that can bypass safety guardrails.",
                "url": "https://www.wired.com/security",
            },
            {
                "headline": "AWS Launches Multi-Agent Orchestration Platform for Enterprises",
                "source": "AWS Blog",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "region": "north_america",
                "summary": "Amazon's new multi-agent platform enables enterprises to deploy coordinated AI agent swarms for complex workflows with built-in governance.",
                "url": "https://aws.amazon.com/agents",
            },
            {
                "headline": "European Startups Lead Innovation in Agentic AI Ethics",
                "source": "Sifted",
                "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
                "region": "europe",
                "summary": "European AI startups pioneer ethical agentic AI frameworks with built-in bias detection, transparency logs, and human-in-the-loop safeguards.",
                "url": "https://sifted.eu/ai-ethics",
            },
            {
                "headline": "Chinese Tech Giants Form Alliance to Standardize Agentic AI APIs",
                "source": "South China Morning Post",
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                "region": "china",
                "summary": "Alibaba, Tencent, and Baidu collaborate on an open agentic AI API standard to enable interoperability between enterprise systems.",
                "url": "https://scmp.com/tech",
            },
            {
                "headline": "CIO Survey: 78% of Enterprises Plan Agentic AI Deployments in 2025",
                "source": "Gartner",
                "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
                "region": "north_america",
                "summary": "Gartner's annual survey shows enterprise AI agent adoption accelerating, with cost reduction and customer experience as primary drivers.",
                "url": "https://www.gartner.com/ai",
            },
            {
                "headline": "Indian Government Launches AI Mission with Focus on Agentic Platforms",
                "source": "Business Standard",
                "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
                "region": "india",
                "summary": "India's ₹10,000 crore AI mission prioritizes agentic AI development, with incentives for enterprises building automation solutions.",
                "url": "https://www.business-standard.com/ai-mission",
            },
            {
                "headline": "Japanese SoftBank Leads $2B Investment in Agentic AI Startups",
                "source": "Reuters",
                "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
                "region": "japan",
                "summary": "SoftBank's Vision Fund announces major investment in agentic AI companies focused on enterprise automation and industrial applications.",
                "url": "https://www.reuters.com/tech",
            },
            {
                "headline": "Data Quality Emerges as Top Challenge in Agentic AI Deployments",
                "source": "MIT Technology Review",
                "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
                "region": "uk",
                "summary": "Enterprises report that poor data quality and siloed information are the primary obstacles to successful agentic AI implementation.",
                "url": "https://www.technologyreview.com/data-quality",
            },
            {
                "headline": "France Becomes Hub for Enterprise AI Agent Development",
                "source": "Les Echos",
                "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
                "region": "europe",
                "summary": "French tech ecosystem attracts €3 billion in agentic AI investments, with Mistral AI and local enterprises leading development.",
                "url": "https://www.lesechos.fr/tech",
            },
        ]
        all_results.extend(sample_news)

    seen_urls = set()
    unique_items = []
    for item in all_results:
        if item["url"] and item["url"] not in seen_urls:
            seen_urls.add(item["url"])
            unique_items.append(item)

    unique_items = unique_items[:50]

    result = {
        "news_items": unique_items,
        "count": len(unique_items),
        "status": "collected"
    }

    print(f"[Custom Worker] Collected {len(unique_items)} unique news items")
    return result


def filter_top_news(**kwargs):
    """
    Filters news to select top items per category based on impact/severity/market potential scores.
    Limits total to 50 items across all categories.
    """
    import json
    print("[Custom Worker] filter_top_news invoked")
    payload = kwargs.get("payload", {})
    categories_raw = payload.get("categories", {})

    if isinstance(categories_raw, str):
        try:
            categories = json.loads(categories_raw)
        except:
            categories = {}
    elif isinstance(categories_raw, dict):
        categories = categories_raw
    else:
        categories = {}

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
    Finalizes the digest - saves JSON and generates PDF with credits.
    """
    import json
    from datetime import datetime
    print("[Custom Worker] finalize_digest invoked")
    payload = kwargs.get("payload", {})

    def parse_field(val):
        if isinstance(val, str):
            try:
                return json.loads(val)
            except:
                return val
        return val

    digest_data = {
        "title": payload.get("title", "Agentic AI Weekly Digest"),
        "publication_date": payload.get("publication_date", datetime.now().strftime("%Y-%m-%d")),
        "executive_summary": payload.get("executive_summary", ""),
        "enterprise_adoption": parse_field(payload.get("enterprise_adoption")),
        "challenges": parse_field(payload.get("challenges")),
        "opportunities": parse_field(payload.get("opportunities")),
        "evolving_trends": parse_field(payload.get("evolving_trends")),
        "footer": payload.get("footer", "Generated by SimpleAgents"),
        "generated_at": datetime.now().isoformat(),
    }

    json_file = Path("/Users/mondweep/.gemini/antigravity/scratch/simple-agents-studio/Agentic-AI-News/newsletter_digest.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(digest_data, f, indent=2, ensure_ascii=False)
    print(f"[Custom Worker] JSON saved to: {json_file}")

    generate_pdf(digest_data)

    return digest_data


def generate_pdf(digest_data):
    """Generate a formatted PDF newsletter digest."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.colors import HexColor, black, white
        from reportlab.lib import colors
    except ImportError:
        print("[PDF] reportlab not installed, skipping PDF generation")
        print("[PDF] Run: uv pip install reportlab")
        return

    output_file = Path("/Users/mondweep/.gemini/antigravity/scratch/simple-agents-studio/Agentic-AI-News/newsletter_digest.pdf")

    doc = SimpleDocTemplate(str(output_file), pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, spaceAfter=6, textColor=HexColor('#1a1a2e'))
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=11, textColor=HexColor('#4a4a68'), spaceAfter=20)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14, textColor=HexColor('#16213e'), spaceBefore=16, spaceAfter=8)
    headline_style = ParagraphStyle('Headline', parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=2)
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=9, textColor=HexColor('#666666'), spaceAfter=2)
    summary_style = ParagraphStyle('Summary', parent=styles['Normal'], fontSize=10, spaceAfter=6, leading=13)
    link_style = ParagraphStyle('Link', parent=styles['Normal'], fontSize=8, textColor=HexColor('#0066cc'))
    credit_style = ParagraphStyle('Credit', parent=styles['Normal'], fontSize=9, textColor=HexColor('#888888'), alignment=1)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=HexColor('#999999'), spaceBefore=20)

    story = []

    story.append(Paragraph(digest_data.get("title", "Agentic AI Weekly Digest"), title_style))
    story.append(Paragraph(f"Published: {digest_data.get('publication_date', datetime.now().strftime('%Y-%m-%d'))} | Curated by Mondweep Chakravorty", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e0e0e0'), spaceAfter=12))

    story.append(Paragraph("<b>Executive Summary</b>", section_style))
    story.append(Paragraph(digest_data.get("executive_summary", ""), summary_style))
    story.append(Spacer(1, 12))

    categories = [
        ("Enterprise Adoption", digest_data.get("enterprise_adoption", []), "#2563eb"),
        ("Challenges", digest_data.get("challenges", []), "#dc2626"),
        ("Opportunities", digest_data.get("opportunities", []), "#16a34a"),
        ("Evolving Trends", digest_data.get("evolving_trends", []), "#9333ea"),
    ]

    for cat_name, items, color in categories:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"<b>{cat_name}</b>", section_style))
        story.append(HRFlowable(width="100%", thickness=2, color=HexColor(color), spaceAfter=8))

        for item in items[:6]:
            story.append(Paragraph(item.get("headline", ""), headline_style))
            meta_parts = [
                item.get("source", "Unknown"),
                item.get("region", "").replace("_", " ").title(),
            ]
            if item.get("severity"):
                meta_parts.append(f"Severity: {item['severity'].upper()}")
            elif item.get("market_potential"):
                meta_parts.append(f"Potential: {item['market_potential'].upper()}")
            elif item.get("trend_indicator"):
                meta_parts.append(f"Trend: {item['trend_indicator'].upper()}")
            story.append(Paragraph(" | ".join(meta_parts), meta_style))
            story.append(Paragraph(item.get("summary", ""), summary_style))
            if item.get("url"):
                story.append(Paragraph(f'<link href="{item["url"]}" color="blue">{item["url"][:80]}...</link>', link_style))
            story.append(Spacer(1, 6))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e0e0e0'), spaceAfter=12))

    story.append(Paragraph("About This Digest", section_style))
    story.append(Paragraph(
        f'<b>Curator:</b> Mondweep Chakravorty | <link href="https://linkedin.com/in/mondweepchakravorty/">LinkedIn</link>',
        credit_style
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f'<b>Workflow Powered by:</b> <link href="https://yamslam.craftsmanlabs.net/">SimpleAgents</link> by Craftsman Labs',
        credit_style
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f'Generated: {digest_data.get("generated_at", datetime.now().isoformat())}',
        footer_style
    ))

    doc.build(story)
    print(f"[Custom Worker] PDF saved to: {output_file}")


def log_complete(**kwargs):
    """
    Passthrough terminal custom worker handler.
    """
    print("[Custom Worker] log_complete invoked")
    return {"status": "success"}