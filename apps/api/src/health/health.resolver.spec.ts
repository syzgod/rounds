import { Test, TestingModule } from '@nestjs/testing';
import { HealthResolver } from './health.resolver.js';

describe('HealthResolver', () => {
  let resolver: HealthResolver;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [HealthResolver],
    }).compile();

    resolver = moduleRef.get(HealthResolver);
  });

  it('returns "ok"', () => {
    expect(resolver.health()).toBe('ok');
  });
});
