import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { FplFixture } from '../fpl-api/fpl-api.types';

@Injectable()
export class FixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFixtures(fixtures: FplFixture[]): Promise<void> {
    const scheduled = fixtures.filter((f) => f.event !== null);

    for (const f of scheduled) {
      await this.prisma.fixture.upsert({
        where: { id: f.id },
        update: {
          gameweek: f.event,
          homeTeamId: f.team_h,
          awayTeamId: f.team_a,
          difficultyHome: f.team_h_difficulty,
          difficultyAway: f.team_a_difficulty,
          kickoffTime: f.kickoff_time ? new Date(f.kickoff_time) : null,
          finished: f.finished,
        },
        create: {
          id: f.id,
          gameweek: f.event,
          homeTeamId: f.team_h,
          awayTeamId: f.team_a,
          difficultyHome: f.team_h_difficulty,
          difficultyAway: f.team_a_difficulty,
          kickoffTime: f.kickoff_time ? new Date(f.kickoff_time) : null,
          finished: f.finished,
        },
      });
    }
  }
}
