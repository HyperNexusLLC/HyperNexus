---
name: maxquant-processor
description: MaxQuant mass spectrometry skill for protein identification and quantification
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\maxquant-processor\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.636530
tags:
  - 
---



# MaxQuant Processor Skill

## Purpose
Provide MaxQuant mass spectrometry analysis for protein identification and quantification.

## Capabilities
- Andromeda search engine execution
- Label-free quantification (LFQ)
- TMT/iTRAQ labeled quantification
- Match between runs
- FDR control and filtering
- PTM site localization

## Usage Guidelines
- Configure search parameters for experiment type
- Select appropriate quantification method
- Enable match between runs for improved quantification
- Apply FDR filtering at protein and peptide level
- Localize PTM sites accurately
- Document database and parameter versions

## Dependencies
- MaxQuant
- MSFragger
- Proteome Discoverer

## Process Integration
- Mass Spectrometry Proteomics Pipeline (ms-proteomics-pipeline)
- Multi-Omics Data Integration (multi-omics-integration)
