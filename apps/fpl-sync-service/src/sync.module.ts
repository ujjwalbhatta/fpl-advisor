import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@app/database';
import { FplApiService } from './fpl-api/fpl-api.service';
import { PlayersService } from './players/players.service';
import { FixturesService } from './fixtures/fixtures.service';
import { TeamsService } from './teams/teams.service';
import { SyncScheduler } from './scheduler/sync.scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule, // registers HttpService (the axios wrapper) so it can be injected into FplApiService.
    DatabaseModule,
    ScheduleModule.forRoot(),
  ],
  providers: [FplApiService, PlayersService, FixturesService, TeamsService, SyncScheduler],
})
export class SyncModule {}
