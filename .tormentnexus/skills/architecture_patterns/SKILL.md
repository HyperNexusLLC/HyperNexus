---
name: architecture-patterns
description: System and API design guidance covering component boundaries, data flow, integration patterns, and scalability considerations.
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\cc10x\skills\architecture-patterns\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.154818

---



# Architecture Patterns

## Overview

Guidance for system architecture and API design decisions within CC10X workflows. Used during PLAN and BUILD workflows for architectural choices.

## Domain Areas

### Component Design
- Single responsibility boundaries
- Interface contracts and type safety
- Dependency injection patterns
- Module cohesion and coupling analysis

### Data Flow
- Request/response patterns
- Event-driven architecture
- State management strategies
- Data transformation pipelines

### Integration Patterns
- API design (REST, GraphQL, RPC)
- Message queuing and async processing
- Service boundaries and communication
- Error propagation across boundaries

### Scalability
- Horizontal vs vertical scaling considerations
- Caching strategies
- Database design and query optimization
- Load balancing and distribution

## Decision Checkpoints

Architectural decisions require user approval when:
- Introducing new service boundaries
- Changing data flow patterns
- Adding new external dependencies
- Modifying public API contracts

## When to Use

- During PLAN workflow architecture phases
- During BUILD when architectural choices arise
- When reviewing system design in REVIEW workflow

## Agents Used

- `planner` (architecture planning)
- `component-builder` (architecture implementation)
- `code-reviewer` (architecture review)
