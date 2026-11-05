---
name: weaviate-integration
description: Weaviate vector database setup with GraphQL queries and hybrid search
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\weaviate-integration\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.018491

---



# Weaviate Integration Skill

## Capabilities

- Set up Weaviate cluster (cloud or self-hosted)
- Define schemas with properties and vectorizers
- Implement GraphQL queries
- Configure hybrid search (vector + keyword)
- Set up multi-tenancy
- Implement batch import operations

## Target Processes

- vector-database-setup
- rag-pipeline-implementation

## Implementation Details

### Core Operations

1. **Schema Management**: Class definitions and properties
2. **Data Import**: Single and batch object creation
3. **Vector Search**: nearVector, nearText queries
4. **Hybrid Search**: Combined vector and BM25
5. **GraphQL**: Flexible querying with Get and Aggregate

### Configuration Options

- Vectorizer modules (text2vec-*, multi2vec-*)
- Replication factor
- Sharding configuration
- Multi-tenancy settings
- Module configuration

### Best Practices

- Design schema for query patterns
- Use appropriate vectorizer
- Enable hybrid search for better recall
- Configure proper backups
- Monitor resource usage

### Dependencies

- weaviate-client
- langchain-weaviate
