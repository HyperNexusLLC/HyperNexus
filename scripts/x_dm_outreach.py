#!/usr/bin/env python3
"""
HyperNexus X/Twitter DM Outreach Automation
Prepares DM scripts for AI company decision makers
"""

import json
from datetime import datetime

# X/Twitter handles for AI company decision makers
TARGETS = [
    # AI Coding
    {"name": "Aman Sanger", "handle": "amanasanger", "company": "Cursor", "note": "Co-Founder/CEO"},
    {"name": "Michael Truell", "handle": "truell20", "company": "Cursor", "note": "Co-Founder"},
    {"name": "Quinn Slack", "handle": "sqs", "company": "Sourcegraph", "note": "CEO"},
    {"name": "Beyang Liu", "handle": "beyang", "company": "Sourcegraph", "note": "CTO"},
    {"name": "Amjad Masad", "handle": "amasad", "company": "Replit", "note": "CEO"},
    {"name": "Jeffrey Morgan", "handle": "jmorgan_", "company": "Ollama", "note": "Founder"},
    {"name": "Varun Mohan", "handle": "varun_mohan", "company": "Codeium", "note": "CEO"},
    {"name": "Jason Warner", "handle": "jasoncwarner", "company": "Poolside", "note": "CEO"},
    {"name": "Harrison Chase", "handle": "hwchase17", "company": "LangChain", "note": "CEO"},
    {"name": "Jerry Liu", "handle": "jerryjliu0", "company": "LlamaIndex", "note": "CEO"},
    {"name": "Guillermo Rauch", "handle": "rauchg", "company": "Vercel", "note": "CEO"},
    {"name": "Aravind Srinivas", "handle": "AravindSrinivas", "company": "Perplexity", "note": "CEO"},
    {"name": "Sam Altman", "handle": "sama", "company": "OpenAI", "note": "CEO"},
    {"name": "Dario Amodei", "handle": "DarioAmodei", "company": "Anthropic", "note": "CEO"},
    {"name": "Jared Kaplan", "handle": "jaredkaplan", "company": "Anthropic", "note": "Chief Science Officer"},
    {"name": "Jan Leike", "handle": "janleike", "company": "Anthropic", "note": "Alignment"},
    {"name": "Demis Hassabis", "handle": "demishassabis", "company": "DeepMind", "note": "CEO"},
    {"name": "Mustafa Suleyman", "handle": "mustafasuleyman", "company": "Microsoft AI", "note": "CEO"},
    {"name": "Mira Murati", "handle": "miramurati", "company": "OpenAI", "note": "CTO"},
    {"name": "Emad Mostaque", "handle": "EMostaque", "company": "Stability AI", "note": "Founder"},
    {"name": "David Holz", "handle": "DavidSHolz", "company": "Midjourney", "note": "CEO"},
    {"name": "Alexandr Wang", "handle": "alexandr_wang", "company": "Scale AI", "note": "CEO"},
    {"name": "Igor Babuschkin", "handle": "ibab", "company": "xAI", "note": "Co-Founder"},
    {"name": "Tim Brooks", "handle": "timbrooks", "company": "OpenAI", "note": "Research"},
    {"name": "Noam Shazeer", "handle": "noamshazeer", "company": "Character AI", "note": "CEO"},
    {"name": "Jim Fan", "handle": "DrJimFan", "company": "NVIDIA", "note": "Senior Research"},
    {"name": "Andrej Karpathy", "handle": "karpathy", "company": "Eureka Labs", "note": "Founder"},
    {"name": "Chris Lattner", "handle": "clattner_llvm", "company": "Modular AI", "note": "CEO"},
    {"name": "Arthur Mensch", "handle": "arthurmensch", "company": "Mistral", "note": "CEO"},
    {"name": "Dylan Field", "handle": "zoink", "company": "Figma", "note": "CEO"},
]

DM_TEMPLATES = {
    "default": "Hey {first_name}, dropped a note to your inbox re: cutting AI agent token costs by 92.7% via a native Go routing engine (sqlite-vec). Benchmark package is ready to run. Would love to connect!",
    "cursor": "Hey {first_name}, sent a short technical note to your email on reducing input token costs by ~90% per seat using local vector-based tool routing. Happy to share the benchmark suite. Let me know!",
    "ollama": "Hey {first_name}, dropped a brief message re: native MCP tool schema routing in Go to keep local 8B/14B context windows light. Would love to share the architecture breakdown if you're interested!",
    "sourcegraph": "Hey {first_name}, sent a quick technical overview to your email on zero-dependency tool schema pruning for agentic workflows. Checked in a 60s benchmark script to prove the token reduction. Let me know if you'd like to take a look!",
    "anthropic": "Hey {first_name}, dropped a technical note re: optimizing MCP tool schema routing for agentic workflows - 92.7% token reduction with local vector routing. Would love to share the architecture if interested!",
}


def get_dm_template(company):
    company_lower = company.lower()
    if "cursor" in company_lower:
        return DM_TEMPLATES["cursor"]
    if "ollama" in company_lower:
        return DM_TEMPLATES["ollama"]
    if "sourcegraph" in company_lower:
        return DM_TEMPLATES["sourcegraph"]
    if "anthropic" in company_lower or "claude" in company_lower:
        return DM_TEMPLATES["anthropic"]
    return DM_TEMPLATES["default"]


def generate_dm_scripts():
    scripts = []
    for target in TARGETS:
        first_name = target["name"].split()[0]
        template = get_dm_template(target["company"])
        dm = template.format(first_name=first_name)
        scripts.append({
            "target": target["name"],
            "handle": target["handle"],
            "company": target["company"],
            "note": target["note"],
            "dm": dm,
            "url": f"https://twitter.com/messages/compose?recipient_id={target['handle']}"
        })
    return scripts


def save_scripts(scripts):
    output = []
    output.append("# X/Twitter DM Scripts — HyperNexus Outreach\n")
    output.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
    output.append(f"Total targets: {len(scripts)}\n")
    output.append("\n---\n")

    for s in scripts:
        output.append(f"## {s['target']} ({s['company']}) — {s['note']}")
        output.append(f"Handle: @{s['handle']}")
        output.append(f"DM URL: {s['url']}\n")
        output.append("```")
        output.append(s['dm'])
        output.append("```")
        output.append("\n---\n")

    content = "\n".join(output)
    try:
        with open('../docs/X_TWITTER_DM_SCRIPTS.md', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Saved 31 DM scripts to ../docs/X_TWITTER_DM_SCRIPTS.md")
    except OSError as e:
        print(f"Could not save: {e}")

    # Also save JSON for potential automation
    try:
        with open('x_dm_targets.json', 'w', encoding='utf-8') as f:
            json.dump(scripts, f, indent=2)
        print("Saved x_dm_targets.json")
    except OSError as e:
        print(f"Could not save JSON: {e}")


def main():
    print("=" * 60)
    print("HyperNexus X/Twitter DM Outreach")
    print("=" * 60)

    scripts = generate_dm_scripts()
    save_scripts(scripts)

    print(f"\nGenerated {len(scripts)} DM scripts")
    print("\nSample DMs:")
    for s in scripts[:5]:
        print(f"\n@{s['handle']} ({s['company']}):")
        print(f"  {s['dm']}")


if __name__ == "__main__":
    main()
