---
name: autodock-docking-engine
description: AutoDock molecular docking skill for small molecule binding prediction and virtual screening
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\bioinformatics\skills\autodock-docking-engine\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.553405
tags:
  - 
---



# AutoDock Docking Engine Skill

## Purpose
Provide AutoDock molecular docking for small molecule binding prediction and virtual screening.

## Capabilities
- Receptor and ligand preparation
- Grid generation and docking
- Scoring function evaluation
- Pose clustering and ranking
- Batch virtual screening
- Binding affinity prediction

## Usage Guidelines
- Prepare receptor and ligand structures properly
- Define appropriate grid box dimensions
- Validate docking protocol with known binders
- Cluster poses by binding mode
- Screen compound libraries efficiently
- Document docking parameters

## Dependencies
- AutoDock Vina
- GOLD
- Glide
- rDock

## Process Integration
- Molecular Docking and Virtual Screening (molecular-docking)
- Protein Structure Prediction (protein-structure-prediction)
