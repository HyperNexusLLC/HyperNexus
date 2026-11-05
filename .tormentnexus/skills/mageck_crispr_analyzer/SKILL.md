---
name: mageck-crispr-analyzer
description: MAGeCK CRISPR screen analysis skill for gene essentiality scoring
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\mageck-crispr-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.632753
tags:
  - 
---



# MAGeCK CRISPR Analyzer Skill

## Purpose
Provide MAGeCK CRISPR screen analysis for gene essentiality scoring.

## Capabilities
- Guide read counting
- Normalization and QC
- Gene-level analysis
- Pathway enrichment
- MLE model for complex designs
- Visualization outputs

## Usage Guidelines
- Count guides accurately from sequencing data
- Normalize counts appropriately
- Calculate gene-level scores
- Enrich for biological pathways
- Use MLE for complex experimental designs
- Generate informative visualizations

## Dependencies
- MAGeCK
- BAGEL
- CRISPResso2

## Process Integration
- CRISPR Screen Analysis (crispr-screen-analysis)
