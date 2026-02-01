# OWASP Top 10 for Agentic Applications 2026
## Security Assessment of OpenClaw

> This document provides a comprehensive security assessment of the OpenClaw personal AI assistant against the OWASP Top 10 for Agentic Applications 2026 framework.

---

## Executive Summary

| Risk ID | Vulnerability | OpenClaw Risk Level | Mitigation Status |
|---------|--------------|---------------------|-------------------|
| ASI01 | Agent Goal Hijack | 🟡 MEDIUM | Partial |
| ASI02 | Tool Misuse & Exploitation | 🟡 MEDIUM | Partial |
| ASI03 | Identity & Privilege Abuse | 🟢 LOW | Good |
| ASI04 | Agentic Supply Chain | 🟡 MEDIUM | Partial |
| ASI05 | Unexpected Code Execution | 🟢 LOW | Good |
| ASI06 | Memory & Context Poisoning | 🟡 MEDIUM | Partial |
| ASI07 | Insecure Inter-Agent Comms | 🟢 LOW | Good |
| ASI08 | Cascading Failures | 🟡 MEDIUM | Partial |
| ASI09 | Human-Agent Trust Exploitation | 🟡 MEDIUM | Partial |
| ASI10 | Rogue Agents | 🟢 LOW | Good |

**Overall Assessment**: OpenClaw demonstrates security-conscious design with room for improvement in input validation and supply chain security.

---

## OWASP Top 10 for Agentic Applications 2026

### Reference Framework

```mermaid
mindmap
  root((OWASP Agentic<br/>Top 10 2026))
    ASI01[Goal Hijack]
      Prompt Injection
      Indirect Manipulation
      Objective Drift
    ASI02[Tool Misuse]
      Overprivileged Tools
      Schema Bypass
      Unintended Actions
    ASI03[Identity Abuse]
      Credential Theft
      Privilege Escalation
      Session Hijacking
    ASI04[Supply Chain]
      Malicious Plugins
      Poisoned Models
      Compromised APIs
    ASI05[Code Execution]
      RCE via Interpreter
      Sandbox Escape
      Injection Attacks
    ASI06[Memory Poisoning]
      Context Manipulation
      RAG Contamination
      Persistent Corruption
    ASI07[Insecure Comms]
      Message Spoofing
      Replay Attacks
      MitM
    ASI08[Cascading Failures]
      Chain Reactions
      Recovery Loops
      Resource Exhaustion
    ASI09[Trust Exploitation]
      Social Engineering
      Deceptive Output
      Authority Abuse
    ASI10[Rogue Agents]
      Goal Misalignment
      Autonomous Drift
      Self-Modification
```

---

## Detailed Assessment

### ASI01: Agent Goal Hijack

**OWASP Definition**: Attackers manipulate an agent's objectives through injected instructions, where the agent can't distinguish between legitimate commands and malicious ones embedded in content it processes.

**Risk Level**: 🟡 MEDIUM

```mermaid
flowchart LR
    subgraph "Attack Surface"
        A1[User Messages]
        A2[Email Content]
        A3[Web Pages]
        A4[File Contents]
    end

    subgraph "Goal Hijack Vectors"
        V1[Direct Prompt Injection]
        V2[Indirect via Documents]
        V3[Multi-step Manipulation]
    end

    subgraph "Impact"
        I1[Data Exfiltration]
        I2[Unauthorized Actions]
        I3[Privilege Escalation]
    end

    A1 --> V1
    A2 --> V2
    A3 --> V2
    A4 --> V2
    V1 --> I1
    V2 --> I2
    V3 --> I3
```

**OpenClaw Analysis**:

| Aspect | Finding |
|--------|---------|
| **Input Sources** | Multiple channels (WhatsApp, Telegram, Gmail) accept natural language |
| **Prompt Injection** | SECURITY.md explicitly lists prompt injection as "out of scope" |
| **Indirect Attacks** | Browser tool, email processing create injection surfaces |
| **Model Choice** | Recommends Claude for "better prompt-injection resistance" |

**Evidence from Codebase**:
- The `SECURITY.md` states: "Prompt injection attacks" are explicitly out of scope
- Recommended model is "anthropic/claude-opus-4-5" for injection resistance
- No documented input sanitization for multi-channel messages

