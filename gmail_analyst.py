import os
import sys
import pickle
import json
import traceback
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

from simple_agents_py import Client
from simple_agents_py.workflow_request import (
    WorkflowExecutionRequest, WorkflowMessage, WorkflowRole,
)

# Configuration
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
WORKFLOW_YAML = "email_classifier.yaml"

def get_gmail_service():
    """
    Handles local OAuth 2.0 loopback flow to retrieve or refresh secure credentials.
    """
    creds = None
    token_path = 'token.pickle'
    
    if os.path.exists(token_path):
        print("[Auth] Found cached token.pickle, loading credentials...")
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
            
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("[Auth] Credentials expired, refreshing automatically...")
            creds.refresh(Request())
        else:
            print("[Auth] No valid token found. Starting Google browser authentication flow...")
            if not os.path.exists('credentials.json'):
                print("ERROR: credentials.json not found in the current directory!", file=sys.stderr)
                print("Please download your client secrets file, rename it to credentials.json, and try again.", file=sys.stderr)
                sys.exit(1)
            
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            # Starts temporary local server on arbitrary port to capture redirect
            creds = flow.run_local_server(port=0)
            
        with open(token_path, 'wb') as token:
            print("[Auth] Saving secure token.pickle for future silent runs...")
            pickle.dump(creds, token)

    return build('gmail', 'v1', credentials=creds)


def fetch_last_week_emails(service):
    """
    Retrieves metadata and snippets for all messages received in the last 10 days.
    """
    print("[Gmail] Querying inbox for emails from the last 10 days (newer_than:10d)...")
    try:
        results = service.users().messages().list(userId='me', q='newer_than:10d', maxResults=50).execute()
        messages = results.get('messages', [])
        
        email_list = []
        if not messages:
            print("[Gmail] No recent emails found in the last week.")
            return email_list
            
        print(f"[Gmail] Found {len(messages)} messages. Downloading headers and snippets...")
        for i, msg in enumerate(messages):
            msg_id = msg['id']
            # Get full message format to extract headers and snippet
            detail = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
            
            payload = detail.get('payload', {})
            headers = payload.get('headers', [])
            
            subject = "(No Subject)"
            sender = "(Unknown)"
            date = "(Unknown)"
            for h in headers:
                name = h.get('name', '').lower()
                if name == 'subject':
                    subject = h.get('value', '')
                elif name == 'from':
                    sender = h.get('value', '')
                elif name == 'date':
                    date = h.get('value', '')
                    
            snippet = detail.get('snippet', '')
            
            email_list.append({
                "id": msg_id,
                "sender": sender,
                "subject": subject,
                "date": date,
                "snippet": snippet
            })
            if (i+1) % 10 == 0 or (i+1) == len(messages):
                print(f"Downloaded {i+1}/{len(messages)} emails...")
                
        return email_list
    except Exception as e:
        print(f"[Gmail] Failed to fetch emails: {e}", file=sys.stderr)
        sys.exit(1)


