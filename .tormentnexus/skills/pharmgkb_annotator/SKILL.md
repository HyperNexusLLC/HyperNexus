---
name: pharmgkb-annotator
description: PharmGKB pharmacogenomics annotation skill for drug-gene interaction assessment
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\pharmgkb-annotator\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.658232
tags:
  - 
---



# PharmGKB Annotator Skill

## Purpose
Provide PharmGKB pharmacogenomics annotation for drug-gene interaction assessment.

## Capabilities
- Star allele calling (Stargazer)
- Diplotype determination
- CPIC guideline integration
- Drug recommendation generation
- Clinical annotation lookup
- Dosing guidance extraction

## Usage Guidelines
- Call star alleles accurately
- Determine diplotypes from genotypes
- Apply CPIC guidelines for dosing
- Generate actionable recommendations
- Review clinical annotations
- Document guideline versions

## Dependencies
- PharmGKB API
- Stargazer
- PharmCAT

## Process Integration
- Pharmacogenomics Analysis (pharmacogenomics-analysis)
- Clinical Variant Interpretation (clinical-variant-interpretation)
