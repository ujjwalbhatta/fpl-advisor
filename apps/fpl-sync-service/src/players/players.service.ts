import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { FplElement } from '../fpl-api/fpl-api.types';

const POSITION_MAP: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertPlayers(elements: FplElement[]): Promise<void> {
    for (const el of elements) {
      await this.prisma.player.upsert({
        where: { id: el.id },
        update: {
          name: el.web_name,
          teamId: el.team,
          position: POSITION_MAP[el.element_type],
          price: el.now_cost / 10,
          form: parseFloat(el.form),
          totalPoints: el.total_points,
          pointsPerGame: parseFloat(el.points_per_game),
          ictIndex: parseFloat(el.ict_index),
          selectedByPct: parseFloat(el.selected_by_percent),
          isInjured: el.status === 'i',
          injuryNews: el.news || null,
          chanceOfPlayingNext: el.chance_of_playing_next_round,
          minutes: el.minutes,
          goalsScored: el.goals_scored,
          assists: el.assists,
          cleanSheets: el.clean_sheets,
          bonus: el.bonus,
          status: el.status,
          xgPer90: parseFloat(el.expected_goals_per_90),
          xaPer90: parseFloat(el.expected_assists_per_90),
          penaltiesOrder: el.penalties_order,
          updatedAt: new Date(),
        },
        create: {
          id: el.id,
          name: el.web_name,
          teamId: el.team,
          position: POSITION_MAP[el.element_type],
          price: el.now_cost / 10,
          form: parseFloat(el.form),
          totalPoints: el.total_points,
          pointsPerGame: parseFloat(el.points_per_game),
          ictIndex: parseFloat(el.ict_index),
          selectedByPct: parseFloat(el.selected_by_percent),
          isInjured: el.status === 'i',
          injuryNews: el.news || null,
          chanceOfPlayingNext: el.chance_of_playing_next_round,
          minutes: el.minutes,
          goalsScored: el.goals_scored,
          assists: el.assists,
          cleanSheets: el.clean_sheets,
          bonus: el.bonus,
          status: el.status,
          xgPer90: parseFloat(el.expected_goals_per_90),
          xaPer90: parseFloat(el.expected_assists_per_90),
          penaltiesOrder: el.penalties_order,
          updatedAt: new Date(),
        },
      });
    }
  }
}
