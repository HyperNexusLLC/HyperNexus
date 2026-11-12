---
name: star-rnaseq-aligner
description: STAR alignment skill for splice-aware RNA-seq read mapping with comprehensive QC metrics
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\star-rnaseq-aligner\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.702304
tags:
  - 
---



# STAR RNA-seq Aligner Skill

## Purpose
Provide STAR alignment for splice-aware RNA-seq read mapping with comprehensive QC metrics.

## Capabilities
- Splice junction detection
- Two-pass alignment mode
- Chimeric read detection (fusions)
- Gene quantification (--quantMode)
- Custom genome index generation
- Output in multiple formats

## Usage Guidelines
- Generate genome indices with annotation
- Use two-pass mode for novel junction discovery
- Enable chimeric read detection for fusion analysis
- Generate quantification in addition to alignments
- Optimize parameters for read length
- Document STAR version and parameters

## Dependencies
- STAR
- HISAT2
- kallisto

## Process Integration
- RNA-seq Differential Expression Analysis (rnaseq-differential-expression)
- Single-Cell RNA-seq Analysis (scrnaseq-analysis)
- Spatial Transcriptomics Analysis (spatial-transcriptomics)
