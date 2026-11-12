---
name: tmb-msi-calculator
description: Tumor mutation burden and microsatellite instability calculation skill for immunotherapy biomarkers
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\tmb-msi-calculator\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.715406
tags:
  - 
---



# TMB-MSI Calculator Skill

## Purpose
Calculate tumor mutation burden and microsatellite instability for immunotherapy biomarker assessment.

## Capabilities
- TMB calculation from VCF
- MSI status determination
- Neoantigen prediction
- HLA typing integration
- Biomarker thresholds
- Clinical report generation

## Usage Guidelines
- Calculate TMB with appropriate normalization
- Determine MSI status accurately
- Predict neoantigens for immunotherapy
- Apply clinical thresholds for reporting
- Generate actionable reports
- Document methodology and thresholds

## Dependencies
- TMBcat
- MSIsensor2
- MANTIS

## Process Integration
- Tumor Molecular Profiling (tumor-molecular-profiling)
