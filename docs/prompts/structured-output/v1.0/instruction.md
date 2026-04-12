Respond in the following JSON format. Do not include any text outside the JSON block:

```json
{
  "summary": "Brief overall summary of findings in 1-2 sentences",
  "findings": [
    {
      "description": "Detailed description of this specific finding",
      "severity": "normal|mild|moderate|severe",
      "location": "Anatomical location (null if not applicable)"
    }
  ]
}
```

Rules:
- Include ALL findings, including normal/unremarkable ones
- Each finding must have exactly one severity level
- Location should use standard anatomical terminology
- Summary should be concise (under 300 characters)
- Minimum 1 finding, even for normal studies
