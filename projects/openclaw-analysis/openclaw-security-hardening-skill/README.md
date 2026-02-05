# OpenClaw Security Hardening Skill

**Secure your self-hosted OpenClaw instance in 15 minutes.**

This skill provides step-by-step guidance for hardening OpenClaw deployments against public exposure, API key theft, and unauthorized access.

## Quick Start

1. **Read the full skill:** `SKILL.md`
2. **Follow the 5 steps:**
   - Step 1: Audit your exposure (5 min)
   - Step 2: Close port 18789 (3 min)
   - Step 3: Enable gateway token (3 min)
   - Step 4: Rotate API keys (5 min)
   - Step 5: Harden SSH (optional, 2 min)

3. **Verify:** Run the post-hardening checklist

## Background

In January 2026, security researcher Jamieson O'Reilly disclosed **900+ exposed OpenClaw instances** on Shodan with:
- ❌ Unauthenticated access to Control UI
- ❌ API keys and credentials visible
- ❌ Full chat histories downloadable
- ❌ Command execution via root containers

**Root cause:** Localhost auto-approval in auth logic exploitable behind misconfigured reverse proxies.

## Who Should Use This

- ✅ Self-hosted OpenClaw on AWS EC2, VPS, or home lab
- ✅ Existing deployments wanting hardening
- ✅ New deployments pre-hardening
- ✅ Teams sharing OpenClaw instances

## What You'll Get

After completing this skill:
- ✅ Port 18789 closed to internet
- ✅ Gateway token authentication enabled
- ✅ All API keys rotated
- ✅ SSH access hardened (optional)
- ✅ Zero impact on messaging functionality

## Time Required

**Total: 10-15 minutes**
- Audit: 5 min
- AWS Security Group: 3 min
- Gateway config: 3 min
- API key rotation: 5 min
- SSH hardening: 2 min (optional)

## Files Included

- `SKILL.md` — Full framework (8,900 bytes)
- `README.md` — This file
- `MANIFEST.md` — File inventory

## Safety Notes

✅ All changes are reversible  
✅ No data loss involved  
✅ Messaging functionality unaffected  
✅ Can be rolled back at any time  

## Support

**Questions?**
- Discord: https://discord.com/invite/clawd
- GitHub: https://github.com/openclaw/openclaw/issues

## Version

**v1.0** | February 5, 2026