**Mitigations in Place**:
- ✅ Claude model recommendation for injection resistance
- ✅ Session isolation between channels
- ⚠️ No explicit input sanitization layer documented
- ❌ No "Intent Capsule" pattern implementation

**Recommendations**:
1. Implement input sanitization layer before agent processing
2. Add human-in-the-loop for high-impact actions (file deletion, credential access)
3. Consider "Intent Capsule" pattern for action verification
4. Document prompt injection defenses explicitly

---

### ASI02: Tool Misuse and Exploitation

**OWASP Definition**: Agents use authorized tools unsafely due to ambiguous instructions or prompt manipulation, representing a Least-Agency failure.

**Risk Level**: 🟡 MEDIUM

```mermaid
flowchart TB
    subgraph "OpenClaw Tools"
        T1[Browser Control<br/>Chrome DevTools]
        T2[File System<br/>Read/Write]
        T3[System Commands<br/>Shell Execution]
        T4[Camera/Screen<br/>Capture]
        T5[Network<br/>Webhooks/APIs]
    end

    subgraph "Misuse Scenarios"
        M1[Exfiltrate Data via Browser]
        M2[Delete/Modify Files]
        M3[Execute Malicious Commands]
        M4[Surveillance via Camera]
        M5[Data Leakage via Webhooks]
    end

    T1 --> M1
    T2 --> M2
    T3 --> M3
    T4 --> M4
    T5 --> M5
```

**OpenClaw Analysis**:

| Tool | Risk | Mitigation |
|------|------|------------|
| Browser Control | HIGH | Dedicated Chrome instance |
| File System | HIGH | Main session only by default |
| Shell Commands | CRITICAL | Docker sandbox for groups |
| Camera/Screen | MEDIUM | Node-based, local only |
| Webhooks | MEDIUM | Configuration required |

**Evidence from Codebase**:
- Tools execute with host permissions for "main" sessions
- Docker sandboxing available for non-main sessions
- `AGENTS.md` documents tool schema requirements
- No explicit tool allowlist per session type

**Mitigations in Place**:
- ✅ Docker sandbox for group/channel sessions
- ✅ Tool schema validation requirements
- ✅ Dedicated browser instance isolation
- ⚠️ Main session has full tool access
- ❌ No just-in-time permission prompts

**Recommendations**:
1. Implement tool allowlists per session type
2. Add confirmation prompts for destructive actions
3. Rate-limit tool executions
4. Log all tool invocations with parameters

---

### ASI03: Identity & Privilege Abuse

**OWASP Definition**: Agents escalate privileges by abusing their own identity or inheriting credentials from connected services.

**Risk Level**: 🟢 LOW

```mermaid
flowchart LR
    subgraph "Identity Management"
        I1[Channel Credentials]
        I2[API Keys]
        I3[OAuth Tokens]
        I4[Session Tokens]
    end

    subgraph "Storage"
        S1[~/.openclaw/credentials]
        S2[Environment Variables]
        S3[Config Files]
    end

    subgraph "Protection"
        P1[File Permissions]
        P2[Pairing Policy]
        P3[Session Isolation]
    end

    I1 --> S1
    I2 --> S2
    I3 --> S1
    I4 --> S3

    S1 --> P1
    S2 --> P1
    S3 --> P1

    P2 --> I4
    P3 --> I4
```

**OpenClaw Analysis**:

| Aspect | Status |
|--------|--------|
| Credential Storage | File-based at `~/.openclaw/credentials/` |
| Access Control | OS-level file permissions |
| Token Management | OAuth refresh supported |
| Session Identity | Unique per channel/conversation |

**Mitigations in Place**:
- ✅ Separate credential storage directory
- ✅ Pairing policy for unknown DMs
- ✅ Session isolation between conversations
- ✅ OAuth token rotation support
- ⚠️ Long-lived credentials possible

**Recommendations**:
1. Implement credential encryption at rest
2. Add automatic token expiration/rotation
3. Audit credential access logging
4. Consider hardware security module integration

---

### ASI04: Agentic Supply Chain Vulnerabilities

**OWASP Definition**: External dependencies—third-party APIs, models, RAG data sources—inherit vulnerabilities into the agent.

**Risk Level**: 🟡 MEDIUM

