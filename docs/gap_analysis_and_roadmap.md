# MOVE Platform Gap Analysis & Roadmap

## 1. Executive Summary
The "MOVE Connectivity Commander" successfully demonstrates the **Vision** and **Intelligence** of the platform (Globe, Co-Pilot). However, a review of the full MOVE API suite reveals significant functional gaps that need to be bridged to show the comprehensive **Control** capabilities, specifically regarding Portability (MNP), Real-Time Device Management, and Bulk Operations.

## 2. Capability Gap Analysis

| MOVE API Feature | Current App Status | Impact Score | Gap Description |
| :--- | :--- | :--- | :--- |
| **eSIM Hub API** | ✅ **Covered** | High | The "eSIM Factory" effectively simulates downloading and enabling profiles. |
| **IoT Connect API** | ✅ **Partial** | High | We show stats and alerts, but lack granular control (Suspend/Resume/Throttling) for individual SIMs. |
| **Fleet Intelligence** | ✅ **Covered** | High | "Co-Pilot" (Gemini) covers the *analysis* aspect perfectly. |
| **Sim Connect RT API** | ❌ **Missing** | Critical | We do not demonstrate the **Real-Time** control aspect (e.g., stopping a runaway session instantly). |
| **MNP (Portability)** | ❌ **Missing** | Medium | No visualization for Port-In/Port-Out of numbers, which is a key telecom capability. |
| **Bulk SMS / Wakeup** | ❌ **Missing** | Medium | The "Crisis Mode" idea exists but hasn't been effectively implemented as a "Bulk Action" feature. |
| **Asset Management** | ❌ **Missing** | Low | Custom fields/Asset tagging is not visualized. |

## 3. Implementation Roadmap to Bridge Gaps

To achieve full "Impact", we propose two additional phases.

### Phase 5: The Control Room (Real-Time Control)
*Focus: Showing the power of `move-sim-connect-rt-api-v4` and `move-iot-connect-api-v8`.*
*   **Feature**: **Device Inspector Panel**.
*   **Action**: Clicking a node on the Globe opens a detailed sliding panel.
*   **Capabilities**:
    *   **Live Session Kill Switch**: "Stop Session" button (simulates RT API).
    *   **Status Toggle**: Suspend/Resume SIM state.
    *   **Network Steering**: A dropdown to forcefuly change the roaming operator (e.g., "Steer to Telefonica").

### Phase 6: Broadcast & Portability (Bulk Ops)
*Focus: Showing scale with `Tata-move-api-bulk-sms` and `MoveMNPAPI-v2`.*
*   **Feature**: **Command Center Actions**.
*   **Capabilities**:
    *   **Bulk SMS / Wakeup**: A tool to simple "Send Config SMS to All Pending Devices".
    *   **Number Portability Wizard**: A visual "Port-In" simulation where you enter a range of MSISDNs and watch them "turn green" as they port into the MOVE network.

## 4. Immediate Recommendation
We should prioritize **Phase 5 (The Control Room)**.
Why? Because showing a customer that they can **remotely kill a rogue session in real-time** is the single most powerful "Control" demonstration for an IoT Manager. It directly addresses the "Fear of Overage" better than just seeing a chart.

## 5. Proposed Updates to Application
1.  **Modify Globe Interactions**: Make the SIM nodes clickable.
2.  **Add `DeviceDetailPanel`**: A side-sheet that displays deep technical info (IMSI, ICCID, Session ID) and offers the "Kill Switch".
3.  **Update Co-Pilot**: Teach the AI to recommend these specific actions (e.g., "Device X is rogue. Click here to Kill Session").
