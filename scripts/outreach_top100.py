#!/usr/bin/env python3
"""
HyperNexus Top 100 AI Company Outreach
Comprehensive acquisition outreach to the top AI companies
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

# SMTP Config
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_FROM = os.getenv('SMTP_FROM')
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Robert Pelloni')
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN')

DB_FILE = 'outreach.db'
DELAY_BETWEEN_EMAILS = 25  # seconds


# ============================================================
# TOP 100 AI COMPANIES - CATEGORIZED BY ACQUISITION FIT
# ============================================================

COMPANIES = {
    # TIER 1: AI CODING TOOLS (Highest Priority)
    "ai_coding": [
        {"name": "Cursor", "contacts": ["aman@anysphere.cursor.sh", "michael@anysphere.cursor.sh"], "pitch": "cursor", "why": "Margin protection - 92% token reduction per seat"},
        {"name": "Sourcegraph", "contacts": ["quinn@sourcegraph.com", "beyang@sourcegraph.com"], "pitch": "sourcegraph", "why": "Enterprise efficiency - Cody optimization"},
        {"name": "Replit", "contacts": ["amjad@replit.com", "michele@replit.com"], "pitch": "replit", "why": "Agent infrastructure - local memory"},
        {"name": "Codeium", "contacts": ["varun@codeium.com", "jeff@codeium.com"], "pitch": "codeium", "why": "Windsurf agent - MCP integration"},
        {"name": "Poolside", "contacts": ["jason@poolside.ai", "saunder@poolside.ai"], "pitch": "poolside", "why": "Local-first code generation"},
        {"name": "Tabnine", "contacts": ["doron@tabnine.com", "erez@tabnine.com"], "pitch": "tabnine", "why": "Enterprise code completion"},
        {"name": "Continue", "contacts": ["nate@continue.dev", "ty@continue.dev"], "pitch": "continue", "why": "Open-source AI IDE"},
        {"name": "Aider", "contacts": ["paul@gitpair.com"], "pitch": "aider", "why": "Terminal AI coding"},
        {"name": "Cline", "contacts": ["saoud@cline.bot"], "pitch": "cline", "why": "VS Code AI agent"},
        {"name": "Copilot", "contacts": ["copilot@github.com"], "pitch": "github", "why": "Token optimization at scale"},
    ],
    
    # TIER 2: LOCAL AI PLATFORMS
    "local_ai": [
        {"name": "Ollama", "contacts": ["jmorgan@ollama.ai", "michael@ollama.ai"], "pitch": "ollama", "why": "Local model enhancement"},
        {"name": "LM Studio", "contacts": ["yagil@lmstudio.ai"], "pitch": "lmstudio", "why": "Local model runtime"},
        {"name": "Jan.ai", "contacts": ["hien@jan.ai", "nam@jan.ai"], "pitch": "jan", "why": "Local AI assistant"},
        {"name": "AnythingLLM", "contacts": ["tim@anythingllm.com"], "pitch": "anythingllm", "why": "Local RAG platform"},
        {"name": "GPT4All", "contacts": ["team@nomic.ai"], "pitch": "gpt4all", "why": "Local LLM ecosystem"},
        {"name": "llama.cpp", "contacts": ["ggerganov@gmail.com"], "pitch": "llamacpp", "why": "Core inference engine"},
        {"name": "vLLM", "contacts": ["info@vllm.ai"], "pitch": "vllm", "why": "High-performance inference"},
        {"name": "Oobabooga", "contacts": ["oobabooga@github.com"], "pitch": "oobabooga", "why": "Text generation UI"},
        {"name": "KoboldAI", "contacts": ["koboldai@github.com"], "pitch": "koboldai", "why": "Local AI writing"},
        {"name": "LocalAI", "contacts": ["info@localai.io"], "pitch": "localai", "why": "OpenAI-compatible local API"},
    ],
    
    # TIER 3: AI FRAMEWORKS & SDKs
    "frameworks": [
        {"name": "LangChain", "contacts": ["harrison@langchain.dev", "ankush@langchain.dev"], "pitch": "langchain", "why": "Agent framework integration"},
        {"name": "LlamaIndex", "contacts": ["jerry@llamaindex.ai", "simon@llamaindex.ai"], "pitch": "llamaindex", "why": "RAG framework optimization"},
        {"name": "Vercel", "contacts": ["rauchg@vercel.com", "lee@vercel.com"], "pitch": "vercel", "why": "AI SDK token optimization"},
        {"name": "CrewAI", "contacts": ["joao@crewai.com"], "pitch": "crewai", "why": "Multi-agent orchestration"},
        {"name": "AutoGPT", "contacts": ["team@agpt.co"], "pitch": "autogpt", "why": "Agent infrastructure"},
        {"name": "MetaGPT", "contacts": ["team@deepwisdom.ai"], "pitch": "metagpt", "why": "Multi-agent framework"},
        {"name": "Semantic Kernel", "contacts": ["sk@microsoft.com"], "pitch": "semantickernel", "why": "Microsoft AI framework"},
        {"name": "Haystack", "contacts": ["support@deepset.ai"], "pitch": "haystack", "why": "NLP framework"},
        {"name": "DSPy", "contacts": ["okhattab@stanford.edu"], "pitch": "dspy", "why": "Programming framework"},
        {"name": "Pydantic AI", "contacts": ["samuel@pydantic.dev"], "pitch": "pydantic", "why": "Type-safe AI agents"},
    ],
    
    # TIER 4: AI MODEL PROVIDERS
    "model_providers": [
        {"name": "Anthropic", "contacts": ["developers@anthropic.com"], "pitch": "anthropic", "why": "MCP ecosystem optimization"},
        {"name": "OpenAI", "contacts": ["partnerships@openai.com"], "pitch": "openai", "why": "Tool use optimization"},
        {"name": "Mistral", "contacts": ["team@mistral.ai"], "pitch": "mistral", "why": "European AI efficiency"},
        {"name": "Cohere", "contacts": ["support@cohere.com"], "pitch": "cohere", "why": "Enterprise AI"},
        {"name": "AI21 Labs", "contacts": ["team@ai21.com"], "pitch": "ai21", "why": "Jurassic model optimization"},
        {"name": "Stability AI", "contacts": ["info@stability.ai"], "pitch": "stability", "why": "Open model ecosystem"},
        {"name": "Inflection", "contacts": ["team@inflection.ai"], "pitch": "inflection", "why": "Pi assistant"},
        {"name": "Adept", "contacts": ["team@adept.ai"], "pitch": "adept", "why": "Action agents"},
        {"name": "Character AI", "contacts": ["team@character.ai"], "pitch": "characterai", "why": "Conversational AI"},
        {"name": "xAI", "contacts": ["team@x.ai"], "pitch": "xai", "why": "Grok optimization"},
    ],
    
    # TIER 5: AI INFRASTRUCTURE
    "infrastructure": [
        {"name": "Hugging Face", "contacts": ["julien@huggingface.co", "clem@huggingface.co"], "pitch": "huggingface", "why": "Model hub optimization"},
        {"name": "Weights & Biases", "contacts": ["chris@wandb.com", "shawn@wandb.com"], "pitch": "wandb", "why": "ML experiment tracking"},
        {"name": "Pinecone", "contacts": ["david@pinecone.io", "ed@pinecone.io"], "pitch": "pinecone", "why": "Vector DB integration"},
        {"name": "Weaviate", "contacts": ["bob@weaviate.io"], "pitch": "weaviate", "why": "Vector search"},
        {"name": "Chroma", "contacts": ["jeff@trychroma.com"], "pitch": "chroma", "why": "Embedding database"},
        {"name": "Qdrant", "contacts": ["andrey@qdrant.tech"], "pitch": "qdrant", "why": "Vector similarity"},
        {"name": "Milvus", "contacts": ["info@zilliz.com"], "pitch": "milvus", "why": "Vector database"},
        {"name": "Modal", "contacts": ["erik@modal.com"], "pitch": "modal", "why": "Serverless AI"},
        {"name": "Replicate", "contacts": ["ben@replicate.com"], "pitch": "replicate", "why": "Model hosting"},
        {"name": "Together AI", "contacts": ["info@together.ai"], "pitch": "together", "why": "Inference platform"},
    ],
    
    # TIER 6: AI AGENTS & AUTOMATION
    "agents": [
        {"name": "Langflow", "contacts": ["team@langflow.org"], "pitch": "langflow", "why": "Agent builder"},
        {"name": "Flowise", "contacts": ["team@flowiseai.com"], "pitch": "flowise", "why": "LLM orchestration"},
        {"name": "Dify", "contacts": ["team@dify.ai"], "pitch": "dify", "why": "LLM app platform"},
        {"name": "n8n", "contacts": ["jan@n8n.io"], "pitch": "n8n", "why": "Workflow automation"},
        {"name": "Zapier", "contacts": ["ai@zapier.com"], "pitch": "zapier", "why": "AI automation"},
        {"name": "Make", "contacts": ["ai@make.com"], "pitch": "make", "why": "Visual automation"},
        {"name": "Relevance AI", "contacts": ["jack@relevanceai.com"], "pitch": "relevanceai", "why": "AI workforce"},
        {"name": "Superagent", "contacts": ["team@superagent.sh"], "pitch": "superagent", "why": "AI assistant framework"},
        {"name": "AgentGPT", "contacts": ["team@reworkd.ai"], "pitch": "agentgpt", "why": "Autonomous agents"},
        {"name": "BabyAGI", "contacts": ["yohei@babyagi.org"], "pitch": "babyagi", "why": "Task management"},
    ],
    
    # TIER 7: AI FOR DEVELOPERS
    "devtools": [
        {"name": "Linear", "contacts": ["karri@linear.app"], "pitch": "linear", "why": "AI-powered project management"},
        {"name": "Notion", "contacts": ["ai@notion.so"], "pitch": "notion", "why": "AI workspace"},
        {"name": "Figma", "contacts": ["ai@figma.com"], "pitch": "figma", "why": "AI design tools"},
        {"name": "Vercel", "contacts": ["rauchg@vercel.com"], "pitch": "vercel", "why": "v0 AI agent"},
        {"name": "Netlify", "contacts": ["ai@netlify.com"], "pitch": "netlify", "why": "AI deployment"},
        {"name": "Railway", "contacts": ["jake@railway.app"], "pitch": "railway", "why": "AI hosting"},
        {"name": "Fly.io", "contacts": ["team@fly.io"], "pitch": "flyio", "why": "Edge AI deployment"},
        {"name": "Supabase", "contacts": ["team@supabase.com"], "pitch": "supabase", "why": "AI-ready backend"},
        {"name": "Firebase", "contacts": ["firebase@google.com"], "pitch": "firebase", "why": "Google AI integration"},
        {"name": "Appwrite", "contacts": ["team@appwrite.io"], "pitch": "appwrite", "why": "Open-source backend"},
    ],
    
    # TIER 8: AI RESEARCH & ENTERPRISE
    "enterprise": [
        {"name": "Scale AI", "contacts": ["alexandr@scale.com"], "pitch": "scaleai", "why": "Data infrastructure"},
        {"name": "Labelbox", "contacts": ["team@labelbox.com"], "pitch": "labelbox", "why": "Data labeling"},
        {"name": "Snorkel AI", "contacts": ["team@snorkel.ai"], "pitch": "snorkel", "why": "Data-centric AI"},
        {"name": "Weights & Biases", "contacts": ["chris@wandb.com"], "pitch": "wandb", "why": "MLOps"},
        {"name": "Comet ML", "contacts": ["team@comet.com"], "pitch": "comet", "why": "ML experiment tracking"},
        {"name": "Neptune.ai", "contacts": ["team@neptune.ai"], "pitch": "neptune", "why": "ML metadata"},
        {"name": "RunPod", "contacts": ["team@runpod.io"], "pitch": "runpod", "why": "GPU cloud"},
        {"name": "Lambda", "contacts": ["team@lambdalabs.com"], "pitch": "lambda", "why": "GPU cloud"},
        {"name": "CoreWeave", "contacts": ["team@coreweave.com"], "pitch": "coreweave", "why": "GPU infrastructure"},
        {"name": "Anyscale", "contacts": ["team@anyscale.com"], "pitch": "anyscale", "why": "Ray distributed AI"},
    ],
    
    # TIER 9: AI ASSISTANTS & PRODUCTS
    "products": [
        {"name": "Perplexity", "contacts": ["aravind@perplexity.ai"], "pitch": "perplexity", "why": "AI search optimization"},
        {"name": "You.com", "contacts": ["richard@you.com"], "pitch": "youcom", "why": "AI search"},
        {"name": "Phind", "contacts": ["team@phind.com"], "pitch": "phind", "why": "AI code search"},
        {"name": "Poe", "contacts": ["team@poe.com"], "pitch": "poe", "why": "AI chat platform"},
        {"name": "ChatGPT", "contacts": ["partnerships@openai.com"], "pitch": "chatgpt", "why": "Tool use optimization"},
        {"name": "Claude", "contacts": ["developers@anthropic.com"], "pitch": "claude", "why": "MCP optimization"},
        {"name": "Gemini", "contacts": ["gemini@google.com"], "pitch": "gemini", "why": "Google AI integration"},
        {"name": "Copilot", "contacts": ["copilot@github.com"], "pitch": "copilot", "why": "Code assistant"},
        {"name": "Midjourney", "contacts": ["team@midjourney.com"], "pitch": "midjourney", "why": "AI image generation"},
        {"name": "Runway", "contacts": ["team@runwayml.com"], "pitch": "runway", "why": "AI video generation"},
    ],
    
    # TIER 10: EMERGING AI COMPANIES
    "emerging": [
        {"name": "Cognition AI", "contacts": ["team@cognition.ai"], "pitch": "cognition", "why": "Devin AI engineer"},
        {"name": "Magic AI", "contacts": ["team@magic.dev"], "pitch": "magic", "why": "AI coding"},
        {"name": "Augment", "contacts": ["team@augmentcode.com"], "pitch": "augment", "why": "AI coding assistant"},
        {"name": "Codegen", "contacts": ["team@codegen.com"], "pitch": "codegen", "why": "AI code generation"},
        {"name": "Factory", "contacts": ["team@factory.ai"], "pitch": "factory", "why": "AI software engineering"},
        {"name": "Codium", "contacts": ["team@codium.ai"], "pitch": "codium", "why": "AI code integrity"},
        {"name": "Qodo", "contacts": ["team@qodo.ai"], "pitch": "qodo", "why": "AI code quality"},
        {"name": "Sweep", "contacts": ["team@sweep.dev"], "pitch": "sweep", "why": "AI bug fixing"},
        {"name": "Sourcery", "contacts": ["team@sourcery.ai"], "pitch": "sourcery", "why": "AI code review"},
        {"name": "Pieces", "contacts": ["team@pieces.app"], "pitch": "pieces", "why": "AI code snippets"},
    ],
}


def get_pitch(category, company_name):
    """Get personalized pitch based on category"""
    
    pitches = {
        "cursor": {
            "subject": "Reducing input token costs by ~90% per Cursor seat (Go routing engine)",
            "body": """Hi,