```mermaid
flowchart TB
    subgraph "Supply Chain Components"
        SC1[npm Dependencies<br/>700+ packages]
        SC2[AI Model APIs<br/>Anthropic/OpenAI]
        SC3[Skills Platform<br/>ClawHub Registry]
        SC4[Channel Libraries<br/>Baileys, grammY, etc.]
    end

    subgraph "Risk Vectors"
        R1[Malicious Packages]
        R2[Model Poisoning]
        R3[Skill Backdoors]
        R4[Library Vulnerabilities]
    end

    subgraph "Controls"
        C1[npm Audit]
        C2[Model Provider Trust]
        C3[Skill Gating]
        C4[Dependency Updates]
    end

    SC1 --> R1 --> C1
    SC2 --> R2 --> C2
    SC3 --> R3 --> C3
    SC4 --> R4 --> C4
```

**OpenClaw Analysis**:

| Component | Risk | Controls |
|-----------|------|----------|
| npm packages | HIGH | `detect-secrets` in CI |
| AI Models | MEDIUM | Provider trust |
| Skills | MEDIUM | Install gating |
| Channels | MEDIUM | Version pinning |

**Evidence from Codebase**:
- Uses `detect-secrets` for credential scanning
- Skills have "install gating" controls
- Multiple third-party channel libraries
- Node.js 22+ required for security patches

**Mitigations in Place**:
- ✅ Secret detection in CI/CD
- ✅ Skill install gating
- ✅ Node.js version requirements
- ⚠️ No SBOM generation documented
- ❌ No dependency signature verification

**Recommendations**:
1. Generate and maintain Software Bill of Materials (SBOM)
2. Implement dependency signature verification
3. Create trusted skill registry with code signing
4. Regular dependency audits with automated CVE scanning

---

### ASI05: Unexpected Code Execution

**OWASP Definition**: Agents generate and execute malicious code via code-interpreter tools.

**Risk Level**: 🟢 LOW

```mermaid
flowchart LR
    subgraph "Code Execution Paths"
        E1[Shell Commands]
        E2[Browser JavaScript]
        E3[Node.js Scripts]
        E4[Docker Containers]
    end

    subgraph "Protections"
        P1[Sandbox Mode]
        P2[User Isolation]
        P3[Capability Dropping]
        P4[Read-Only Filesystem]
    end

    E1 --> P1
    E2 --> P2
    E3 --> P1
    E4 --> P3
    E4 --> P4
```

**OpenClaw Analysis**:

| Execution Context | Isolation Level |
|-------------------|-----------------|
| Main Session | Host (FULL ACCESS) |
| Group Session | Docker (SANDBOXED) |
| Non-main Session | Configurable |

**Evidence from Codebase**:
- Docker sandbox with `--read-only` flags
- Capability dropping with `--cap-drop=ALL`
- Non-root container execution
- Configurable sandbox modes

**Mitigations in Place**:
- ✅ Docker sandboxing for group sessions
- ✅ Read-only filesystem option
- ✅ Capability dropping
- ✅ Non-root execution
- ⚠️ Main session runs with full host access

**Recommendations**:
1. Default to sandboxed execution even for main session
2. Implement code analysis before execution
3. Add execution timeouts and resource limits
4. Log all code execution with inputs/outputs

---

### ASI06: Memory & Context Poisoning

**OWASP Definition**: Malicious data corrupts the agent's persistent memory stores, causing misaligned behavior over time.

**Risk Level**: 🟡 MEDIUM

```mermaid
flowchart TB
    subgraph "Memory Components"
        M1[Session Context]
        M2[Conversation History]
        M3[Skills State]
        M4[User Preferences]
    end

    subgraph "Poisoning Vectors"
        V1[Malicious Messages]
        V2[Injected Context]
        V3[Corrupted Skills]
        V4[Config Tampering]
    end

    subgraph "Impact"
        I1[Behavioral Drift]
        I2[Incorrect Responses]
        I3[Security Bypass]
    end

    V1 --> M1
    V2 --> M2
    V3 --> M3
    V4 --> M4

    M1 --> I1
    M2 --> I2
    M3 --> I3
```

**OpenClaw Analysis**:

| Memory Type | Protection |
|-------------|------------|
| Session Logs | JSONL files, no integrity check |
| Config | JSON, user-writable |
| Skills | Directory-based, install gating |
| Context | In-memory, session-scoped |

**Mitigations in Place**:
- ✅ Session isolation
- ✅ Session pruning and context compaction
- ✅ `/reset` command to clear context
- ⚠️ No cryptographic integrity verification
- ❌ No memory rollback capability

