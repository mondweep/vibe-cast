from app.services.analysis import parse_model_output


class TestParseModelOutput:
    def test_valid_json(self):
        raw = '{"summary": "Normal study", "findings": [{"description": "Clear lungs", "severity": "normal", "location": "Bilateral"}]}'
        summary, findings, success = parse_model_output(raw)
        assert success is True
        assert summary == "Normal study"
        assert len(findings) == 1
        assert findings[0].severity == "normal"
        assert findings[0].location == "Bilateral"

    def test_json_embedded_in_text(self):
        raw = 'Here is my analysis:\n```json\n{"summary": "Mild opacity", "findings": [{"description": "Right lower lobe opacity", "severity": "mild", "location": "Right lower lobe"}]}\n```'
        summary, findings, success = parse_model_output(raw)
        assert success is True
        assert "opacity" in summary.lower()

    def test_malformed_json_fallback(self):
        raw = '{"summary": "broken json, "findings": []'
        summary, findings, success = parse_model_output(raw)
        assert success is False
        assert len(findings) == 1
        assert findings[0].description == raw

    def test_no_json_fallback(self):
        raw = "This is a normal chest X-ray with no acute findings."
        summary, findings, success = parse_model_output(raw)
        assert success is False
        assert len(findings) == 1
        assert "normal chest" in findings[0].description.lower()

    def test_empty_string_fallback(self):
        summary, findings, success = parse_model_output("")
        assert success is False
        assert len(findings) == 1

    def test_json_with_empty_findings_fallback(self):
        raw = '{"summary": "Nothing found", "findings": []}'
        summary, findings, success = parse_model_output(raw)
        # Empty findings array triggers fallback
        assert success is False

    def test_multiple_findings(self):
        raw = '{"summary": "Multiple abnormalities", "findings": [{"description": "Cardiomegaly", "severity": "moderate", "location": "Heart"}, {"description": "Pleural effusion", "severity": "mild", "location": "Left costophrenic angle"}]}'
        summary, findings, success = parse_model_output(raw)
        assert success is True
        assert len(findings) == 2
        assert findings[0].severity == "moderate"
        assert findings[1].severity == "mild"
