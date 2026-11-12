---
name: haystack-pipeline
description: Haystack NLP pipeline configuration for document processing and QA
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\haystack-pipeline\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.860082

---



# Haystack Pipeline Skill

## Capabilities

- Configure Haystack pipeline components
- Set up document stores and retrievers
- Implement reader/generator models
- Design custom pipeline graphs
- Configure preprocessing pipelines
- Implement evaluation pipelines

## Target Processes

- rag-pipeline-implementation
- intent-classification-system

## Implementation Details

### Core Components

1. **DocumentStores**: Elasticsearch, Weaviate, FAISS, etc.
2. **Retrievers**: BM25, Dense, Hybrid
3. **Readers/Generators**: Extractive and generative QA
4. **Preprocessors**: Document cleaning and splitting

### Pipeline Types

- Retrieval pipelines
- RAG pipelines
- Evaluation pipelines
- Indexing pipelines

### Configuration Options

- Component selection
- Pipeline graph design
- Document store backend
- Model selection
- Preprocessing settings

### Best Practices

- Modular pipeline design
- Proper preprocessing
- Evaluation integration
- Component versioning

### Dependencies

- haystack-ai
- farm-haystack (legacy)