**Recommendations**:
1. Implement integrity checksums for session logs
2. Add memory versioning for rollback
3. Sanitize context before persistence
4. Regular memory audits for anomalies

---

### ASI07: Insecure Inter-Agent Communication

**OWASP Definition**: Multi-agent systems face interception, message forging, and replay attacks.

**Risk Level**: 🟢 LOW

```mermaid
flowchart LR
    subgraph "Agent Communication"
        A1[Agent 1]
        A2[Agent 2]
        A3[Agent 3]
    end

    subgraph "Communication Tools"
        T1[sessions_list]
        T2[sessions_history]
        T3[sessions_send]
    end

    subgraph "Gateway"
        GW[WebSocket Hub<br/>localhost only]
    end

    A1 <--> GW
    A2 <--> GW
    A3 <--> GW

    GW --> T1
    GW --> T2
    GW --> T3
```

**OpenClaw Analysis**:

| Aspect | Status |
|--------|--------|
| Transport | WebSocket over localhost |
| Authentication | Gateway-controlled |
| Message Signing | Not documented |
| Replay Protection | Not documented |

**Mitigations in Place**:
- ✅ Gateway bound to localhost (127.0.0.1)
- ✅ Single control point for routing
- ✅ Session-based isolation
- ⚠️ No message signing for inter-agent comms
- ⚠️ No replay protection documented

**Recommendations**:
1. Implement message signing for agent-to-agent communication
2. Add nonce/timestamp for replay protection
3. Log inter-agent message flows
4. Consider mTLS for remote Gateway scenarios

---

### ASI08: Cascading Failures

**OWASP Definition**: Minor component failures trigger destructive chain reactions as agents attempt recovery.

**Risk Level**: 🟡 MEDIUM

```mermaid
flowchart TB
    subgraph "Failure Scenarios"
        F1[Channel Disconnect]
        F2[Tool Timeout]
        F3[Model API Failure]
        F4[Memory Corruption]
    end

    subgraph "Cascade Risks"
        C1[Retry Storms]
        C2[Resource Exhaustion]
        C3[Partial State]
        C4[Data Loss]
    end

    subgraph "Recovery"
        R1[Model Failover]
        R2[Session Restart]
        R3[Daemon Restart]
    end

    F1 --> C1
    F2 --> C2
    F3 --> C3
    F4 --> C4

    C3 --> R1
    C1 --> R2
    C4 --> R3
```

**OpenClaw Analysis**:

| Failure Mode | Handling |
|--------------|----------|
| Channel Disconnect | Reconnection logic |
| Model API Failure | Failover configuration |
| Tool Failure | Error returned to agent |
| Gateway Crash | Daemon restart (launchd/systemd) |

**Mitigations in Place**:
- ✅ Model failover configuration
- ✅ Daemon supervision (launchd/systemd)
- ✅ Channel reconnection
- ⚠️ No circuit breaker pattern documented
- ❌ No transactional rollback

**Recommendations**:
1. Implement circuit breakers for external services
2. Add graceful degradation modes
3. Define safe failure states
4. Implement operation rollback for multi-step actions

---

### ASI09: Human-Agent Trust Exploitation

**OWASP Definition**: Attackers manipulate agent output to deceive humans into bypassing security controls.

**Risk Level**: 🟡 MEDIUM

```mermaid
flowchart LR
    subgraph "Trust Vectors"
        T1[Authority Appearance]
        T2[Urgency Creation]
        T3[False Confidence]
        T4[Source Obfuscation]
    end

    subgraph "Attack Scenarios"
        A1[Fake Admin Messages]
        A2[Urgent Action Requests]
        A3[Misleading Summaries]
        A4[Hidden Malicious Links]
    end

    subgraph "User Impact"
        I1[Credential Disclosure]
        I2[Unauthorized Approvals]
        I3[Security Bypass]
    end

    T1 --> A1 --> I1
    T2 --> A2 --> I2
    T3 --> A3 --> I3
    T4 --> A4 --> I1
```

**OpenClaw Analysis**:

| Aspect | Status |
|--------|--------|
| Output Attribution | Agent responses marked |
| Source Transparency | Not enforced |
| Decision Audit | Session logs available |
| User Education | Documentation provided |

**Mitigations in Place**:
- ✅ Session logging for audit
- ✅ Pairing codes for unknown senders
- ⚠️ No output integrity markers
- ❌ No source transparency enforcement