Quick technical note--as Cursor users attach larger codebases, MCP servers, and multi-file contexts, a massive percentage of input tokens on every request are wasted re-ingesting static tool schemas and redundant file trees.

I built HyperNexus, a local-first control plane written in Go (using sqlite-vec) that dynamically selects and routes only relevant tool schemas and context slices into the prompt via local vector similarity before hitting the model API.

Why this matters for {company}'s unit economics:
- Context Payloads: Prunes ~50,000 input tokens down to ~2,500 tokens per turn for tool-heavy workflows.
- Footprint: Single compiled Go binary running locally at <30MB RAM overhead--zero latency penalty.
- Margin Impact: Directly lowers API bill execution costs for pro users on unlimited/usage plans without compromising agent capability.

Benchmark suite ready to run in 60 seconds: https://github.com/robertpelloni/HyperNexus

Are you open to a brief conversation?

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com"""
        },
        "ollama": {
            "subject": "Native MCP tool router for Ollama (Go / sqlite-vec engine)",
            "body": """Hi,

Small local models running via {company} perform exceptionally well on focused prompts, but their context windows quickly degrade--or break entirely--when flooded with dozens of MCP tool schemas and system instructions.

I built HyperNexus, a zero-dependency, local-first control plane in Go that sits alongside local model runtimes to solve this exact bottleneck.

