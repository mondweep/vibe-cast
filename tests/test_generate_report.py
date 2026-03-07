"""Tests for server/tools/generate_report.py.

London School TDD: File I/O uses a temp directory.
"""

import os
import tempfile
from unittest.mock import patch

import pytest

from server.tools.generate_report import generate_report


@pytest.fixture
def sample_report_data():
    """Complete data set for report generation."""
    return {
        "target_company": {
            "name": "Stripe",
            "domain": "stripe.com",
            "description": "Financial infrastructure platform for businesses.",
        },
        "sector": {
            "sector": "Financial Technology",
            "sub_sector": "Payments",
        },
        "competitors": [
            {
                "name": "Square",
                "domain": "squareup.com",
                "description": "Financial services and digital payments company.",
                "data": {
                    "pricing": "2.6% + 10c per transaction",
                    "products": "POS systems, Cash App, Square Online",
                    "market_position": "Strong SMB market presence",
                },
            },
            {
                "name": "Adyen",
                "domain": "adyen.com",
                "description": "Global payment platform.",
                "data": {
                    "pricing": "Interchange++ pricing model",
                    "products": "Unified commerce platform",
                    "market_position": "Enterprise-focused",
                },
            },
        ],
        "target_data": {
            "pricing": "2.9% + 30c per successful charge",
            "products": "Payments, Billing, Connect, Atlas",
            "marketing": "Developer-first positioning",
            "market_position": "Leading online payments processor",
        },
        "executive_summary": "Stripe leads in developer-focused payment processing.",
        "swot": {
            "strengths": "Strong developer ecosystem",
            "weaknesses": "Higher fees than some competitors",
            "opportunities": "Expanding into financial services",
            "threats": "Increasing competition from Adyen",
        },
        "recommendations": "Focus on enterprise expansion.",
    }


class TestGenerateReport:
    """Test generate_report with temp directory for file output."""

    @pytest.mark.asyncio
    async def test_returns_report_path_and_summary(self, sample_report_data):
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("server.tools.generate_report._OUTPUT_DIR", tmpdir):
                result = await generate_report(**sample_report_data)

        assert "report_path" in result
        assert result["report_path"].endswith(".md")
        assert "summary" in result
        assert "stripe" in result["report_path"].lower()

    @pytest.mark.asyncio
    async def test_report_file_contains_company_name(self, sample_report_data):
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("server.tools.generate_report._OUTPUT_DIR", tmpdir):
                result = await generate_report(**sample_report_data)

            content = open(result["report_path"]).read()

        assert "Stripe" in content

    @pytest.mark.asyncio
    async def test_report_file_contains_competitors(self, sample_report_data):
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("server.tools.generate_report._OUTPUT_DIR", tmpdir):
                result = await generate_report(**sample_report_data)

            content = open(result["report_path"]).read()

        assert "Square" in content
        assert "Adyen" in content

    @pytest.mark.asyncio
    async def test_report_file_contains_sector(self, sample_report_data):
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("server.tools.generate_report._OUTPUT_DIR", tmpdir):
                result = await generate_report(**sample_report_data)

            content = open(result["report_path"]).read()

        assert "Financial Technology" in content

    @pytest.mark.asyncio
    async def test_handles_missing_optional_fields(self):
        minimal_data = {
            "target_company": {"name": "TestCo", "domain": "test.com", "description": ""},
            "sector": {"sector": "Tech"},
            "competitors": [],
            "target_data": {},
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("server.tools.generate_report._OUTPUT_DIR", tmpdir):
                result = await generate_report(**minimal_data)

        assert "report_path" in result

    @pytest.mark.asyncio
    async def test_summary_is_concise(self, sample_report_data):
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("server.tools.generate_report._OUTPUT_DIR", tmpdir):
                result = await generate_report(**sample_report_data)

        assert len(result["summary"]) < 500
