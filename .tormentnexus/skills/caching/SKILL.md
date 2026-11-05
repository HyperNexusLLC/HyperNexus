---
name: caching
description: HTTP caching, service workers, cache invalidation, and CDN configuration.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\caching\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.781744

---



# Caching Skill

Expert assistance for caching strategies.

## Capabilities

- Configure HTTP caching
- Implement service workers
- Set up CDN caching
- Handle cache invalidation
- Design caching architecture

## HTTP Cache Headers

```typescript
// Immutable assets
headers['Cache-Control'] = 'public, max-age=31536000, immutable';

// Dynamic content
headers['Cache-Control'] = 'private, no-cache, must-revalidate';

// Stale-while-revalidate
headers['Cache-Control'] = 'public, max-age=60, stale-while-revalidate=300';
```

## Service Worker

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

## Target Processes

- caching-strategy
- performance-optimization
- pwa-development
