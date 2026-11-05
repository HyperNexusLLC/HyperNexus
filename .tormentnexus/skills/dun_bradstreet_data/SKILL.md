---
name: dun-bradstreet-data
description: Dun & Bradstreet data quality and firmographic enrichment
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\business\sales\skills\dun-bradstreet-data\SKILL.md
category: process-library
date: 2026-06-14T07:33:27.723909

---



# Dun & Bradstreet Data

## Overview

The Dun & Bradstreet Data skill provides integration with D&B's business data platform for DUNS number lookup, company hierarchy mapping, financial risk data, and industry classification. This skill enriches account data with authoritative business information for better qualification and segmentation.

## Capabilities

### DUNS Number Lookup
- Match companies to DUNS numbers
- Validate existing DUNS assignments
- Handle duplicate resolution
- Access global coverage

### Company Hierarchy
- Map corporate family trees
- Identify parent-subsidiary relationships
- Track headquarters and branches
- Understand buying authority levels

### Financial Risk Data
- Access credit risk scores
- Retrieve financial stress indicators
- Track payment behavior patterns
- Assess business viability

### Industry Classification
- Apply SIC and NAICS codes
- Segment by industry vertical
- Identify primary business activities
- Support territory assignment

## Usage

### Account Enrichment
```
Enrich account records with DUNS numbers, hierarchy information, and industry classifications.
```

### Risk Assessment
```
Retrieve financial risk indicators for accounts to inform credit decisions and deal prioritization.
```

### Hierarchy Mapping
```
Map the corporate hierarchy for a prospect to identify all related entities and decision-making structure.
```

## Enhances Processes

- crm-data-quality
- lead-qualification-scoring
- territory-design-assignment

## Dependencies

- D&B subscription
- API access credentials
- CRM integration
