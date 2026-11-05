---
name: qiime2-microbiome-analyzer
description: QIIME2 microbiome analysis skill for 16S rRNA profiling and diversity analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\qiime2-microbiome-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.670671
tags:
  - 
---



# QIIME2 Microbiome Analyzer Skill

## Purpose
Enable QIIME2 microbiome analysis for 16S rRNA profiling and diversity analysis.

## Capabilities
- Demultiplexing and denoising (DADA2)
- Taxonomic classification
- Alpha diversity metrics
- Beta diversity analysis
- Differential abundance testing
- Phylogenetic analysis

## Usage Guidelines
- Use DADA2 for denoising amplicon data
- Select appropriate taxonomic classifier
- Calculate diversity metrics with rarefaction
- Visualize beta diversity with ordination
- Test differential abundance appropriately
- Document pipeline parameters

## Dependencies
- QIIME2
- DADA2
- phyloseq

## Process Integration
- 16S rRNA Microbiome Analysis (16s-microbiome-analysis)
