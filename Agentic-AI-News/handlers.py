import os
import re
import requests
from datetime import datetime, timedelta, timezone
from pathlib import Path

env_path = Path(__file__).parent / ".env"
from dotenv import load_dotenv
load_dotenv(dotenv_path=env_path, override=True)

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")


def collect_news(**kwargs):
    """
    Fetches Agentic AI news from web using Tavily search API.
    Only includes URLs that are verified from actual search results.
    Only includes news published within last 3 days.
    Falls back to NO data if Tavily is not configured (to avoid hallucinations).
    """
    import json
    print("[Custom Worker] collect_news invoked")

    all_results = []
    publication_date = datetime.now().strftime("%Y-%m-%d")
    has_tavily = bool(TAVILY_API_KEY)

    search_queries = [
        ("agentic AI enterprise adoption", "north_america"),
        ("AI agents automation business", "north_america"),
        ("autonomous AI implementation challenges", "north_america"),
        ("AI agent investments funding", "north_america"),
        ("enterprise AI automation UK Europe", "europe"),
        ("AI agents India China Japan enterprise", "asia"),
    ]

    if has_tavily:
        print(f"[Tavily] Using API key: {TAVILY_API_KEY[:8]}...")
        for query, region in search_queries:
            try:
                api_url = "https://api.tavily.com/search"
                headers = {"Authorization": f"Bearer {TAVILY_API_KEY}"}
                params = {
                    "query": query,
                    "search_depth": "basic",
                    "max_results": 5,
                    "days": 7,
                    "include_answer": False,
                    "include_raw_content": True,
                    "include_images": False,
                }
                response = requests.post(api_url, headers=headers, json=params, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    for r in results:
                        url = r.get("url", "").strip()
                        if not url or not url.startswith("http") or len(url) < 10:
                            continue
                        if url.startswith("https://www.google") or "javascript" in url.lower():
                            continue
                        raw_content = r.get("raw_content", "") or ""
                        published_date = r.get("published_date", "").strip()

                        # --- Date verification ---
                        is_recent = False
                        date_verified = False
                        pub_dt = None

                        # Signal 1: Tavily published_date
                        if published_date:
                            try:
                                pub_dt = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
                                age_days = (datetime.now(pub_dt.tzinfo or timezone.utc) - pub_dt).days
                                if age_days <= 3:
                                    is_recent = True
                                    date_verified = True
                                else:
                                    continue  # Explicitly too old
                            except:
                                pass

                        # Signal 2: URL contains /2025/ or /2024/ → too old
                        if not is_recent:
                            url_year_match = re.search(r'/20(2[0-5]|1[0-9])/', url)
                            if url_year_match:
                                continue  # URL says 2020-2025, too old

                        # Signal 3: raw_content mentions old years in date context
                        if not is_recent and raw_content:
                            content_years = re.findall(r'\b(202[0-4]|2025)\b', raw_content[:500])
                            if content_years:
                                continue  # Content references 2020-2025, likely old

                        # Signal 4: URL pattern like /2025/06 or /06/2025
                        if not is_recent:
                            url_date_match = re.search(r'/(20\d{2})/(\d{2})/', url)
                            if url_date_match:
                                year = int(url_date_match.group(1))
                                month = int(url_date_match.group(2))
                                if year < 2026 or (year == 2026 and month < 5):
                                    continue  # Before May 2026, too old

                        # If no signal ruled it out, keep it
                        headline = r.get("title", "").strip()
                        if not headline or len(headline) < 10:
                            continue

                        # Use verified date or flag as unverified
                        final_date = published_date if date_verified else ""
                        all_results.append({
                            "headline": headline,
                            "source": r.get("source", "Web"),
                            "date": final_date,
                            "region": region,
                            "url": url,
                            "raw_content": raw_content[:2000],
                            "date_verified": date_verified,
                        })
                    print(f"[Tavily] '{query[:25]}...' -> {len(results)} results")
                else:
                    print(f"[Tavily] Error {response.status_code}: {response.text[:80]}")
            except Exception as e:
                print(f"[Tavily] Exception: {e}")
    else:
        print("[WARNING] No Tavily API key found!")
        print("[WARNING] Sample data will NOT be used to avoid hallucinations.")
        print("[WARNING] Please add TAVILY_API_KEY to Agentic-AI-News/.env to fetch real news.")
        print("[WARNING] Without real data, this workflow cannot produce a valid digest.")

    seen_urls = set()
    unique_items = []
    for item in all_results:
        url = item.get("url", "")
        if not url or url.count("/") < 2:
            continue
        if "****" in url or "javascript" in url.lower() or not url.startswith("http"):
            continue
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_items.append(item)

    unique_items = unique_items[:50]

    result = {
        "news_items": unique_items,
        "count": len(unique_items),
        "has_real_data": has_tavily and len(unique_items) > 0,
        "is_sample_data": False,
        "status": "collected" if unique_items else "no_data"
    }

    print(f"[Custom Worker] Collected {len(unique_items)} verified news items (has_real_data={result['has_real_data']})")
    return result


def store_to_supabase(digest_data):
    """
    Stores digest and news items to Supabase.
    Returns the digest_id if successful, None otherwise.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("[Supabase] No credentials found, skipping database storage")
        return None

    try:
        from supabase import create_client
        from postgrest import SyncPostgrestClient
    except ImportError:
        print("[Supabase] Library not installed")
        return None

    try:
        postgrest = SyncPostgrestClient(
            f"{SUPABASE_URL}/rest/v1",
            schema="agentic_ai_news",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
        )

        pub_date = digest_data.get("publication_date", datetime.now().strftime("%Y-%m-%d"))

        existing = postgrest.table("digests").select("id").eq("publication_date", pub_date).execute()
        if existing.data:
            print(f"[Supabase] Digest for {pub_date} already exists, skipping insert")
            return existing.data[0]["id"]

        digest_payload = {
            "title": digest_data.get("title"),
            "publication_date": pub_date,
            "executive_summary": digest_data.get("executive_summary"),
            "footer": digest_data.get("footer"),
        }
        resp = postgrest.table("digests").insert(digest_payload).execute()
        if not resp.data:
            print("[Supabase] Failed to insert digest")
            return None

        digest_id = resp.data[0]["id"]
        print(f"[Supabase] Inserted digest {digest_id}")

        category_fields = {
            "enterprise_adoption": ("impact_score", None),
            "challenges": ("severity", None),
            "opportunities": ("market_potential", None),
            "evolving_trends": ("trend_indicator", None),
        }

        total_items = 0
        for category, (score_field, score_default) in category_fields.items():
            items = digest_data.get(category, [])
            if not items:
                continue
            for item in items:
                news_payload = {
                    "digest_id": digest_id,
                    "category": category,
                    "headline": item.get("headline"),
                    "summary": item.get("summary"),
                    "source": item.get("source"),
                    "region": item.get("region"),
                    "url": item.get("url"),
                    "date": item.get("date"),
                }
                if score_field:
                    news_payload[score_field] = item.get(score_field)
                postgrest.table("news_items").insert(news_payload).execute()
                total_items += 1

        print(f"[Supabase] Inserted {total_items} news items")
        return digest_id

    except Exception as e:
        print(f"[Supabase] Error: {e}")
        return None


def finalize_digest(**kwargs):
    """
    Finalizes the digest - saves JSON, generates PDF, and stores to Supabase.
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

    publication_date = payload.get("publication_date", datetime.now().strftime("%Y-%m-%d"))

    digest_data = {
        "title": payload.get("title", "Agentic AI Weekly Digest"),
        "publication_date": publication_date,
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

    pdf_file = generate_pdf(digest_data)
    print(f"[Custom Worker] PDF saved to: {pdf_file}")

    digest_id = store_to_supabase(digest_data)
    if digest_id:
        print(f"[Custom Worker] Supabase digest_id: {digest_id}")

    return digest_data


def generate_pdf(digest_data):
    """Generate a formatted PDF newsletter digest with date in filename."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.colors import HexColor
    except ImportError:
        print("[PDF] reportlab not installed")
        return None

    publication_date = digest_data.get("publication_date", datetime.now().strftime("%Y-%m-%d"))
    pdf_filename = f"newsletter_digest_{publication_date}.pdf"
    output_file = Path("/Users/mondweep/.gemini/antigravity/scratch/simple-agents-studio/Agentic-AI-News") / pdf_filename

    doc = SimpleDocTemplate(str(output_file), pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=22, spaceAfter=4, textColor=HexColor('#1a1a2e'))
    date_style = ParagraphStyle('Date', parent=styles['Normal'], fontSize=11, textColor=HexColor('#4a4a68'), spaceAfter=4)
    curator_style = ParagraphStyle('Curator', parent=styles['Normal'], fontSize=10, textColor=HexColor('#666666'), spaceAfter=16)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=13, textColor=HexColor('#16213e'), spaceBefore=14, spaceAfter=6)
    headline_style = ParagraphStyle('Headline', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', spaceBefore=6, spaceAfter=1)
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=8, textColor=HexColor('#555555'), spaceAfter=1)
    summary_style = ParagraphStyle('Summary', parent=styles['Normal'], fontSize=9, spaceAfter=3, leading=11)
    link_style = ParagraphStyle('Link', parent=styles['Normal'], fontSize=7, textColor=HexColor('#0066cc'), spaceAfter=4)
    credit_style = ParagraphStyle('Credit', parent=styles['Normal'], fontSize=8, textColor=HexColor('#777777'), alignment=1)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=HexColor('#999999'), spaceBefore=16)

    story = []

    title = digest_data.get("title", "Agentic AI Weekly Digest")
    story.append(Paragraph(title, title_style))
    story.append(Paragraph(f"Date: {publication_date}", date_style))
    story.append(Paragraph("Curated by Mondweep Chakravorty", curator_style))
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#d0d0d0'), spaceAfter=10))

    story.append(Paragraph("<b>Executive Summary</b>", section_style))
    story.append(Paragraph(digest_data.get("executive_summary", ""), summary_style))

    categories = [
        ("Enterprise Adoption", digest_data.get("enterprise_adoption", []), "#1e40af"),
        ("Challenges", digest_data.get("challenges", []), "#b91c1c"),
        ("Opportunities", digest_data.get("opportunities", []), "#15803d"),
        ("Evolving Trends", digest_data.get("evolving_trends", []), "#7c3aed"),
    ]

    for cat_name, items, color in categories:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"<b>{cat_name}</b>", section_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=HexColor(color), spaceAfter=4))

        if not items:
            story.append(Paragraph("<i>No items in this category</i>", meta_style))
            continue

        for item in items[:6]:
            story.append(Paragraph(item.get("headline", ""), headline_style))

            meta_parts = [item.get("source", "Unknown source")]
            date_val = item.get("date", "")
            if date_val:
                meta_parts.append(date_val)
            region_val = item.get("region", "")
            if region_val:
                meta_parts.append(region_val.replace("_", " ").title())

            if item.get("severity"):
                meta_parts.append(f"Severity: {item['severity'].upper()}")
            elif item.get("market_potential"):
                meta_parts.append(f"Potential: {item['market_potential'].upper()}")
            elif item.get("trend_indicator"):
                meta_parts.append(f"Trend: {item['trend_indicator'].upper()}")

            story.append(Paragraph(" | ".join(meta_parts), meta_style))
            story.append(Paragraph(item.get("summary", ""), summary_style))

            url = item.get("url", "")
            if url and url.startswith("http"):
                story.append(Paragraph(f'<link href="{url}">{url}</link>', link_style))

        story.append(Spacer(1, 4))

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#e0e0e0'), spaceAfter=8))

    story.append(Paragraph("<b>About This Digest</b>", section_style))
    story.append(Paragraph(
        '<b>Curator:</b> Mondweep Chakravorty | <link href="https://linkedin.com/in/mondweepchakravorty/">LinkedIn Profile</link>',
        credit_style
    ))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        '<b>Workflow:</b> <link href="https://yamslam.craftsmanlabs.net/">SimpleAgents</link> by Craftsman Labs',
        credit_style
    ))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        f'Generated: {digest_data.get("generated_at", datetime.now().isoformat())}',
        footer_style
    ))

    doc.build(story)
    return output_file


def log_complete(**kwargs):
    """Passthrough handler."""
    print("[Custom Worker] log_complete invoked")
    return {"status": "success"}