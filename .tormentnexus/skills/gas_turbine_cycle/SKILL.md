---
name: gas-turbine-cycle
description: Expert skill for gas turbine engine thermodynamic cycle analysis and optimization
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\aerospace-engineering\skills\gas-turbine-cycle\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.349102
tags:
  - 
---



# Gas Turbine Cycle Analysis Skill

## Purpose
Provide comprehensive gas turbine engine thermodynamic cycle analysis capabilities for turbofan, turbojet, and turboprop engine design and optimization.

## Capabilities
- NPSS and GasTurb model setup and execution
- Component matching and off-design analysis
- Turbofan, turbojet, turboprop configuration
- Performance map generation and interpolation
- Bleed and power extraction modeling
- Transient performance analysis
- SFC optimization studies
- Engine inlet and nozzle integration

## Usage Guidelines
- Select appropriate component models based on engine configuration
- Validate component maps against available test data
- Consider off-design performance across the flight envelope
- Account for bleed and power extraction in system-level analysis
- Optimize cycle parameters for specific mission requirements
- Document assumptions and limitations for each analysis

## Dependencies
- NPSS (Numerical Propulsion System Simulation)
- GasTurb
- MATLAB

## Process Integration
- AE-004: Gas Turbine Cycle Analysis
