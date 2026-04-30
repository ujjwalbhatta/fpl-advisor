import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FplApiService } from '../fpl-api/fpl-api.service';
import { PlayersService } from '../players/players.service';
import { FixturesService } from '../fixtures/fixtures.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private readonly fplApi: FplApiService,
    private readonly playersService: PlayersService,
    private readonly fixturesService: FixturesService,
    private readonly teamsService: TeamsService,
  ) {}

  @Cron('0 * * * *')
  async syncAll() {
    this.logger.log('Starting full sync...');

    this.logger.log('Fetching from FPL API...');
    const [bootstrap, fixtures] = await Promise.all([
      this.fplApi.getBootstrap(),
      this.fplApi.getFixtures(),
    ]);
    this.logger.log(`Got ${bootstrap.elements.length} players and ${fixtures.length} fixtures from FPL`);

    this.logger.log('Upserting teams...');
    await this.teamsService.upsertTeams(bootstrap.teams);
    this.logger.log('Teams done. Upserting players...');
    await this.playersService.upsertPlayers(bootstrap.elements);
    this.logger.log('Players done. Upserting fixtures...');
    await this.fixturesService.upsertFixtures(fixtures);

    this.logger.log(`Synced ${bootstrap.elements.length} players and ${fixtures.length} fixtures`);
  }

  @Cron('*/30 * * * *')
  async syncInjuries() {
    this.logger.log('Starting injury sync...');

    const bootstrap = await this.fplApi.getBootstrap();
    const unavailable = bootstrap.elements.filter((el) => el.status !== 'a');

    await this.playersService.upsertPlayers(unavailable);

    this.logger.log(`Updated ${unavailable.length} unavailable players`);
  }
}
