import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '@app/database';
import { FplElement } from '../fpl-api/fpl-api.types';

const POSITION_MAP: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

const STATUS_LABEL: Record<string, string> = {
  a: 'available',
  i: 'injured',
  d: 'doubt',
  s: 'suspended',
};

@Injectable()
export class PlayersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async upsertPlayers(elements: FplElement[]): Promise<void> {
    const existing = await this.prisma.player.findMany({
      where: { id: { in: elements.map((el) => el.id) } },
      select: { id: true, price: true, status: true },
    });
    const priceMap = new Map(existing.map((p) => [p.id, p.price.toNumber()]));
    const statusMap = new Map(existing.map((p) => [p.id, p.status]));

    for (const el of elements) {
      const newPrice = el.now_cost / 10;
      const oldPrice = priceMap.get(el.id);
      const oldStatus = statusMap.get(el.id);

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

      if (oldPrice !== undefined && oldPrice !== newPrice) {
        this.kafkaClient.emit('fpl.player.price-changed', {
          playerId: el.id,
          playerName: el.web_name,
          oldPrice,
          newPrice,
          direction: newPrice > oldPrice ? 'rise' : 'fall',
          timestamp: new Date().toISOString(),
        });
      }

      if (oldStatus !== undefined && oldStatus !== el.status) {
        this.kafkaClient.emit('fpl.player.injury-updated', {
          playerId: el.id,
          playerName: el.web_name,
          status: STATUS_LABEL[el.status] ?? el.status,
          news: el.news ?? '',
          chanceOfPlayingNext: el.chance_of_playing_next_round ?? 100,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
