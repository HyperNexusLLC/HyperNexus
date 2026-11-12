#!/usr/bin/env python3
"""
HyperNexus Outreach Setup
Automates the setup process for Gmail outreach
"""

import os
import webbrowser


def print_banner():
    print("=" * 60)
    print("🚀 HyperNexus Outreach Setup")
    print("=" * 60)
    print()


def check_credentials():
    """Check if credentials.json exists"""
    if os.path.exists("credentials.json"):
        print("✅ credentials.json found")
        return True
    return False


def check_token():
    """Check if token.json exists"""
    if os.path.exists("token.json"):
        print("✅ token.json found (authenticated)")
        return True
    return False


def open_google_cloud():
    """Open Google Cloud Console"""
    print("\n📋 Step 1: Create Google Cloud Credentials")
    print("-" * 40)
    print()
    print("I'll open Google Cloud Console for you.")
    print("Follow these steps:")
    print()
    print("1. Sign in with HyperNexusOfficialLLC@gmail.com")
    print("2. Create a new project (or select existing)")
    print("3. Go to 'APIs & Services' > 'Library'")
    print("4. Search for 'Gmail API' and enable it")
    print("5. Go to 'APIs & Services' > 'Credentials'")
    print("6. Click 'Create Credentials' > 'OAuth client ID'")
    print("7. Application type: 'Desktop app'")
    print("8. Name: 'HyperNexus Outreach'")
    print("9. Click 'Create'")
    print("10. Download JSON and save as 'credentials.json'")
    print()

    input("Press Enter to open Google Cloud Console...")
    webbrowser.open("https://console.cloud.google.com/apis/credentials")

    print()
    print("After downloading credentials.json, place it in:")
    print(f"  {os.path.abspath('.')}")
    print()
    input("Press Enter when ready...")

    return check_credentials()


def authenticate():
    """Run OAuth2 authentication"""
    print("\n🔐 Step 2: Authenticate with Gmail")
    print("-" * 40)
    print()
    print("A browser window will open for Google OAuth consent.")
    print("Sign in with HyperNexusOfficialLLC@gmail.com")
    print("Grant permissions to send emails.")
    print()

    input("Press Enter to start authentication...")

    # Import and run the outreach manager to trigger auth
    try:
        from outreach_automation import OutreachManager

        manager = OutreachManager()
        print("\n✅ Authentication successful!")
        manager.close()
        return True
    except Exception as e:
        print(f"\n❌ Authentication failed: {e}")
        return False


def add_sample_contacts():
    """Add sample contacts to database"""
    print("\n👥 Step 3: Add Sample Contacts")
    print("-" * 40)
    print()

    try:
        from outreach_automation import OutreachManager

        manager = OutreachManager()

        # Sample contacts
        contacts = [
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
            (
                "copilot@github.com",
                "GitHub Copilot",
                "GitHub",
                2,
                "Copilot infrastructure",
            ),
            ("bd@sourcegraph.com", "Sourcegraph BD", "Sourcegraph", 2, "Cody agent"),
            ("bd@codeium.com", "Codeium BD", "Codeium", 2, "Windsurf agent"),
        ]

        for email, name, company, tier, notes in contacts:
            manager.add_contact(email, name, company, tier, notes)

        manager.close()
        print(f"\n✅ Added {len(contacts)} sample contacts")
        return True

    except Exception as e:
        print(f"\n❌ Failed to add contacts: {e}")
        return False


def send_test_email():
    """Send a test email"""
    print("\n📧 Step 4: Send Test Email")
    print("-" * 40)
    print()

    test_email = input("Enter test email address (or press Enter to skip): ").strip()

    if not test_email:
        print("Skipping test email")
        return True

    try:
        from outreach_automation import OutreachManager

        manager = OutreachManager()

        # Send test email
        subject = "HyperNexus Outreach Test"
        body = """Hi,

This is a test email from the HyperNexus Outreach Automation system.

If you received this, the system is working correctly!

Best,
HyperNexus Team
https://hypernexus.site
"""

        if manager.send_email(test_email, subject, body):
            print(f"\n✅ Test email sent to {test_email}")
            manager.close()
            return True
        else:
            print("\n❌ Failed to send test email")
            manager.close()
            return False

    except Exception as e:
        print(f"\n❌ Failed to send test email: {e}")
        return False


def launch_outreach():
    """Launch the outreach campaign"""
    print("\n🚀 Step 5: Launch Outreach")
    print("-" * 40)
    print()

    choice = input("Send outreach emails now? (y/n): ").strip().lower()

    if choice != "y":
        print("Outreach paused. Run 'python outreach_automation.py' when ready.")
        return True

    try:
        from outreach_automation import OutreachManager

        manager = OutreachManager()

        print("\n📧 Sending outreach emails...")
        manager.send_outreach(limit=3, tier=1)

        print("\n📊 Statistics:")
        manager.get_stats()

        manager.close()
        return True

    except Exception as e:
        print(f"\n❌ Failed to launch outreach: {e}")
        return False


def main():
    """Main setup flow"""
    print_banner()

    # Step 1: Check/Create credentials
    if not check_credentials():
        if not open_google_cloud():
            print("\n❌ Setup incomplete. credentials.json not found.")
            print("Please download it from Google Cloud Console and try again.")
            return

    # Step 2: Authenticate
    if not check_token():
        if not authenticate():
            print("\n❌ Setup incomplete. Authentication failed.")
            return

    # Step 3: Add contacts
    add_sample_contacts()

    # Step 4: Test email
    send_test_email()

    # Step 5: Launch
    launch_outreach()

    print("\n" + "=" * 60)
    print("✅ Setup Complete!")
    print("=" * 60)
    print()
    print("Your outreach system is ready.")
    print()
    print("Commands:")
    print("  python outreach_automation.py    # Run outreach")
    print("  python setup.py                  # Re-run setup")
    print()
    print("Database: outreach.db")
    print("Logs: Check console output")
    print()


if __name__ == "__main__":
    main()
