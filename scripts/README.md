# HyperNexus Outreach Automation

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Get Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Desktop app"
   - Name: "HyperNexus Outreach"
   - Click "Create"
5. Download JSON and save as `credentials.json` in this directory

### 3. First Run

```bash
python outreach_automation.py
```

On first run, it will:

1. Open browser for Google OAuth consent
2. Ask you to sign in with <HyperNexusOfficialLLC@gmail.com>
3. Grant permissions to send emails
4. Save token for future runs

### 4. Add Contacts

Edit `outreach_automation.py` and add contacts to the `sample_contacts` list:

```python
sample_contacts = [
    ("email@example.com", "Name", "Company", tier, "Notes"),
    # ...
]
```

### 5. Run Outreach

```bash
# Send initial outreach (Tier 1 contacts)
python outreach_automation.py

# The script will:
# 1. Add contacts to database
# 2. Send personalized emails
# 3. Track everything in outreach.db
# 4. Show statistics
```

## File Structure

```
scripts/
├── outreach_automation.py  # Main automation script
├── credentials.json        # Gmail API credentials (DO NOT COMMIT)
├── token.json             # OAuth token (auto-generated)
├── outreach.db            # SQLite database (auto-generated)
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

## Features

- **Personalized emails** with company-specific content
- **Rate limiting** (50 emails/day max, 30s delay between)
- **Follow-up automation** (3 follow-ups, 5 days apart)
- **Response tracking** in SQLite database
- **Statistics dashboard** with response rates

## Usage

```python
from outreach_automation import OutreachManager

manager = OutreachManager()

# Add contact
manager.add_contact("email@example.com", "Name", "Company", tier=1)

# Send outreach
manager.send_outreach(limit=5, tier=1)

# Send follow-ups
manager.send_follow_ups(limit=5)

# Get stats
manager.get_stats()

manager.close()
```

## Important Notes

- **DO NOT commit** `credentials.json` or `token.json` (they contain secrets)
- **Respect rate limits** — Gmail has sending limits
- **Personalize emails** — Generic emails get flagged as spam
- **Track responses** — Update database when you receive replies
- **Unsubscribe link** — Consider adding one for compliance
