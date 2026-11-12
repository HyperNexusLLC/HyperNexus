---
name: jest
description: Jest configuration, mocking strategies, snapshot testing, and coverage.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\jest\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.845215

---



# Jest Skill

Expert assistance for testing with Jest.

## Capabilities

- Configure Jest for various frameworks
- Implement mocking strategies
- Write snapshot tests
- Configure coverage
- Handle async testing

## Test Patterns

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    service = new UserService(mockRepository);
  });

  it('should return all users', async () => {
    mockRepository.findAll.mockResolvedValue([{ id: '1', name: 'John' }]);

    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(mockRepository.findAll).toHaveBeenCalled();
  });
});
```

## Target Processes

- unit-testing
- integration-testing
- tdd-development
