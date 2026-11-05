---
name: analytics
description: Google Analytics 4, tag management, and event tracking.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\analytics\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.756859

---



# Analytics Skill

Expert assistance for web analytics implementation.

## Capabilities

- Configure Google Analytics 4
- Implement event tracking
- Set up tag management
- Create custom events
- Handle privacy compliance

## GA4 Implementation

```typescript
// gtag.js
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export function trackEvent(action: string, category: string, label?: string) {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
  });
}

export function trackPageView(url: string) {
  window.gtag('config', GA_ID, {
    page_path: url,
  });
}
```

## Target Processes

- analytics-setup
- event-tracking
- conversion-tracking
