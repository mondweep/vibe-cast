# OpenClaw Security Hardening Skill — File Inventory

## Overview
Complete security hardening framework for self-hosted OpenClaw instances. Addresses January 2026 Shodan vulnerability (900+ exposed instances).

## Skill Structure

```
openclaw-security-hardening-skill/
├── SKILL.md              (8,964 bytes) — Full 5-step framework
├── README.md             (1,999 bytes) — Quick start guide
├── MANIFEST.md           (this file)   — File inventory
├── guides/
│   ├── STEP_1_AUDIT.md              — Exposure audit checklist
│   ├── STEP_2_PORT_CLOSURE.md       — AWS Security Group hardening
│   ├── STEP_3_GATEWAY_AUTH.md       — Token authentication setup
│   ├── STEP_4_API_KEY_ROTATION.md   — Key rotation for all services
│   └── STEP_5_SSH_HARDENING.md      — SSH access restriction
├── tools/
│   ├── security-audit-script.sh     — Automated exposure check
│   ├── verification-checklist.md    — Post-hardening verification
│   └── rollback-guide.md            — Emergency recovery procedures
└── templates/
    └── security-checklist.md        — Printable verification sheet
```

## File Descriptions

### Core Framework
- **SKILL.md** — Complete 5-step hardening process with rationale, commands, and troubleshooting
- **README.md** — Quick reference and overview
- **MANIFEST.md** — This file; describes structure and contents

### Detailed Guides (guides/ directory)
- **STEP_1_AUDIT.md** — Check if instance is publicly exposed via Shodan, verify port binding
- **STEP_2_PORT_CLOSURE.md** — Close port 18789 at AWS Security Group level
- **STEP_3_GATEWAY_AUTH.md** — Enable token-based authentication on OpenClaw gateway
- **STEP_4_API_KEY_ROTATION.md** — Rotate Anthropic, Telegram, Slack, Discord credentials
- **STEP_5_SSH_HARDENING.md** — Restrict SSH to personal IP only

### Automation & Tools (tools/ directory)
- **security-audit-script.sh** — Bash script for automated exposure detection
- **verification-checklist.md** — Post-hardening verification tasks
- **rollback-guide.md** — Emergency recovery if hardening breaks something

### Templates (templates/ directory)
- **security-checklist.md** — Printable checklist for teams coordinating hardening

## Content Safety

✅ **No confidential information included:**
- IP addresses masked (e.g., `YOUR_PUBLIC_IP`, `123.45.67.89/32`)
- API keys shown as examples only (e.g., `sk-...`)
- User PII removed (no names, account IDs)
- All instructions use placeholder values

✅ **Safe for public sharing:**
- No database credentials exposed
- No authentication tokens included
- All secrets shown in masked form
- Code examples use generic patterns

## Usage Scenarios

### Scenario 1: Individual Self-Hosted Instance
1. Read `README.md` for context
2. Follow `SKILL.md` steps 1-5
3. Verify with `tools/verification-checklist.md`

### Scenario 2: Team Deployment
1. Share `SKILL.md` with team
2. Print `templates/security-checklist.md`
3. Run `tools/security-audit-script.sh` on each instance
4. Coordinate hardening using printed checklist

### Scenario 3: Onboarding New Users
1. Start with `README.md` for context
2. Direct to `SKILL.md` for step-by-step
3. Provide `tools/verification-checklist.md` as validation

### Scenario 4: Emergency Response
If instance is publicly exposed:
1. **Immediate:** Follow Step 2 (close port 18789) first
2. **Within 1 hour:** Complete Steps 3-4 (auth + key rotation)
3. **Reference:** `tools/rollback-guide.md` if needed

## Integration with Existing Documentation

This skill is designed to:
- Complement official OpenClaw docs (https://docs.openclaw.ai)
- Expand on security chapter in OpenClaw handbook
- Provide practical, reproducible examples
- Focus on self-hosted EC2/VPS scenarios

## Version & Maintenance

**Current Version:** 1.0  
**Last Updated:** February 5, 2026  
**Maintenance:** As OpenClaw versions evolve, security guidance will be updated

## License & Attribution

This skill is public documentation. Feel free to:
- ✅ Share with others
- ✅ Adapt for your organization
- ✅ Translate to other languages
- ✅ Reference in training/onboarding

If you improve it, consider submitting back to the community.

## Support & Feedback

- **Questions?** Discord: https://discord.com/invite/clawd
- **Found an issue?** GitHub: https://github.com/openclaw/openclaw/issues
- **Want to contribute?** Submit a PR with improvements

---

**Status:** ✅ Complete and ready for public sharing  
**Confidentiality:** All PII/secrets masked; safe for any audience
