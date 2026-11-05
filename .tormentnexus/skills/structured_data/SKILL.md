---
name: structured-data
description: JSON-LD schema markup and validation.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\structured-data\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.024604

---



# Structured Data Skill

Expert assistance for JSON-LD structured data.

## Capabilities

- Implement JSON-LD schemas
- Validate structured data
- Configure rich results
- Handle dynamic data
- Test with Google tools

## Schema Examples

```tsx
// Article
<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": title,
  "author": {
    "@type": "Person",
    "name": author.name
  },
  "datePublished": publishedAt,
  "image": imageUrl
})}
</script>

// Organization
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png"
}
```

## Target Processes

- structured-data-implementation
- rich-results
- seo-enhancement
