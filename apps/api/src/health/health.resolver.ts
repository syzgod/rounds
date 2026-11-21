import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
  @Query(() => String, {
    description: 'Liveness probe used by the web client status badge.',
  })
  health(): string {
    return 'ok';
  }
}
