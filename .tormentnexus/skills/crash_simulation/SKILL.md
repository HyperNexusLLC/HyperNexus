---
name: crash-simulation
description: Crash simulation setup and analysis for occupant protection and regulatory compliance
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\automotive-engineering\skills\crash-simulation\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.452922
tags:
  - 
---



# Crashworthiness CAE Skill

## Purpose
Enable crash simulation setup and analysis for occupant protection optimization and regulatory compliance testing across frontal, side, rear, and pedestrian impact scenarios.

## Capabilities
- LS-DYNA, Radioss, PAM-CRASH model preparation
- Crash barrier and dummy model setup
- Material card calibration (metals, plastics, foams)
- Energy absorption optimization
- Intrusion measurement and tracking
- Occupant injury criteria calculation (HIC, chest G, femur load)
- NCAP and FMVSS regulation test setup
- Pedestrian protection simulation

## Usage Guidelines
- Calibrate material models against component test data
- Validate dummy models against certification tests
- Use mesh sizes appropriate for crash simulation accuracy
- Monitor energy balance and mass scaling effects
- Track intrusion at critical occupant locations
- Generate comprehensive crash reports for design reviews

## Dependencies
- LS-DYNA
- Radioss
- PAM-CRASH
- ANSA/META pre/post

## Process Integration
- SAF-003: Crashworthiness Development
- TVL-001: Vehicle-Level Validation Testing
- TVL-003: Homologation and Type Approval
