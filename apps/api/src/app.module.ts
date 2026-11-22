import { join } from 'node:path';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AcknowledgementsModule } from './acknowledgements/acknowledgements.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { TimelineModule } from './timeline/timeline.module.js';
import { TrendsModule } from './trends/trends.module.js';
import { TriageModule } from './triage/triage.module.js';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // Code-first: the SDL is generated from decorators. Scripts run with
      // cwd = apps/api (pnpm --filter), so this resolves to apps/api/src/schema.gql.
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
    }),
    AcknowledgementsModule,
    HealthModule,
    PatientsModule,
    TimelineModule,
    TrendsModule,
    TriageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
