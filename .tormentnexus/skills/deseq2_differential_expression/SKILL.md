---
name: deseq2-differential-expression
description: DESeq2 differential expression analysis skill with normalization, statistical modeling, and visualization
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\deseq2-differential-expression\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.576715
tags:
  - 
---



# DESeq2 Differential Expression Skill

## Purpose
Provide DESeq2 differential expression analysis with normalization, statistical modeling, and visualization.

## Capabilities
- Size factor normalization
- Negative binomial modeling
- Shrinkage estimation
- Batch effect modeling
- Multi-factor designs
- Result visualization (MA plots, volcano plots)

## Usage Guidelines
- Design experiments with appropriate replication
- Include batch effects in model when present
- Apply appropriate shrinkage estimators
- Use multiple testing correction
- Generate publication-quality visualizations
- Document analysis parameters and thresholds

## Dependencies
- DESeq2
- edgeR
- limma-voom

## Process Integration
- RNA-seq Differential Expression Analysis (rnaseq-differential-expression)
- Single-Cell RNA-seq Analysis (scrnaseq-analysis)
- CRISPR Screen Analysis (crispr-screen-analysis)
