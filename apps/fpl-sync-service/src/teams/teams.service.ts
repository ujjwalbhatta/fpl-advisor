import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { FplTeam } from '../fpl-api/fpl-api.types';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertTeams(teams: FplTeam[]): Promise<void> {
    for (const t of teams) {
      await this.prisma.team.upsert({
        where: { id: t.id },
        update: {
          name: t.name,
          shortName: t.short_name,
          strength: t.strength,
          strengthAttack: t.strength_attack_home,
          strengthDefence: t.strength_defence_home,
        },
        create: {
          id: t.id,
          name: t.name,
          shortName: t.short_name,
          strength: t.strength,
          strengthAttack: t.strength_attack_home,
          strengthDefence: t.strength_defence_home,
        },
      });
    }
  }
}
