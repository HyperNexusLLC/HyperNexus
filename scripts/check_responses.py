#!/usr/bin/env python3
"""
HyperNexus Email Response Tracker
Checks Gmail inbox for replies from outreach contacts
"""

import os
import json
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
import requests

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_REFRESH_TOKEN = os.getenv('GOOGLE_REFRESH_TOKEN')

DB_FILE = 'outreach.db'


class ResponseTracker:
    def __init__(self):
        self.db = sqlite3.connect(DB_FILE)
        self.results_file = 'response_tracking.json'

    def get_access_token(self):
        """Get Gmail OAuth access token"""
        data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'refresh_token': GOOGLE_REFRESH_TOKEN,
            'grant_type': 'refresh_token'
        }
        response = requests.post(
            'https://oauth2.googleapis.com/token',
            data=data,
            timeout=30
        )
        if response.status_code == 200:
            return response.json()['access_token']
        raise Exception(f"Token refresh failed: {response.text}")

    def search_gmail(self, access_token, query, max_results=50):
        """Search Gmail for messages"""
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {'q': query, 'maxResults': max_results}
        response = requests.get(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            headers=headers,
            params=params,
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get('messages', [])
        raise Exception(f"Gmail search failed: {response.text}")

    def get_message(self, access_token, message_id):
        """Get full message details"""
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(
            f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}',
            headers=headers,
            params={'format': 'metadata', 'metadataHeaders': ['From', 'Subject', 'Date']},
            timeout=30
        )
        if response.status_code == 200:
            return response.json()
        raise Exception(f"Gmail message fetch failed: {response.text}")

    def check_responses(self):
        """Check for responses to outreach emails"""
        print("=" * 60)
        print("HyperNexus Email Response Tracker")
        print("=" * 60)

        try:
            access_token = self.get_access_token()
            print("[OK] Connected to Gmail")
        except Exception as e:
            print(f"[X] Failed to connect: {e}")
            return

        # Get all contacted emails from DB
        cursor = self.db.cursor()
        cursor.execute("SELECT email FROM contacts WHERE status = 'contacted'")
        contacted = [row[0] for row in cursor.fetchall()]

        if not contacted:
            print("No contacted emails found")
            return

        print(f"\nChecking responses from {len(contacted)} contacts...")

        responses = []
        for i, contact_email in enumerate(contacted):
            # Search for replies FROM the contact
            query = f'from:{contact_email} newer_than:30d'
            try:
                messages = self.search_gmail(access_token, query, max_results=5)
                for msg in messages:
                    details = self.get_message(access_token, msg['id'])
                    headers = {h['name'].lower(): h['value'] for h in details.get('payload', {}).get('headers', [])}
                    subject = headers.get('subject', 'No subject')
                    sender = headers.get('from', 'Unknown')
                    date = headers.get('date', '')

                    # Skip our own sent messages
                    if 'hypernexusofficialllc' in sender.lower():
                        continue

                    responses.append({
                        'contact_email': contact_email,
                        'sender': sender,
                        'subject': subject,
                        'date': date,
                        'message_id': msg['id']
                    })

                    # Update DB
                    cursor.execute(
                        "UPDATE contacts SET response_received = TRUE, notes = ? WHERE email = ?",
                        (f"Response: {subject} ({date})", contact_email)
                    )

                if (i + 1) % 25 == 0:
                    print(f"  Checked {i + 1}/{len(contacted)} contacts")
            except Exception as e:
                print(f"  Error checking {contact_email}: {e}")

        self.db.commit()

        # Save results
        try:
            with open(self.results_file, 'w', encoding='utf-8') as f:
                json.dump({'checked_at': datetime.now().isoformat(), 'responses': responses}, f, indent=2)
        except OSError as e:
            print(f"  Warning: could not save results file: {e}")

        print(f"\n{'=' * 60}")
        print(f"RESPONSES FOUND: {len(responses)}")
        print(f"{'=' * 60}")
        for r in responses:
            print(f"\n[EMAIL] From: {r['sender']}")
            print(f"   Subject: {r['subject']}")
            print(f"   Date: {r['date']}")
            print(f"   In reply to: {r['contact_email']}")

        print(f"\nResults saved to {self.results_file}")
        self.db.close()


def main():
    tracker = ResponseTracker()
    tracker.check_responses()


if __name__ == "__main__":
    main()