How it enhances {company}:
- Intelligent Schema Pruning: Uses local embedding vector search (sqlite-vec) to filter down 50+ available MCP tools to just the top 2-3 required for the prompt turn.
- Model Compatibility: Makes 8B/14B local models act like full-scale agentic systems by keeping context windows tiny, clean, and fast.
- Native Fit: 100% Go codebase, fast startup, lightweight (<30MB RAM), and designed specifically for offline/local-first execution.

I'm exploring strategic acquisition opportunities. Happy to share the architecture breakdown.

Best regards,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com"""
        },
        "sourcegraph": {
            "subject": "Local context optimization & tool routing for Cody (Go architecture)",
            "body": """Hi,

As enterprise AI agents evolve to interact with dozens of local tools, internal APIs, and code registries, prompt context bloat is becoming one of the largest drivers of latency and token spend for enterprise deployments.

I developed HyperNexus--a lightweight, local-first control plane written in Go that acts as an intelligent proxy between developer environments and LLMs.

Key technical highlights for {company}:
- Progressive Vector Routing: Uses an embedded sqlite-vec index to intercept agent prompts and inject only the strictly necessary tool/schema definitions (cutting input context from 50k+ down to ~2.5k tokens).
- High-Performance Daemon: Native Go implementation with sub-millisecond local routing latency and minimal resource utilization.
- Cross-Tool State: Maintains persistent tool state and shared memory across multi-agent workflows.

