---
name: jwt
description: JWT implementation, token management, refresh patterns, and security.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\jwt\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.852505

---



# JWT Skill

Expert assistance for JWT authentication implementation.

## Capabilities

- Generate and verify tokens
- Implement refresh tokens
- Handle token storage
- Configure expiration
- Secure token handling

## Implementation

```typescript
import jwt from 'jsonwebtoken';

function generateTokens(user: User) {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!);
}
```

## Target Processes

- jwt-authentication
- auth-implementation
- api-security
