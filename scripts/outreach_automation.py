#!/usr/bin/env python3
"""
HyperNexus Acquisition Outreach Automation
Uses Gmail API with OAuth2 for professional email outreach
"""

import os
import time
import base64
import sqlite3
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Gmail API imports
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Configuration
SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
]
CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token.json"
DB_FILE = "outreach.db"
SENDER_EMAIL = "HyperNexusOfficialLLC@gmail.com"

# Rate limiting
MAX_EMAILS_PER_DAY = 50
DELAY_BETWEEN_EMAILS = 30  # seconds


class OutreachManager:
    def __init__(self):
        self.service = None
        self.db = None
        self.setup_gmail()
        self.setup_database()

    def setup_gmail(self):
        """Initialize Gmail API with OAuth2"""
        creds = None

        # Load existing token
        if os.path.exists(TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

        # If no valid credentials, authenticate
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(CREDENTIALS_FILE):
                    print(f"ERROR: {CREDENTIALS_FILE} not found!")
                    print("Download it from Google Cloud Console:")
                    print("1. Go to https://console.cloud.google.com/apis/credentials")
                    print("2. Create OAuth 2.0 Client ID")
                    print("3. Download JSON and save as credentials.json")
                    return

                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_FILE, SCOPES
                )
                creds = flow.run_local_server(port=0)

            # Save token for next run
            with open(TOKEN_FILE, "w") as token:
                token.write(creds.to_json())

        self.service = build("gmail", "v1", credentials=creds)
        print("✅ Gmail API connected")

    def setup_database(self):
        """Initialize SQLite database for tracking"""
        self.db = sqlite3.connect(DB_FILE)
        cursor = self.db.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                company TEXT,
                tier INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending',
                last_contacted DATE,
                follow_up_count INTEGER DEFAULT 0,
                response_received BOOLEAN DEFAULT FALSE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emails_sent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contact_id INTEGER,
                subject TEXT,
                body TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                opened BOOLEAN DEFAULT FALSE,
                responded BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id)
            )
        """)

        self.db.commit()
        print("✅ Database initialized")

    def add_contact(self, email, name, company, tier=1, notes=""):
        """Add a contact to the database"""
        cursor = self.db.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO contacts (email, name, company, tier, notes)
                VALUES (?, ?, ?, ?, ?)
            """,
                (email, name, company, tier, notes),
            )
            self.db.commit()
            print(f"✅ Added contact: {name} ({email})")
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            print(f"⚠️  Contact already exists: {email}")
            return None

    def get_pending_contacts(self, tier=None, limit=10):
        """Get contacts that haven't been contacted yet"""
        cursor = self.db.cursor()
        if tier:
            cursor.execute(
                """
                SELECT * FROM contacts 
                WHERE status = 'pending' AND tier = ?
                ORDER BY tier ASC, created_at ASC
                LIMIT ?
            """,
                (tier, limit),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM contacts 
                WHERE status = 'pending'
                ORDER BY tier ASC, created_at ASC
                LIMIT ?
            """,
                (limit,),
            )
        return cursor.fetchall()

    def get_follow_up_contacts(self):
        """Get contacts that need follow-up"""
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT * FROM contacts 
            WHERE status = 'contacted' 
            AND response_received = FALSE
            AND follow_up_count < 3
            AND last_contacted <= date('now', '-5 days')
            ORDER BY last_contacted ASC
            LIMIT 10
        """)
        return cursor.fetchall()

    def create_email(self, to_email, to_name, company, template_type="initial"):
        """Create personalized email content"""

        templates = {
            "initial": {
                "subject": f"Persistent Memory + 95% Token Reduction for {company}",
                "body": f"""Hi {to_name},

I'm building HyperNexus, a Universal AI Control Plane that solves two critical problems for AI coding assistants:

1. Context Bloat: Our progressive tool routing reduces MCP tool context from 50K tokens to under 5K — your agents become 10x more efficient

2. Memory Persistence: L2 vector memory with semantic search means users never lose context between sessions

We're production-ready with:
• 30+ built-in MCP tools
• LLM waterfall failover (zero downtime)
• Single Go binary (~15MB, no Electron/Node bloat)
• 36+ AI client integrations

I'd love to discuss how HyperNexus could accelerate {company}'s agent capabilities. Would you be open to a 15-minute call?

Best,
HyperNexus Team
https://hypernexus.site
""",
            },
            "follow_up_1": {
                "subject": f"Following up: HyperNexus for {company}",
                "body": f"""Hi {to_name},

I wanted to follow up on my previous email about HyperNexus.

We've been making great progress:
• 95% token reduction via progressive tool routing
• Persistent memory with semantic search
• Zero-downtime LLM failover

I'd love to show you a quick demo. Would you have 15 minutes this week?

Best,
HyperNexus Team
https://hypernexus.site
""",
            },
            "follow_up_2": {
                "subject": "Last follow-up: HyperNexus acquisition opportunity",
                "body": f"""Hi {to_name},

This is my final follow-up regarding HyperNexus.

We're exploring acquisition opportunities with AI infrastructure companies, and {company} would be a great fit.

Key differentiators:
• Single Go binary (~15MB)
• Local-first architecture (sqlite-vec)
• 36+ AI client integrations
• Production-ready with Stripe billing

If you're not the right person for this, could you point me to someone on your team who handles AI infrastructure partnerships?

Best,
HyperNexus Team
https://hypernexus.site
""",
            },
        }

        template = templates.get(template_type, templates["initial"])
        return template["subject"], template["body"]

    def send_email(self, to_email, subject, body):
        """Send email via Gmail API"""
        try:
            message = MIMEMultipart()
            message["from"] = SENDER_EMAIL
            message["to"] = to_email
            message["subject"] = subject

            msg = MIMEText(body)
            message.attach(msg)

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

            sent = (
                self.service.users()
                .messages()
                .send(userId="me", body={"raw": raw})
                .execute()
            )

            print(f"✅ Email sent to {to_email} (ID: {sent['id']})")
            return True

        except Exception as e:
            print(f"❌ Failed to send to {to_email}: {e}")
            return False

    def send_outreach(self, limit=5, tier=None):
        """Send outreach emails to pending contacts"""
        contacts = self.get_pending_contacts(tier=tier, limit=limit)

        if not contacts:
            print("No pending contacts to contact")
            return

        sent_count = 0
        for contact in contacts:
            (
                contact_id,
                email,
                name,
                company,
                tier_num,
                status,
                last_contacted,
                follow_up_count,
                response_received,
                notes,
                created_at,
            ) = contact

            # Check rate limit
            if sent_count >= MAX_EMAILS_PER_DAY:
                print(f"⚠️  Rate limit reached ({MAX_EMAILS_PER_DAY}/day)")
                break

            # Create personalized email
            subject, body = self.create_email(email, name, company, "initial")

            # Send email
            if self.send_email(email, subject, body):
                # Update database
                cursor = self.db.cursor()
                cursor.execute(
                    """
                    UPDATE contacts 
                    SET status = 'contacted', last_contacted = date('now')
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
                sent_count += 1

                # Rate limiting delay
                time.sleep(DELAY_BETWEEN_EMAILS)

        print(f"\n✅ Sent {sent_count} outreach emails")

    def send_follow_ups(self, limit=5):
        """Send follow-up emails"""
        contacts = self.get_follow_up_contacts()

        if not contacts:
            print("No contacts need follow-up")
            return

        sent_count = 0
        for contact in contacts:
            (
                contact_id,
                email,
                name,
                company,
                tier_num,
                status,
                last_contacted,
                follow_up_count,
                response_received,
                notes,
                created_at,
            ) = contact

            if sent_count >= limit:
                break

            # Determine follow-up template
            template_type = f"follow_up_{follow_up_count + 1}"
            if follow_up_count >= 2:
                template_type = "follow_up_2"

            subject, body = self.create_email(email, name, company, template_type)

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
                sent_count += 1

                time.sleep(DELAY_BETWEEN_EMAILS)

        print(f"\n✅ Sent {sent_count} follow-up emails")

    def get_stats(self):
        """Get outreach statistics"""
        cursor = self.db.cursor()

        cursor.execute("SELECT COUNT(*) FROM contacts")
        total_contacts = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contacts WHERE status = 'contacted'")
        contacted = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM contacts WHERE response_received = TRUE")
        responses = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM emails_sent")
        emails_sent = cursor.fetchone()[0]

        print("\n📊 Outreach Statistics")
        print("=" * 40)
        print(f"Total Contacts: {total_contacts}")
        print(f"Contacted: {contacted}")
        print(f"Responses: {responses}")
        print(f"Emails Sent: {emails_sent}")
        print(
            f"Response Rate: {responses / contacted * 100:.1f}%"
            if contacted > 0
            else "Response Rate: N/A"
        )

    def close(self):
        """Close database connection"""
        if self.db:
            self.db.close()


def main():
    """Main entry point"""
    print("🚀 HyperNexus Outreach Automation")
    print("=" * 40)

    manager = OutreachManager()

    # Add sample contacts (replace with real contacts)
    sample_contacts = [
        (
            "founders@cursor.sh",
            "Cursor Team",
            "Cursor",
            1,
            "AI coding tool - needs token reduction",
        ),
        ("amjad@replit.com", "Amjad Masad", "Replit", 1, "Agent infrastructure"),
        ("jake@railway.app", "Jake Cooper", "Railway", 1, "AI hosting platform"),
        (
            "developers@anthropic.com",
            "Anthropic DevRel",
            "Anthropic",
            2,
            "MCP ecosystem",
        ),
        ("copilot@github.com", "GitHub Copilot", "GitHub", 2, "Copilot infrastructure"),
        ("bd@sourcegraph.com", "Sourcegraph BD", "Sourcegraph", 2, "Cody agent"),
        ("bd@codeium.com", "Codeium BD", "Codeium", 2, "Windsurf agent"),
    ]

    for email, name, company, tier, notes in sample_contacts:
        manager.add_contact(email, name, company, tier, notes)

    # Send outreach
    print("\n📧 Sending outreach emails...")
    manager.send_outreach(limit=3, tier=1)

    # Show stats
    manager.get_stats()

    manager.close()
    print("\n✅ Done!")


if __name__ == "__main__":
    main()
