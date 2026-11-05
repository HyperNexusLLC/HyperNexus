---
name: redis
description: Redis caching patterns, pub/sub, sessions, rate limiting, and data structures.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\redis\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.973532

---



# Redis Skill

Expert assistance for Redis caching and data management.

## Capabilities

- Implement caching strategies
- Build pub/sub systems
- Manage sessions
- Implement rate limiting
- Use Redis data structures

## Caching Pattern

```typescript
async function getCachedUser(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.user.findUnique({ where: { id } });
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
  return user;
}
```

## Rate Limiting

```typescript
async function rateLimit(ip: string, limit = 100, window = 60) {
  const key = `ratelimit:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, window);
  return count <= limit;
}
```

## Target Processes

- caching-implementation
- real-time-features
- session-management
