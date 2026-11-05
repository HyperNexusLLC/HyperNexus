---
name: seurat-single-cell-analyzer
description: Seurat single-cell analysis skill for clustering, annotation, and trajectory analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\seurat-single-cell-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.689245
tags:
  - 
---



# Seurat Single-Cell Analyzer Skill

## Purpose
Enable Seurat single-cell analysis for clustering, annotation, and trajectory analysis of scRNA-seq data.

## Capabilities
- Quality filtering and normalization
- Dimensionality reduction (PCA, UMAP)
- Graph-based clustering
- Marker gene identification
- Cell type annotation
- Integration across datasets
- Trajectory inference

## Usage Guidelines
- Apply quality filters appropriate for experiment
- Normalize data before dimensionality reduction
- Select clustering resolution based on biology
- Identify markers for cluster annotation
- Integrate datasets to remove batch effects
- Document analysis parameters

## Dependencies
- Seurat
- Scanpy
- CellRanger

## Process Integration
- Single-Cell RNA-seq Analysis (scrnaseq-analysis)
- Spatial Transcriptomics Analysis (spatial-transcriptomics)
