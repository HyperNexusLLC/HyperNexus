---
name: samtools-bam-processor
description: BAM/SAM file manipulation skill for sorting, indexing, filtering, and extracting alignment data
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\samtools-bam-processor\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.684752
tags:
  - 
---



# Samtools BAM Processor Skill

## Purpose
Provide BAM/SAM file manipulation capabilities for sorting, indexing, filtering, and extracting alignment data.

## Capabilities
- BAM sorting and indexing
- Duplicate marking and removal
- Alignment statistics generation
- Region extraction and filtering
- Read group management
- Format conversion (SAM/BAM/CRAM)

## Usage Guidelines
- Sort and index BAM files for efficient access
- Mark or remove duplicates based on protocol
- Generate alignment statistics for quality assessment
- Extract regions of interest for targeted analysis
- Manage read groups for multi-sample data
- Use CRAM for storage efficiency

## Dependencies
- samtools
- Picard
- sambamba

## Process Integration
- Whole Genome Sequencing Pipeline (wgs-analysis-pipeline)
- Tumor Molecular Profiling (tumor-molecular-profiling)
- RNA-seq Differential Expression Analysis (rnaseq-differential-expression)