def analyze_emails():
    # 1. Load env variables
    load_dotenv(override=True)
    key = os.environ.get("OPENAI_API_KEY")
    base = os.environ.get("WORKFLOW_API_BASE")
    
    if not key:
        print("ERROR: OPENAI_API_KEY is not defined in your environment or .env!", file=sys.stderr)
        sys.exit(1)
        
    # Force set in process environment so native Rust core picks them up
    os.environ["OPENAI_API_KEY"] = key
    os.environ["WORKFLOW_API_KEY"] = key
    if base:
        os.environ["WORKFLOW_API_BASE"] = base
        os.environ["OPENAI_API_BASE"] = base

    # 2. Get Gmail client
    service = get_gmail_service()
    emails = fetch_last_week_emails(service)
    
    if not emails:
        print("No emails to classify.")
        return

    # 3. Setup SimpleAgents Client
    print("\n[SimpleAgents] Initializing classifier workflow...")
    client = Client("openai", api_key=key, api_base=base)
    
    results_report = []
    category_counts = {
        "career_growth": 0,
        "continuous_learning": 0,
        "sales_opportunity": 0,
        "spam": 0,
        "standard_work": 0
    }
    
    print("\n=== RUNNING EMAIL CLASSIFICATION AND ANALYSIS ===")
    for idx, mail in enumerate(emails):
        print(f"\nProcessing Email {idx+1}/{len(emails)}:")
        print(f"  Sender:  {mail['sender']}")
        print(f"  Subject: {mail['subject']}")
        
        # Prepare context payload
        input_payload = f"Sender: {mail['sender']}\nSubject: {mail['subject']}\nBody Snippet: {mail['snippet']}"
        
        # Execute workflow
        req = WorkflowExecutionRequest(
            workflow_path=str(Path(WORKFLOW_YAML).resolve()),
            messages=[WorkflowMessage(role=WorkflowRole.USER, content=input_payload)]
        )
        
        try:
            result = client.run_workflow(req)
            
            # Extract classifier results
            analyzer_out = result.outputs.get("email_analyzer", {}).get("output", {})
            category = analyzer_out.get("category", "standard_work")
            score = analyzer_out.get("relevance_score", 1)
            summary = analyzer_out.get("summary", "No summary.")
            action = analyzer_out.get("key_action_item", "None")
            
            # Track category counts
            if category in category_counts:
                category_counts[category] += 1
            else:
                category_counts["standard_work"] += 1
                
            print(f"  RESULT ➜ Category: [{category.upper()}] (Relevance Score: {score}/10)")
            print(f"  SUMMARY ➜ {summary}")
            
            sales_out = None
            if category == "sales_opportunity" and "sales_action_builder" in result.outputs:
                sales_out = result.outputs.get("sales_action_builder", {}).get("output", {})
                print(f"  SALES DRAFT GENERATED! Next step: {sales_out.get('next_step')}")

            results_report.append({
                "id": mail["id"],
                "sender": mail["sender"],
                "subject": mail["subject"],
                "date": mail["date"],
                "snippet": mail["snippet"],
                "classification": {
                    "category": category,
                    "relevance_score": score,
                    "summary": summary,
                    "key_action_item": action
                },
                "sales_draft": sales_out
            })
            
        except Exception as e:
            print(f"  [ERROR] Classification failed for this email: {e}")
            
    # 4. Generate Aggregated Report
    print("\n" + "="*50)
    print("               WEEKLY INBOX REPORT SUMMARY")
    print("="*50)
    print(f"Total Emails Processed: {len(emails)}")
    print("\nCategory Distribution:")
    for cat, count in category_counts.items():
        percentage = (count / len(emails)) * 100 if emails else 0
        print(f"  - {cat.replace('_', ' ').title():<22} : {count:<3} ({percentage:.1f}%)")
        
    print("\nTop Career & Learning Action Items:")
    action_items_found = False
    for r in results_report:
        c = r["classification"]
        if c["category"] in ["career_growth", "continuous_learning"] and c.get("key_action_item") and c["key_action_item"].lower() != 'none':
            print(f"  ➜ [{c['category'].upper()}] Relevance: {c['relevance_score']}/10")
            print(f"    Action: {c['key_action_item']}")
            print(f"    Context: '{r['subject']}' from {r['sender']}\n")
            action_items_found = True
            
    if not action_items_found:
        print("  (No direct action items extracted for career growth or continuous learning.)")
        
    report_data = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "total_emails": len(emails),
            "distribution": category_counts
        },
        "emails": results_report
    }
    report_path = "gmail_analysis_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    print(f"\n[Report] Full analytical report written to {report_path}")
    print("="*50)
    return report_data


if __name__ == "__main__":
    try:
        analyze_emails()
    except KeyboardInterrupt:
        print("\nExiting analyst script...")
        sys.exit(0)
