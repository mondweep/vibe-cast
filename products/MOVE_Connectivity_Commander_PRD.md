# Product Requirements Document (PRD): MOVE Connectivity Commander

## 1. Executive Summary
**Project Name**: MOVE Connectivity Commander
**Goal**: To create a high-impact, visual demonstration of the Tata Communications MOVE™ platform that solves the "Proof of Concept" struggle and clearly articulates the "Value Proposition" to customers.

**Problem Statement**:
1.  **PoC Struggle**: Stakeholders find it difficult to quickly create tanglible demonstrations of the MOVE platform's capabilities.
2.  **Diluted Value**: The underlying value of global connectivity, control, and efficiency is often lost in abstract sales pitches. Customers need to *see* the control they will have.

**Solution Vision**:
The "MOVE Connectivity Commander" is a pre-built, stunning web application that acts as a "Mission Control" for global IoT connectivity. It visualizes the invisible capabilities of the MOVE API (SIM management, eSIM provisioning, global tracking) in a premium, futuristic interface. It demonstrates **Operational Supremacy**—showing, not just telling, how easy it is to manage a global fleet.

## 2. Target Audience
*   **Sales Engineers & Pre-sales**: Use it to give live demos that "wow" prospects.
*   **Business Leaders (Customers)**: Immediately grasp the ROI and operational control.
*   **Developers**: See the ease of API integration through the open-source reference implementation.

## 3. Core Features & Capabilities

### 3.1. The "Global Pulse" Dashboard (Single Pane of Glass)
*   **Visual**: A 3D interactive globe (WebGL) showing active SIMs/devices in real-time.
*   **Data**: Aggregated stats: "Total Active Connections", "Data Consumed Today", "Global Health Score".
*   **Wow Factor**: Live animated "pings" from devices.

### 3.2. eSIM Lifecycle Simulator
*   **Problem**: eSIM provisioning is abstract.
*   **Solution**: A visual flow showing the journey of an eSIM profile:
    1.  **Inventory**: Select a profile from the pool.
    2.  **Download**: Visualize the "Download" API call.
    3.  **Activate**: One-click activation with success feedback.
*   **API Usage**: Wraps `MOVE ESIM Hub API` (Download/Enable Profile).

### 3.3. Smart Fleet Health & "Crisis Mode"
*   **Scenario**: A fleet of trucks in a specific region is disconnected or overusing data.
*   **Feature**: "Crisis Mode" toggle. When active, the dashboard turns red/alert.
*   **Action**: One-click "Heal Network" button that uses bulk APIs to reset connections or top-up data.
*   **API Usage**: `MOVE IOT Connect API`, `Move API Bulk SMS` (to alert drivers).

### 3.4. The Co-Pilot (Powered by Claude Flow)
*   **Role**: An intelligent assistant that narrates the demo.
*   **Feature**: A chat interface or proactive "Toast" notifications.
*   **Example**:
    > "I've detected 50 devices in Brazil reaching their data limit. I recommend switching them to the 'South America Shared Pool' to save 15% costs. Shall I execute?"
*   **Tech**: Uses **Claude Flow 3** to analyze (mock) platform data and suggest optimizations, demonstrating the "Value with Impact" of intelligent management.

## 4. Technical Architecture

### 4.1. Frontend
*   **Framework**: Next.js (React)
*   **Styling**: TailwindCSS + Framer Motion (for animations)
*   **Visuals**: Three.js / React-Three-Fiber (for the globe)
*   **Design Language**: "Cyber-Premium" – Dark mode, neon accents, glassmorphism.

### 4.2. Backend & Intelligence
*   **API Layer**: Next.js API Routes (Node.js) acting as a proxy to MOVE APIs.
*   **Agentic Layer**: **Claude Flow 3**.
    *   **Swarm**: A small swarm of agents ("Analyst", "Network Ops").
    *   **Function**: Polling the MOVE APIs (or mock data) and generating insights for the UI.

### 4.3. Data Strategy
*   **Hybrid Mode**: The app will support a "Demo Mode" (using realistic mock data for sales pitches without credentials) and "Live Mode" (connecting to real MOVE API credentials for actual PoCs).

## 5. Success Metrics
*   **Time-to-Demo**: A Sales Engineer should be able to spin up the app and start a demo in < 5 minutes.
*   **Engagement**: "Wow" reactions during the eSIM provisioning visualization.
*   **Clarity**: Customers should ask *when* they can have this, not *what* it is.

## 6. Implementation Roadmap
1.  **Phase 1: Skeleton & UI**: Build the "Shell" with the 3D Globe and basic navigation.
2.  **Phase 2: API Integration**: Connect `MOVE SIM Connect` and `IoT Connect` APIs.
3.  **Phase 3: Intelligence**: Integrate Claude Flow for the "Co-Pilot" features.
4.  **Phase 4: Polish**: detailed animations and "story mode" for sales demos.
