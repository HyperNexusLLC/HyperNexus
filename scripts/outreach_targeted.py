#!/usr/bin/env python3
"""
HyperNexus Acquisition Outreach - Targeted Technical Pitches
Sends personalized engineering-focused emails to CTOs and founders
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

# Load environment variables
load_dotenv()

# Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_FROM = os.getenv("SMTP_FROM")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Robert Pelloni")

# OAuth2 credentials
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REFRESH_TOKEN = os.getenv("GOOGLE_REFRESH_TOKEN")

DB_FILE = "outreach.db"

# Rate limiting
DELAY_BETWEEN_EMAILS = 30  # seconds


class TargetedOutreach:
    def __init__(self):
        self.db = sqlite3.connect(DB_FILE)
        self.setup_database()
        print(f"SMTP configured: {SMTP_HOST}:{SMTP_PORT}")
        print(f"From: {SMTP_FROM_NAME} <{SMTP_FROM}>")

    def setup_database(self):
        """Initialize database"""
        cursor = self.db.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                company TEXT,
                role TEXT,
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
                FOREIGN KEY (contact_id) REFERENCES contacts(id)
            )
        """)
        self.db.commit()

    def add_contact(self, email, name, company, role, tier=1, notes=""):
        """Add contact to database"""
        cursor = self.db.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO contacts (email, name, company, role, tier, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (email, name, company, role, tier, notes),
            )
            self.db.commit()
            print(f"Added: {name} ({company})")
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            print(f"Exists: {email}")
            return None

    def get_access_token(self):
        """Get fresh OAuth2 access token"""
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
        """Send email via SMTP with OAuth2"""
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

            print(f"  Sent to {to_email}")
            return True
        except Exception as e:
            print(f"  Failed: {to_email} - {e}")
            return False

    def get_cursor_pitch(self):
        """Cursor (Anysphere) - Margin Protection"""
        subject = (
            "Reducing input token costs by ~90% per Cursor seat (Go routing engine)"
        )
        body = """Hi Aman & Michael,

Quick technical note--as Cursor users attach larger codebases, MCP servers, and multi-file contexts, a massive percentage of input tokens on every request are wasted re-ingesting static tool schemas and redundant file trees.

I built HyperNexus, a local-first control plane written in Go (using sqlite-vec) that dynamically selects and routes only relevant tool schemas and context slices into the prompt via local vector similarity before hitting the model API.

Why this matters for Cursor's unit economics:
- Context Payloads: Prunes ~50,000 input tokens down to ~2,500 tokens per turn for tool-heavy workflows.
- Footprint: Single compiled Go binary running locally at <30MB RAM overhead--zero latency penalty.
- Margin Impact: Directly lowers API bill execution costs for pro users on unlimited/usage plans without compromising agent capability.

I'm currently evaluating strategic acquisition and IP licensing options for the technology. I'd love to send over our benchmark suite or a 5-minute integration demo showing how HyperNexus hooks into local agentic loops.

Are you open to a brief conversation next week?

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com
https://hypernexus.site
"""
        return subject, body

    def get_ollama_pitch(self):
        """Ollama - Local Agent Capabilities"""
        subject = "Native MCP tool router for Ollama (Go / sqlite-vec engine)"
        body = """Hi Jeffrey,

Small local models running via Ollama perform exceptionally well on focused prompts, but their context windows quickly degrade--or break entirely--when flooded with dozens of MCP tool schemas and system instructions.

I built HyperNexus, a zero-dependency, local-first control plane in Go that sits alongside local model runtimes to solve this exact bottleneck.

How it enhances the Ollama ecosystem:
- Intelligent Schema Pruning: Uses local embedding vector search (sqlite-vec) to filter down 50+ available MCP tools to just the top 2-3 required for the prompt turn.
- Model Compatibility: Makes 8B/14B local models act like full-scale agentic systems by keeping context windows tiny, clean, and fast.
- Native Fit: 100% Go codebase, fast startup, lightweight (<30MB RAM), and designed specifically for offline/local-first execution.

I'm exploring strategic opportunities to transition or integrate HyperNexus's IP and architecture into a broader local AI platform.

I'd be happy to share the repository architecture and benchmark numbers if you or the engineering team are interested in taking a look.

Best regards,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com
https://hypernexus.site
"""
        return subject, body

    def get_sourcegraph_pitch(self):
        """Sourcegraph (Cody) - Enterprise Efficiency"""
        subject = "Local context optimization & tool routing for Cody (Go architecture)"
        body = """Hi Quinn & Beyang,

As enterprise AI agents evolve to interact with dozens of local tools, internal APIs, and code registries, prompt context bloat is becoming one of the largest drivers of latency and token spend for enterprise deployments.

I developed HyperNexus--a lightweight, local-first control plane written in Go that acts as an intelligent proxy between developer environments and LLMs.

Key technical highlights for Sourcegraph/Cody:
- Progressive Vector Routing: Uses an embedded sqlite-vec index to intercept agent prompts and inject only the strictly necessary tool/schema definitions (cutting input context from 50k+ down to ~2.5k tokens).
- High-Performance Daemon: Native Go implementation with sub-millisecond local routing latency and minimal resource utilization.
- Cross-Tool State: Maintains persistent tool state and shared memory across multi-agent workflows (Claude, Cody, Cursor, Aider).

We are currently assessing strategic acquisition and technology transfer options for HyperNexus.

Given Cody's focus on enterprise-grade code intelligence, I'd welcome the chance to send over our engineering breakdown and benchmark metrics to see if there's alignment with your core platform roadmap.

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com
https://hypernexus.site
"""
        return subject, body

    def get_anthropic_pitch(self):
        """Anthropic - MCP Ecosystem"""
        subject = "MCP infrastructure optimization for Claude's tool ecosystem"
        body = """Hi Anthropic Team,

As MCP adoption grows across the Claude ecosystem, tool context management is becoming a critical bottleneck. Every MCP server added to a user's configuration increases the input token payload, regardless of whether those tools are relevant to the current query.

I built HyperNexus, a local-first control plane in Go that solves this with progressive vector routing:

Technical highlights:
- sqlite-vec embeddings: Local vector similarity search to match user intent to relevant MCP tools
- 92.7% token reduction: From ~9,000 tokens to ~660 tokens per request (benchmark suite included)
- Zero dependencies: Single Go binary, <30MB RAM, cross-platform
- MCP-native: Sits between clients and servers as an intelligent proxy

This directly benefits Claude users by:
1. Reducing API costs for tool-heavy workflows
2. Enabling more tools without context window penalties
3. Improving response quality by reducing noise

I'm exploring strategic acquisition opportunities. Would your team be interested in reviewing the benchmark suite and architecture breakdown?

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com
https://hypernexus.site
"""
        return subject, body

    def get_github_pitch(self):
        """GitHub (Copilot) - Copilot Infrastructure"""
        subject = "Token optimization for Copilot's MCP tool routing"
        body = """Hi GitHub Copilot Team,

As Copilot expands to support more MCP servers and tool integrations, the input token overhead for tool schemas becomes a significant cost driver--especially at scale across millions of users.

I built HyperNexus, a Go-native control plane that reduces MCP tool context by 92.7% using local vector-based progressive routing:

Key metrics:
- 76 tools loaded -> 2-7 tools per query (based on intent)
- 8,994 tokens -> 660 tokens average per request
- $30,003/year savings at 100K requests/month (Claude 3.5 Sonnet)

Architecture:
- Single compiled Go binary (~15MB)
- sqlite-vec local vector embeddings
- Zero external dependencies
- Sub-millisecond routing latency

This could significantly improve Copilot's unit economics while enabling users to connect more MCP servers without token budget concerns.

I'm evaluating strategic acquisition options. Happy to share the benchmark suite for your team to validate.

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com
https://hypernexus.site
"""
        return subject, body

    def send_targeted_outreach(self):
        """Send all targeted pitches"""
        # Define contacts and their pitches
        targets = [
            {
                "email": "aman@anysphere.cursor.sh",
                "name": "Aman Sanger",
                "company": "Cursor (Anysphere)",
                "role": "Co-Founder",
                "pitch": self.get_cursor_pitch,
                "notes": "Margin protection - token cost reduction",
            },
            {
                "email": "michael@anysphere.cursor.sh",
                "name": "Michael Truell",
                "company": "Cursor (Anysphere)",
                "role": "Co-Founder",
                "pitch": self.get_cursor_pitch,
                "notes": "Margin protection - token cost reduction",
            },
            {
                "email": "jmorgan@ollama.ai",
                "name": "Jeffrey Morgan",
                "company": "Ollama",
                "role": "Founder",
                "pitch": self.get_ollama_pitch,
                "notes": "Local agent capabilities - model enhancement",
            },
            {
                "email": "quinn@sourcegraph.com",
                "name": "Quinn Slack",
                "company": "Sourcegraph",
                "role": "CEO",
                "pitch": self.get_sourcegraph_pitch,
                "notes": "Enterprise efficiency - Cody optimization",
            },
            {
                "email": "beyang@sourcegraph.com",
                "name": "Beyang Liu",
                "company": "Sourcegraph",
                "role": "CTO",
                "pitch": self.get_sourcegraph_pitch,
                "notes": "Enterprise efficiency - Cody optimization",
            },
            {
                "email": "developers@anthropic.com",
                "name": "Anthropic DevRel",
                "company": "Anthropic",
                "role": "Developer Relations",
                "pitch": self.get_anthropic_pitch,
                "notes": "MCP ecosystem - tool routing",
            },
            {
                "email": "copilot@github.com",
                "name": "GitHub Copilot",
                "company": "GitHub",
                "role": "Product Team",
                "pitch": self.get_github_pitch,
                "notes": "Copilot infrastructure - token optimization",
            },
        ]

        print("=" * 60)
        print("HyperNexus Targeted Acquisition Outreach")
        print("=" * 60)
        print()

        sent_count = 0
        for target in targets:
            print(f"Sending to {target['name']} ({target['company']})...")

            # Add contact
            self.add_contact(
                target["email"],
                target["name"],
                target["company"],
                target["role"],
                tier=1,
                notes=target["notes"],
            )

            # Get pitch
            subject, body = target["pitch"]()

            # Send email
            if self.send_email(target["email"], subject, body):
                # Update database
                cursor = self.db.cursor()
                cursor.execute(
                    """
                    UPDATE contacts 
                    SET status = 'contacted', last_contacted = date('now')
                    WHERE email = ?
                """,
                    (target["email"],),
                )
                cursor.execute(
                    """
                    INSERT INTO emails_sent (contact_id, subject, body)
                    SELECT id, ?, ? FROM contacts WHERE email = ?
                """,
                    (subject, body, target["email"]),
                )
                self.db.commit()
                sent_count += 1

            time.sleep(DELAY_BETWEEN_EMAILS)

        print()
        print("=" * 60)
        print(f"Sent {sent_count} targeted outreach emails")
        print("=" * 60)

        # Show stats
        cursor = self.db.cursor()
        cursor.execute("SELECT COUNT(*) FROM contacts")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM contacts WHERE status = 'contacted'")
        contacted = cursor.fetchone()[0]

        print(f"\nDatabase: {total} contacts, {contacted} contacted")

    def close(self):
        self.db.close()


def main():
    outreach = TargetedOutreach()
    outreach.send_targeted_outreach()
    outreach.close()


if __name__ == "__main__":
    main()