**Recommendations**:
1. Add visible markers for AI-generated content
2. Implement source attribution for information
3. Require confirmation for sensitive actions
4. Educate users on social engineering risks

---

### ASI10: Rogue Agents

**OWASP Definition**: Agents drift from intended purpose through internal misalignment—a self-initiated autonomous threat.

**Risk Level**: 🟢 LOW

```mermaid
flowchart TB
    subgraph "Rogue Agent Indicators"
        I1[Goal Drift]
        I2[Unexpected Tool Use]
        I3[Resource Abuse]
        I4[Self-Modification Attempts]
    end

    subgraph "Controls"
        C1[Session Boundaries]
        C2[Tool Restrictions]
        C3[Resource Limits]
        C4[Behavioral Monitoring]
    end

    subgraph "Kill Switch"
        K1[Reset Command]
        K2[Session Termination]
        K3[Gateway Shutdown]
    end

    I1 --> C1
    I2 --> C2
    I3 --> C3
    I4 --> C4

    C1 --> K1
    C2 --> K2
    C3 --> K3
    C4 --> K3
```

**OpenClaw Analysis**:

| Control | Implementation |
|---------|----------------|
| Goal Boundaries | Session-scoped context |
| Kill Switch | `/reset`, session termination |
| Monitoring | Session logs |
| Autonomy Limits | Human-initiated only |

**Mitigations in Place**:
- ✅ Session-scoped operations
- ✅ Multiple kill switch options
- ✅ Human-initiated conversations only
- ✅ No autonomous goal-seeking behavior
- ⚠️ Limited behavioral drift detection

**Recommendations**:
1. Implement behavioral baseline monitoring
2. Add anomaly detection for tool usage patterns
3. Create automated circuit breakers for unusual activity
4. Regular audit of session patterns

---

## Security Architecture Recommendations

### Proposed Security Enhancements

```mermaid
flowchart TB
    subgraph "Input Layer"
        IL1[Input Sanitization]
        IL2[Intent Verification]
        IL3[Rate Limiting]
    end

    subgraph "Processing Layer"
        PL1[Tool Allowlists]
        PL2[Execution Sandbox]
        PL3[Resource Limits]
    end

    subgraph "Output Layer"
        OL1[Content Markers]
        OL2[Source Attribution]
        OL3[Confirmation Prompts]
    end

    subgraph "Monitoring Layer"
        ML1[Behavioral Analysis]
        ML2[Anomaly Detection]
        ML3[Audit Logging]
    end

    IL1 --> PL1
    IL2 --> PL2
    IL3 --> PL3

    PL1 --> OL1
    PL2 --> OL2
    PL3 --> OL3

    OL1 --> ML1
    OL2 --> ML2
    OL3 --> ML3
```

### Priority Improvements

| Priority | Improvement | Addresses |
|----------|-------------|-----------|
| 1 | Input sanitization layer | ASI01, ASI06 |
| 2 | Tool allowlists per session | ASI02 |
| 3 | SBOM generation | ASI04 |
| 4 | Memory integrity verification | ASI06 |
| 5 | Behavioral monitoring | ASI10 |

---

## Conclusion

OpenClaw demonstrates a **security-conscious architecture** with several built-in protections:

**Strengths**:
- Docker sandboxing for untrusted sessions
- Pairing policy for unknown senders
- Session isolation and boundaries
- Model selection for injection resistance
- Localhost-bound Gateway

**Areas for Improvement**:
- Input sanitization and validation
- Supply chain security (SBOM, signing)
- Memory integrity verification
- Behavioral drift detection
- Human-in-the-loop for sensitive actions

**Overall Risk Rating**: 🟡 **MEDIUM** - Suitable for personal use with documented security practices; enterprise deployment requires additional hardening.

---

## References

- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [OpenClaw Security Documentation](https://github.com/openclaw/openclaw/blob/main/SECURITY.md)
- [OpenClaw Agent Guidelines](https://github.com/openclaw/openclaw/blob/main/AGENTS.md)
- [NeuralTrust OWASP Analysis](https://neuraltrust.ai/blog/owasp-top-10-for-agentic-applications-2026)

---

*Assessment conducted: 2026-02-01*
*Framework: OWASP Top 10 for Agentic Applications 2026*
*Target: OpenClaw Personal AI Assistant*
