---
name: mongodb
description: MongoDB schema design, aggregation pipelines, indexing strategies, and performance.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\mongodb\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.871824

---



# MongoDB Skill

Expert assistance for MongoDB database design and operations.

## Capabilities

- Design document schemas
- Build aggregation pipelines
- Create optimal indexes
- Implement data modeling patterns
- Configure replication and sharding

## Aggregation Pipeline

```typescript
const results = await collection.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$category', total: { $sum: '$amount' } } },
  { $sort: { total: -1 } },
  { $limit: 10 },
]).toArray();
```

## Indexing

```typescript
// Compound index
await collection.createIndex({ userId: 1, createdAt: -1 });

// Text index
await collection.createIndex({ title: 'text', content: 'text' });
```

## Target Processes

- mern-stack-development
- database-design
- backend-development