We are currently assessing strategic acquisition options. I'd welcome the chance to send over our engineering breakdown and benchmark metrics.

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com"""
        },
        "framework": {
            "subject": "Token optimization for {company}'s agent framework (92.7% reduction)",
            "body": """Hi,

As {company} users build increasingly complex agent workflows with multiple tool integrations, input token overhead becomes a significant cost and latency driver.

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

This could significantly improve {company}'s unit economics while enabling users to connect more tools without token budget concerns.

Benchmark suite: https://github.com/robertpelloni/HyperNexus

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com"""
        },
        "default": {
            "subject": "92.7% token reduction for {company}'s AI infrastructure (Go daemon)",
            "body": """Hi,

Quick technical note--most AI agents waste 80-90% of their input tokens re-reading massive tool schemas on every API call.

I built HyperNexus, a local-first control plane in Go (sqlite-vec) that dynamically routes only relevant tool schemas into context via vector similarity.

Results:
- Context payload: 50,000 tokens -> 2,500 tokens (92.7% reduction)
- Single binary: ~15MB, <30MB RAM, zero dependencies
- Annual savings: $30,003/year at 100K requests/month (Claude 3.5 Sonnet)

I'm evaluating strategic acquisition opportunities for the technology and IP.

Benchmark suite ready to run: https://github.com/robertpelloni/HyperNexus

