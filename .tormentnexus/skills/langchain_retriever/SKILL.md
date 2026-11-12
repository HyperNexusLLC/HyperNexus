---
name: langchain-retriever
description: LangChain retriever implementation with various retrieval strategies for RAG applications
source: ~\.a5c\process-library\babysitter-repo\library\specializations\ai-agents-conversational\skills\langchain-retriever\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.882186

---



# LangChain Retriever Skill

## Capabilities

- Implement various LangChain retriever types
- Configure vector store retrievers
- Set up multi-query retrievers for improved recall
- Implement contextual compression retrievers
- Design ensemble retrievers combining multiple strategies
- Configure self-query retrievers for structured filtering

## Target Processes

- rag-pipeline-implementation
- advanced-rag-patterns

## Implementation Details

### Retriever Types

1. **VectorStoreRetriever**: Basic similarity search
2. **MultiQueryRetriever**: Generates query variations
3. **ContextualCompressionRetriever**: Filters and compresses results
4. **EnsembleRetriever**: Combines multiple retrievers
5. **SelfQueryRetriever**: Structured metadata filtering
6. **ParentDocumentRetriever**: Returns parent chunks

### Configuration Options

- Search type (similarity, mmr, similarity_score_threshold)
- Number of documents to retrieve (k)
- Score thresholds
- Metadata filtering
- Compression settings

### Dependencies

- langchain
- langchain-community
- Vector store client
