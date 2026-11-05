---
name: Data Catalog Enricher
description: Enriches data catalog entries with automated metadata
source: ~\.a5c\process-library\babysitter-repo\library\specializations\data-engineering-analytics\skills\data-catalog-enricher\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.840081

---



# Data Catalog Enricher

## Overview

Enriches data catalog entries with automated metadata. This skill enhances data discoverability and governance through intelligent metadata augmentation.

## Capabilities

- Automated tag suggestion
- Business glossary term matching
- Owner/steward recommendation
- Usage pattern analysis
- Data classification (sensitivity, PII)
- Quality score integration
- Lineage enrichment
- Search optimization

## Input Schema

```json
{
  "catalogEntry": "object",
  "dataProfile": "object",
  "existingGlossary": "object",
  "organizationContext": "object"
}
```

## Output Schema

```json
{
  "enrichedEntry": "object",
  "suggestedTags": ["string"],
  "glossaryMatches": ["object"],
  "classificationResults": "object",
  "ownerSuggestions": ["string"]
}
```

## Target Processes

- Data Catalog
- Data Lineage Mapping
- Data Quality Framework

## Usage Guidelines

1. Provide existing catalog entry for enrichment
2. Include data profile for classification analysis
3. Supply business glossary for term matching
4. Add organization context for owner recommendations

## Best Practices

- Regularly update glossary matches as glossary evolves
- Validate PII classifications with data stewards
- Integrate quality scores from quality framework
- Maintain consistent tagging taxonomy
- Review and approve automated classifications
