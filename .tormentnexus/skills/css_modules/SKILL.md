---
name: css-modules
description: CSS Modules patterns, composition, variables, and build configuration.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\css-modules\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.790697

---



# CSS Modules Skill

Expert assistance for scoped styling with CSS Modules.

## Capabilities

- Configure CSS Modules
- Write scoped styles
- Implement composition
- Use CSS variables
- Handle theming

## Usage Pattern

```css
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  composes: reset from './reset.module.css';
}

.primary {
  composes: button;
  background: var(--color-primary);
  color: white;
}
```

```tsx
import styles from './Button.module.css';

<button className={styles.primary}>Click me</button>
```

## Target Processes

- react-application-development
- component-styling
- design-system
