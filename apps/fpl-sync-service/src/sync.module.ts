import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DatabaseModule } from '@app/database';
import { FplApiService } from './fpl-api/fpl-api.service';
import { PlayersService } from './players/players.service';
import { FixturesService } from './fixtures/fixtures.service';
import { TeamsService } from './teams/teams.service';
import { SyncScheduler } from './scheduler/sync.scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'fpl-sync-service',
              brokers: [config.get<string>('KAFKA_BROKERS', 'localhost:9092')],
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [FplApiService, PlayersService, FixturesService, TeamsService, SyncScheduler],
})
export class SyncModule {}
