---
name: typescript
description: TypeScript configuration, strict mode, generics, and type utilities.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\typescript\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.055110

---



# TypeScript Skill

Expert assistance for TypeScript configuration and patterns.

## Capabilities

- Configure tsconfig
- Implement strict typing
- Create utility types
- Handle generics
- Design type-safe APIs

## Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Utility Types

```typescript
// Extract, Omit, Pick
type UserWithoutPassword = Omit<User, 'password'>;

// Conditional types
type NonNullable<T> = T extends null | undefined ? never : T;

// Mapped types
type Readonly<T> = { readonly [P in keyof T]: T[P] };
```

## Target Processes

- typescript-setup
- type-safety
- api-design
