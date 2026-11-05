---
name: hlsl
description: HLSL shader programming skill for DirectX, compute shaders, and optimization.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\game-development\skills\hlsl\SKILL.md
category: process-library
date: 2026-06-14T07:33:31.743090

---



# HLSL Skill

HLSL shader programming for DirectX.

## Overview

This skill provides capabilities for writing HLSL shaders for DirectX-based engines.

## Capabilities

- Vertex and pixel shaders
- Compute shaders
- Constant buffer management
- Shader optimization

## Usage Patterns

```hlsl
cbuffer ConstantBuffer : register(b0)
{
    float4x4 WorldViewProj;
}

float4 PSMain(PSInput input) : SV_TARGET
{
    return input.Color;
}
```

## References

- [HLSL Documentation](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/)
