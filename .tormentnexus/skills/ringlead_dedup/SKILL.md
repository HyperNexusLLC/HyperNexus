---
name: ringlead-dedup
description: RingLead data quality and deduplication platform
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\business\sales\skills\ringlead-dedup\SKILL.md
category: process-library
date: 2026-06-14T07:33:27.776945

---



# RingLead Dedup

## Overview

The RingLead Dedup skill provides integration with RingLead's data quality platform for duplicate detection and merge, data normalization, lead-to-account matching, and data routing rules. This skill maintains CRM data integrity and ensures proper record management.

## Capabilities

### Duplicate Detection
- Identify duplicate records
- Score match confidence levels
- Handle fuzzy matching scenarios
- Detect across object types

### Record Merging
- Execute automated merge operations
- Apply merge rules and preferences
- Preserve critical field values
- Maintain relationship integrity

### Data Normalization
- Standardize field formats
- Apply naming conventions
- Cleanse address data
- Normalize phone and email formats

### Lead-to-Account Matching
- Match leads to existing accounts
- Apply matching rules and thresholds
- Handle company name variations
- Support domain-based matching

## Usage

### Duplicate Analysis
```
Identify duplicate records in the CRM and generate merge recommendations based on data quality rules.
```

### Lead Matching
```
Match incoming leads to existing accounts and contacts to enable proper routing and enrichment.
```

### Data Cleansing
```
Apply normalization rules to standardize data formats and improve overall data quality.
```

## Enhances Processes

- crm-data-quality
- lead-routing-assignment

## Dependencies

- RingLead subscription
- CRM integration
- Matching rule configuration
