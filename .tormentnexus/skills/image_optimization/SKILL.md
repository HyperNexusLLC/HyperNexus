---
name: image-optimization
description: Image formats, responsive images, lazy loading, and CDN integration.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\image-optimization\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.841102

---



# Image Optimization Skill

Expert assistance for image optimization.

## Capabilities

- Optimize image formats (WebP, AVIF)
- Implement responsive images
- Configure lazy loading
- Set up image CDN
- Handle blur placeholders

## Next.js Image

```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
  placeholder="blur"
  blurDataURL={blurData}
/>
```

## Responsive Images

```html
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="" loading="lazy" />
</picture>
```

## Target Processes

- image-optimization
- performance-improvement
- lcp-optimization
