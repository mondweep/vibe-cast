# 🌟 SimpleAgents Studio & Gmail Analyst

Welcome to **SimpleAgents Studio**—a premium, fully-interactive local web application designed to help you experiment with, visualize, and deploy multi-agent workflows using CraftsMan-Labs' `SimpleAgents` framework. 

This repository also contains **Gmail Email Analyst**, a local OAuth 2.0 inbox daemon that securely fetches your email headers and snippets, processes them through an intelligent multi-agent pipeline, extracts critical action items, and generates high-quality sales responses.

---

## 🚀 Key Features

### 1. 📬 Gmail Career & Learning Analyst
* **Secure OAuth 2.0 Pipeline:** Connects securely to the Google Gmail API using a local loopback authorization flow and caches credentials in `token.pickle` for silent background runs.
* **Intelligent Classification Graph (`email_classifier.yaml`):** Analyzes emails from the last 10 days (up to 50 messages) and routes them into:
  * **Career Growth:** Extracts high-priority jobs, interviews, and professional growth actions.
  * **Continuous Learning:** Identifies courses, NLP research, and learning opportunities.
  * **Sales Opportunities:** Detects potential business inquiries and automatically forwards them to a **Sales Action Builder** to compose perfect meeting reply drafts.
  * **Spam / Promo & Standard Work:** Sorts and aggregates lower-priority traffic.
* **Premium Dashboard View:** Displays real-time metrics, gorgeous segmented HSL distribution charts, chronological timelines, interactive next-step action cards, and copyable sales reply drafts.

### 2. 🩹 JSON Healer & Schema Coercion
* Interactive interface to paste broken, malformed, or truncated JSON.
* Repairs syntax errors (missing brackets, trailing commas, unescaped quotes) in real-time.
* Applies strict schema enforcement (coercion) to cast types, supply defaults, and ensure runtime safety.
* Outputs copyable Python snippets ready to drop into your code.

### 3. ⚡ Structured Outputs
* Enter clean text prompts and target JSON schemas to generate structured outputs directly from the model, fully validating outputs at the api boundary.

### 4. 🧬 Visual Workflow Studio
* A drag-and-drop code environment showcasing the active execution path of multi-node agent graphs.
* Tweak your YAML graph config (`workflow.yaml`) and custom Python handlers (`handlers.py`) directly from the browser, save changes, and click **Run** to see an interactive visualization highlighting active nodes as they process user input.

---

## 🛠️ Tech Stack & Architecture

### Backend: FastAPI
* **`app.py`:** Standard ASGI FastAPI web application serving static files and exposing REST endpoints for completion, healing, and workflow executions.
* **`gmail_analyst.py`:** Integrates the Google Client Library for Gmail API fetch operations and pipes payloads directly to the SimpleAgents core.
* **`handlers.py`:** Contains custom Python worker functions that dynamically inject business logic during graph switches (e.g. routing customer inquiries or resolving domain-specific tasks).
* **`requirements.txt`:** Specifies minimal standard libraries: `fastapi`, `uvicorn`, `google-api-python-client`, `google-auth-oauthlib`, and `python-dotenv`.

### Frontend: Pure Modern CSS & HTML5 SPA
* **Design System:** Outfitted with Outfit & JetBrains Mono typography, vibrant customized HSL gradients, glassmorphism containers (`backdrop-filter`), hover micro-animations, and fluid transitions.
* **Graph Visualization Engine:** Dynamic CSS-based interactive nodes tracing execution flows in real-time.

---

## 📂 Project Structure

```bash
simple-agents-studio/
├── app.py                     # FastAPI web server & endpoints
├── gmail_analyst.py           # Gmail API & SimpleAgents pipeline coordinator
├── handlers.py                # Python worker callbacks for workflow graphs
├── requirements.txt           # Virtual environment dependencies
├── email_classifier.yaml      # Multi-node agent graph configuration for Gmail classification
├── workflow.yaml              # Customer inquiry routing workflow graph
├── static/
│   └── index.html             # Premium dark-mode Single Page Application UI
└── .gitignore                 # Excludes environment caches & credentials
```

---

## 🔧 Installation & Setup

### 1. Prerequisites
Ensure you have Python 3.10+ and standard package managers installed. We recommend using `uv` for lightning-fast environment resolution.

### 2. Install Dependencies
```bash
# Initialize virtual environment and install packages
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_api_key_here
WORKFLOW_API_BASE=https://api.requesty.com/v1 # Optional: custom LLM endpoint
```

### 4. Configure Google Gmail API OAuth
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project, enable the **Gmail API**, and configure the **OAuth consent screen** (add your test email address).
3. Create **OAuth Client ID credentials** (Desktop Application type) and download the JSON file.
4. Save it in the project root folder as **`credentials.json`**.

---

## 🚀 Running the Studio

### 1. Start the Server
Run the FastAPI web backend:
```bash
python app.py
```
*The server will start locally at **`http://127.0.0.1:8000`** with hot-reloading active.*

### 2. First Run (OAuth Authentication)
* Open **`http://127.0.0.1:8000`** in your browser.
* Navigate to the **Email Analyst** tab.
* Click **Analyze Inbox (Last 7 Days)**.
* On your first click, the application will launch a local browser window to ask for your secure read-only permission to read emails.
* Authenticate with your Google account. A file called **`token.pickle`** will be generated in your project root.
* *Subsequent analysis requests will run silently in the background using this cached token.*

---

## 📖 Key Bug Fixes & Learnings

1. **Structured Schema Validation Safety:** Custom agent prompts in `email_classifier.yaml` were optimized to guarantee string fallbacks (e.g. outputting `"None"` instead of `null`), preventing schema coercion mismatches on empty data.
2. **Sequential Loopback Latency:** Streamlined query constraints to process a highly-dense set of up to 50 inbox headers and snippets, keeping the entire pipeline runtime exceptionally fast.
3. **DOM Layout & Styling Integrity:** Resolved an unclosed front-end `div` nesting bug in `index.html` that caused the dashboard to render black, restoring full fluid layouts and premium transitions.

---

## 📄 License
Created and maintained under the MIT License.