Would you be open to a brief conversation?

Best,
Robert Pelloni
Creator of HyperNexus | robertpelloni.com"""
        }
    }
    
    # Find the right pitch
    for key in pitches:
        if key in company_name.lower() or key in category:
            pitch = pitches[key]
            return pitch["subject"].format(company=company_name), pitch["body"].format(company=company_name)
    
    # Default pitch
    pitch = pitches["default"]
    return pitch["subject"].format(company=company_name), pitch["body"].format(company=company_name)


class Top100Outreach:
    def __init__(self):
        self.db = sqlite3.connect(DB_FILE)
        self.setup_database()
        print(f"SMTP: {SMTP_HOST}:{SMTP_PORT}")
        print(f"From: {SMTP_FROM_NAME} <{SMTP_FROM}>")
    
    def setup_database(self):
        cursor = self.db.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            company TEXT,
            role TEXT,
            category TEXT,
            tier INTEGER DEFAULT 1,
            status TEXT DEFAULT 'pending',
            last_contacted DATE,
            follow_up_count INTEGER DEFAULT 0,
            response_received BOOLEAN DEFAULT FALSE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS emails_sent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact_id INTEGER,
            subject TEXT,
            body TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contact_id) REFERENCES contacts(id)
        )''')
        self.db.commit()
    
    def add_contact(self, email, company, category, tier=1, notes=""):
        cursor = self.db.cursor()
        try:
            cursor.execute('INSERT INTO contacts (email, company, category, tier, notes) VALUES (?, ?, ?, ?, ?)',
                          (email, company, category, tier, notes))
            self.db.commit()
            return True
        except sqlite3.IntegrityError:
            return False
    
    def get_access_token(self):
        data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'refresh_token': GOOGLE_REFRESH_TOKEN,
            'grant_type': 'refresh_token'
        }
        response = requests.post('https://oauth2.googleapis.com/token', data=data)
        if response.status_code == 200:
            return response.json()['access_token']
        raise Exception(f"Token refresh failed: {response.text}")
    
    def send_email(self, to_email, subject, body):
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            access_token = self.get_access_token()
            auth_string = f"user={SMTP_USERNAME}\x01auth=Bearer {access_token}\x01\x01"
            auth_bytes = base64.b64encode(auth_string.encode('ascii')).decode('ascii')
            
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.docmd('AUTH', 'XOAUTH2 ' + auth_bytes)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"  Error: {e}")
            return False
    
    def send_batch(self, limit=20):
        """Send batch of outreach emails"""
        cursor = self.db.cursor()
        cursor.execute('''SELECT id, email, company, category FROM contacts 
                         WHERE status = 'pending' ORDER BY tier ASC, id ASC LIMIT ?''', (limit,))
        pending = cursor.fetchall()
        
        if not pending:
            print("No pending contacts")
            return 0
        
        sent = 0
        for contact_id, email, company, category in pending:
            subject, body = get_pitch(category or "default", company)
            
            print(f"Sending to {email} ({company})...")
            if self.send_email(email, subject, body):
                cursor.execute("UPDATE contacts SET status = 'contacted', last_contacted = date('now') WHERE id = ?", (contact_id,))
                cursor.execute("INSERT INTO emails_sent (contact_id, subject, body) VALUES (?, ?, ?)", (contact_id, subject, body))
                self.db.commit()
                sent += 1
                time.sleep(DELAY_BETWEEN_EMAILS)
        
        return sent
    
    def load_all_companies(self):
        """Load all companies into database"""
        total = 0
        for category, companies in COMPANIES.items():
            for company in companies:
                for email in company["contacts"]:
                    if self.add_contact(email, company["name"], category, tier=1, notes=company["why"]):
                        total += 1
        return total
    
    def get_stats(self):
        cursor = self.db.cursor()
        cursor.execute("SELECT COUNT(*) FROM contacts")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM contacts WHERE status = 'contacted'")
        contacted = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM contacts WHERE status = 'pending'")
        pending = cursor.fetchone()[0]
        cursor.execute("SELECT category, COUNT(*) FROM contacts GROUP BY category")
        by_category = cursor.fetchall()
        
        print(f"\nDatabase: {total} contacts ({contacted} contacted, {pending} pending)")
        print("\nBy category:")
        for cat, count in by_category:
            print(f"  {cat}: {count}")
    
    def close(self):
        self.db.close()


def main():
    print("=" * 60)
    print("HyperNexus Top 100 AI Company Outreach")
    print("=" * 60)
    
    outreach = Top100Outreach()
    
    # Load all companies
    print("\nLoading companies...")
    loaded = outreach.load_all_companies()
    print(f"Loaded {loaded} new contacts")
    
    # Show stats
    outreach.get_stats()
    
    # Send batch
    print("\n" + "=" * 60)
    print("Sending outreach emails...")
    print("=" * 60)
    
    sent = outreach.send_batch(limit=20)
    print(f"\nSent {sent} emails")
    
    # Final stats
    outreach.get_stats()
    
    outreach.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
