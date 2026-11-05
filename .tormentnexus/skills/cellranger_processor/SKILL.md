---
name: cellranger-processor
description: Cell Ranger skill for 10X Genomics single-cell data processing
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\cellranger-processor\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.564673
tags:
  - 
---



# CellRanger Processor Skill

## Purpose
Provide Cell Ranger capabilities for 10X Genomics single-cell data processing including demultiplexing and alignment.

## Capabilities
- BCL to FASTQ conversion
- Cell barcode demultiplexing
- UMI counting
- Feature barcode processing
- Aggregate sample analysis
- Loupe Browser file generation

## Usage Guidelines
- Configure sample sheets accurately
- Validate cell counts against expectations
- Review QC metrics from web summary
- Aggregate samples for combined analysis
- Generate Loupe files for visualization
- Document reference versions

## Dependencies
- Cell Ranger
- STARsolo

## Process Integration
- Single-Cell RNA-seq Analysis (scrnaseq-analysis)
- Spatial Transcriptomics Analysis (spatial-transcriptomics)
