---
name: STIX/TAXII Intelligence Skill
description: STIX/TAXII threat intelligence format and sharing
source: ~\.a5c\process-library\babysitter-repo\library\specializations\security-research\skills\stix-taxii\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.308030

---



# STIX/TAXII Intelligence Skill

## Overview

This skill provides STIX/TAXII threat intelligence format creation, querying, and sharing capabilities.

## Capabilities

- Create STIX 2.1 bundles
- Query TAXII servers
- Generate threat reports
- Create indicator relationships
- Map to MITRE ATT&CK
- Support OpenIOC format
- Validate STIX syntax
- Share intelligence feeds

## Target Processes

- threat-intelligence-research.js
- malware-analysis.js
- security-advisory-writing.js

## Dependencies

- stix2 library (Python)
- taxii2-client
- Python 3.x
- TAXII server access (optional)

## Usage Context

This skill is essential for:
- Threat intelligence sharing
- IOC standardization
- Intelligence feed management
- Threat report generation
- Intelligence correlation

## Integration Notes

- Supports STIX 2.0 and 2.1
- Can publish to TAXII servers
- Integrates with MISP
- Supports multiple IOC formats
- Can generate human-readable reports
