#!/usr/bin/env python3
"""
HyperNexus Follow-Up Automation
Sends follow-up emails to contacts who haven't responded
"""

import os
import smtplib
import sqlite3
import time
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import requests

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_FROM = os.getenv("SMTP_FROM")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Robert Pelloni")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REFRESH_TOKEN = os.getenv("GOOGLE_REFRESH_TOKEN")

DB_FILE = "outreach.db"
DELAY_BETWEEN_EMAILS = 25


FOLLOW_UP_TEMPLATES = {
    1: {
        "subject": "Following up: {company} + HyperNexus token optimization",
        "body": """Hi,

I wanted to follow up on my previous email about reducing input token costs by 92.7% for {company}.

Since then, we've:
- Published benchmark suite (runs in 60 seconds)
- Added support for 36+ AI clients
- Open-sourced the progressive routing algorithm

The benchmark is available at: https://github.com/robertpelloni/HyperNexus

Would you have 15 minutes this week for a quick technical walkthrough?

Best,
Robert Pelloni
Creator of HyperNexus""",
    },
    2: {
        "subject": "Last follow-up: HyperNexus acquisition opportunity for {company}",
        "body": """Hi,

This is my final follow-up regarding HyperNexus.

We're exploring strategic acquisition opportunities, and {company} would be a strong fit given your focus on AI infrastructure.

Key differentiators:
- 92.7% token reduction (proven with benchmark)
- Single Go binary (~15MB, <30MB RAM)
- Zero dependencies, cross-platform
- Production-ready with Stripe billing

If you're not the right person for this conversation, could you point me to someone on your team who handles AI infrastructure partnerships?

Best,
Robert Pelloni
Creator of HyperNexus""",
    },
    3: {
        "subject": "Quick question about {company}'s token optimization",
        "body": """Hi,

Quick question - is {company} currently experiencing any of these issues?

1. High API costs from tool-heavy agent workflows
2. Context window limits when using multiple MCP servers
3. Latency from large tool schema payloads

If so, HyperNexus solves this with local vector-based progressive routing (92.7% token reduction).

Happy to share the benchmark suite if useful.

Best,
Robert Pelloni
Creator of HyperNexus""",
    },
}


class FollowUpAutomation:
    def __init__(self):
        self.db = sqlite3.connect(DB_FILE)
        print(f"SMTP: {SMTP_HOST}:{SMTP_PORT}")

    def get_access_token(self):
        data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": GOOGLE_REFRESH_TOKEN,
            "grant_type": "refresh_token",
        }
        response = requests.post("https://oauth2.googleapis.com/token", data=data)
        if response.status_code == 200:
            return response.json()["access_token"]
        raise Exception(f"Token refresh failed: {response.text}")

    def send_email(self, to_email, subject, body):
        try:
            msg = MIMEMultipart()
            msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            access_token = self.get_access_token()
            auth_string = f"user={SMTP_USERNAME}\x01auth=Bearer {access_token}\x01\x01"
            auth_bytes = base64.b64encode(auth_string.encode("ascii")).decode("ascii")

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.docmd("AUTH", "XOAUTH2 " + auth_bytes)
                server.send_message(msg)

            return True
        except Exception as e:
            print(f"  Error: {e}")
            return False

    def get_follow_up_contacts(self, limit=10):
        """Get contacts needing follow-up"""
        cursor = self.db.cursor()
        cursor.execute(
            """
            SELECT id, email, company, follow_up_count 
            FROM contacts 
            WHERE status = 'contacted' 
            AND response_received = FALSE
            AND follow_up_count < 3
            AND last_contacted <= date('now', '-5 days')
            ORDER BY last_contacted ASC
            LIMIT ?
        """,
            (limit,),
        )
        return cursor.fetchall()

    def send_follow_ups(self, limit=10):
        """Send follow-up emails"""
        contacts = self.get_follow_up_contacts(limit)

        if not contacts:
            print("No contacts need follow-up")
            return 0

        sent = 0
        for contact_id, email, company, follow_up_count in contacts:
            template = FOLLOW_UP_TEMPLATES.get(
                follow_up_count + 1, FOLLOW_UP_TEMPLATES[3]
            )
            subject = template["subject"].format(company=company)
            body = template["body"].format(company=company)

            print(f"Follow-up #{follow_up_count + 1} to {email} ({company})...")
            if self.send_email(email, subject, body):
                cursor = self.db.cursor()
                cursor.execute(
                    """
                    UPDATE contacts 
                    SET follow_up_count = follow_up_count + 1, last_contacted = date('now')
                    WHERE id = ?
                """,
                    (contact_id,),
                )
                cursor.execute(
                    """
                    INSERT INTO emails_sent (contact_id, subject, body)
                    VALUES (?, ?, ?)
                """,
                    (contact_id, subject, body),
                )
                self.db.commit()
                sent += 1
                time.sleep(DELAY_BETWEEN_EMAILS)

        return sent

    def get_stats(self):
        cursor = self.db.cursor()
        cursor.execute("SELECT COUNT(*) FROM contacts WHERE status = 'contacted'")
        contacted = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM contacts WHERE follow_up_count > 0")
        followed_up = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM contacts WHERE response_received = TRUE")
        responses = cursor.fetchone()[0]

        print("\nFollow-Up Status:")
        print(f"  Contacted: {contacted}")
        print(f"  Followed up: {followed_up}")
        print(f"  Responses: {responses}")

    def close(self):
        self.db.close()


def main():
    print("=" * 60)
    print("HyperNexus Follow-Up Automation")
    print("=" * 60)

    automation = FollowUpAutomation()

    print("\nSending follow-ups...")
    sent = automation.send_follow_ups(limit=10)
    print(f"\nSent {sent} follow-up emails")

    automation.get_stats()
    automation.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
