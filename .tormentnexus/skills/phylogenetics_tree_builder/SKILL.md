---
name: phylogenetics-tree-builder
description: Phylogenetic analysis skill for constructing evolutionary trees and assessing relationships
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\phylogenetics-tree-builder\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.662656
tags:
  - 
---



# Phylogenetics Tree Builder Skill

## Purpose
Enable phylogenetic analysis for constructing evolutionary trees, performing multiple sequence alignments, and assessing phylogenetic relationships.

## Capabilities
- Multiple sequence alignment (MUSCLE, MAFFT)
- Maximum likelihood tree construction
- Bayesian phylogenetic inference
- Bootstrap support calculation
- Tree visualization and annotation
- Molecular clock analysis

## Usage Guidelines
- Align sequences before tree construction
- Select appropriate substitution models
- Calculate bootstrap support for branch confidence
- Visualize trees with meaningful annotations
- Consider molecular clock constraints when appropriate
- Document methodology and parameters

## Dependencies
- RAxML-NG
- IQ-TREE
- MrBayes
- MAFFT
- MUSCLE
- FigTree

## Process Integration
- 16S rRNA Microbiome Analysis (16s-microbiome-analysis)
- Shotgun Metagenomics Pipeline (shotgun-metagenomics)
- Whole Genome Sequencing Pipeline (wgs-analysis-pipeline)
