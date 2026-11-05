---
name: fluorescence-spectroscopy-analyzer
description: Fluorescence spectroscopy skill for quantum dot characterization, FRET measurements, and photoluminescence analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\fluorescence-spectroscopy-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.113843

---



# Fluorescence Spectroscopy Analyzer

## Purpose

The Fluorescence Spectroscopy Analyzer skill provides comprehensive photoluminescence characterization of nanomaterials, enabling analysis of emission properties, quantum yields, and energy transfer processes.

## Capabilities

- Excitation/emission spectra
- Quantum yield calculation
- Fluorescence lifetime measurements
- FRET efficiency calculation
- Photostability assessment
- Single-particle fluorescence

## Usage Guidelines

### Fluorescence Analysis

1. **Spectral Measurements**
   - Acquire excitation and emission spectra
   - Correct for instrument response
   - Identify emission maxima

2. **Quantum Yield**
   - Use integrating sphere or reference
   - Account for reabsorption
   - Report with standard

3. **Lifetime Measurements**
   - Use TCSPC for time-resolved
   - Fit decay curves
   - Identify multiple components

## Process Integration

- Multi-Modal Nanomaterial Characterization Pipeline
- Nanosensor Development and Validation Pipeline
- Nanoparticle Drug Delivery System Development

## Input Schema

```json
{
  "sample_id": "string",
  "excitation_wavelength": "number (nm)",
  "measurement_type": "steady_state|time_resolved|quantum_yield",
  "reference_standard": "string (optional)"
}
```

## Output Schema

```json
{
  "emission": {
    "peak_wavelength": "number (nm)",
    "fwhm": "number (nm)",
    "stokes_shift": "number (nm)"
  },
  "quantum_yield": {
    "value": "number",
    "method": "string",
    "reference": "string"
  },
  "lifetime": {
    "tau1": "number (ns)",
    "amplitude1": "number",
    "tau2": "number (ns, optional)",
    "chi_squared": "number"
  }
}
```
