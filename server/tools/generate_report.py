"""Report generation tool for the MCP server."""

import logging
import os
from datetime import datetime
from types import SimpleNamespace

import jinja2

logger = logging.getLogger(__name__)

_OUTPUT_DIR = os.getenv("OUTPUT_DIR", "output")
_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates")


async def generate_report(
    target_company: dict,
    sector: dict,
    competitors: list[dict],
    target_data: dict,
    executive_summary: str = "",
    swot: dict | None = None,
    recommendations: str = "",
) -> dict:
    """Generate a competitive analysis markdown report.

    Renders a Jinja2 template with all collected data and saves it
    to the output directory with a timestamped filename.

    Args:
        target_company: Dict with name, domain, description of the target.
        sector: Dict with sector, sub_sector.
        competitors: List of competitor dicts with name, domain, description, data.
        target_data: Dict with pricing, products, marketing, market_position.
        executive_summary: Executive summary text.
        swot: Dict with strengths, weaknesses, opportunities, threats.
        recommendations: Recommendations text.

    Returns:
        A dict with keys:
            - report_path (str): Path to the saved report file.
            - summary (str): Brief summary of the report.
    """
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    date_slug = datetime.now().strftime("%Y-%m-%d")

    # Make competitor data accessible via dot notation in template
    for comp in competitors:
        if "data" in comp and isinstance(comp["data"], dict):
            comp["data"] = SimpleNamespace(**comp["data"])

    # Collect failed categories
    categories_failed = []
    if isinstance(target_data, dict):
        target_data_ns = SimpleNamespace(**target_data)
    else:
        target_data_ns = target_data

    if swot and isinstance(swot, dict):
        swot = SimpleNamespace(**swot)

    # Load and render template
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(_TEMPLATE_DIR),
        undefined=jinja2.Undefined,
    )
    template = env.get_template("report.md.j2")

    report_content = template.render(
        target=SimpleNamespace(**target_company),
        sector=SimpleNamespace(**sector),
        competitors=competitors,
        target_data=target_data_ns,
        executive_summary=executive_summary or "No executive summary provided.",
        swot=swot,
        recommendations=recommendations,
        generated_at=generated_at,
        categories_failed=categories_failed,
    )

    # Save report
    company_slug = target_company["name"].lower().replace(" ", "_")
    filename = f"{company_slug}_{date_slug}.md"
    report_path = os.path.join(_OUTPUT_DIR, filename)

    os.makedirs(_OUTPUT_DIR, exist_ok=True)

    with open(report_path, "w") as f:
        f.write(report_content)

    # Generate brief summary
    summary = (
        f"Competitive analysis report for {target_company['name']} saved to {report_path}. "
        f"Analyzed {len(competitors)} competitors in the {sector.get('sector', 'Unknown')} sector."
    )

    return {
        "report_path": report_path,
        "summary": summary,
    }
