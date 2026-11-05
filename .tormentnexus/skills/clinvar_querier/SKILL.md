---
name: clinvar-querier
description: ClinVar database query skill for clinical variant interpretation and pathogenicity lookup
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\clinvar-querier\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.568589
tags:
  - 
---



# ClinVar Querier Skill

## Purpose
Enable ClinVar database queries for clinical variant interpretation and pathogenicity lookup.

## Capabilities
- Variant significance lookup
- Submission history retrieval
- Condition association queries
- Evidence level assessment
- Batch variant queries
- VCF annotation integration

## Usage Guidelines
- Query variants with standard nomenclature
- Review submission history for context
- Consider evidence levels in interpretation
- Batch query for efficiency
- Integrate with VCF annotation
- Document ClinVar version dates

## Dependencies
- ClinVar API
- VarSome API
- OMIM

## Process Integration
- Clinical Variant Interpretation (clinical-variant-interpretation)
- Rare Disease Diagnostic Pipeline (rare-disease-diagnostics)
- Tumor Molecular Profiling (tumor-molecular-profiling)
