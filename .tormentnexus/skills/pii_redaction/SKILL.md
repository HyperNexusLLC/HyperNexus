---
name: pii-redaction
description: PII detection and redaction utilities for privacy-compliant conversational AI
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\pii-redaction\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.951364

---



# PII Redaction Skill

## Capabilities

- Detect personally identifiable information
- Implement redaction strategies
- Configure detection for various PII types
- Design reversible anonymization
- Implement compliance logging
- Create audit trails for PII handling

## Target Processes

- content-moderation-safety
- system-prompt-guardrails

## Implementation Details

### PII Types

1. **Names**: Person names, usernames
2. **Contact**: Email, phone, address
3. **Financial**: Credit cards, bank accounts
4. **Government IDs**: SSN, passport, driver's license
5. **Medical**: Health information
6. **Custom**: Organization-specific PII

### Redaction Methods

- Masking ([REDACTED])
- Pseudonymization (fake values)
- Tokenization (reversible)
- Encryption

### Configuration Options

- PII types to detect
- Detection sensitivity
- Redaction method
- Language support
- Custom patterns

### Best Practices

- Comprehensive PII coverage
- Regular pattern updates
- Audit logging
- Compliance alignment
- Testing with diverse data

### Dependencies

- presidio-analyzer
- presidio-anonymizer
- spacy
