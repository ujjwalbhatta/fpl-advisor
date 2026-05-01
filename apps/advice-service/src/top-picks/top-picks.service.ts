import { Injectable } from "@nestjs/common";
import { PrismaService } from "@app/database";
import { CacheService } from "@app/redis";
import {
  ScoredPlayer,
  PlayerResponse,
  TopPicksResult,
  TopPicksQuery,
} from "./top-picks.dto";

const SQUAD_SLOTS = { GKP: 2, DEF: 5, MID: 5, FWD: 3 } as const;

type Position = keyof typeof SQUAD_SLOTS;

@Injectable()
export class TopPicksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) {}

  async getTopPicks(
    query: TopPicksQuery
  ): Promise<TopPicksResult | PlayerResponse[]> {
    const cacheKey = "fpl:players:top-picks";
    const cached = await this.cache.get<TopPicksResult>(cacheKey);

    const result = cached ?? (await this.computeTopPicks());

    if (!cached) {
      await this.cache.set(cacheKey, result, 3600);
    }

    if (query.position) {
      const pos = query.position.toUpperCase() as Position;
      let picks = result[pos] ?? [];
      if (query.budget) picks = picks.filter((p) => p.price <= query.budget);
      return picks.slice(0, query.limit ?? SQUAD_SLOTS[pos]);
    }

    return result;
  }

  private async computeTopPicks(): Promise<TopPicksResult> {
    const [players, fixtures] = await Promise.all([
      this.prisma.player.findMany({ include: { team: true } }),
      this.prisma.fixture.findMany({ where: { finished: false } }),
    ]);

    const sortedFixtures = [...fixtures].sort(
      (a, b) => a.gameweek - b.gameweek
    );

    const scored: ScoredPlayer[] = players.map((p) => {
      const price = p.price.toNumber();
      const form = p.form.toNumber();
      const ppg = p.pointsPerGame.toNumber();
      const chance = p.chanceOfPlayingNext ?? 100;
      const ict = p.ictIndex.toNumber();
      const xg = p.xgPer90.toNumber();
      const xa = p.xaPer90.toNumber();
      const fix = this.fixtureScore(p.teamId, sortedFixtures);

      let score: number;
      switch (p.position) {
        case "GKP":
          score = this.scoreGK(form, ppg, p.totalPoints, price, p.cleanSheets, p.bonus, chance, p.isInjured, fix);
          break;
        case "DEF":
          score = this.scoreDEF(form, ppg, p.totalPoints, price, p.cleanSheets, p.bonus, p.goalsScored, p.assists, xg, xa, p.penaltiesOrder, chance, p.isInjured, fix);
          break;
        case "MID":
          score = this.scoreMID(form, ppg, p.totalPoints, price, p.cleanSheets, p.bonus, p.goalsScored, p.assists, ict, xg, xa, p.penaltiesOrder, chance, p.isInjured, fix);
          break;
        case "FWD":
          score = this.scoreFWD(form, ppg, p.totalPoints, price, p.bonus, p.goalsScored, p.assists, xg, xa, p.penaltiesOrder, chance, p.isInjured, fix);
          break;
        default:
          score = 0;
      }

      return {
        id: p.id,
        name: p.name,
        team: p.team.name,
        teamId: p.teamId,
        position: p.position,
        price,
        form,
        pointsPerGame: ppg,
        totalPoints: p.totalPoints,
        cleanSheets: p.cleanSheets,
        bonus: p.bonus,
        goalsScored: p.goalsScored,
        assists: p.assists,
        ictIndex: ict,
        selectedByPct: p.selectedByPct.toNumber(),
        chanceOfPlayingNext: chance,
        isInjured: p.isInjured,
        xgPer90: xg,
        xaPer90: xa,
        penaltiesOrder: p.penaltiesOrder,
        score,
      };
    });

    const topN = (pos: string, n: number): PlayerResponse[] =>
      scored
        .filter((p) => p.position === pos)
        .sort((a, b) => b.score - a.score)
        .slice(0, n)
        .map((p) => this.toResponse(p));

    return {
      GKP: topN("GKP", SQUAD_SLOTS.GKP),
      DEF: topN("DEF", SQUAD_SLOTS.DEF),
      MID: topN("MID", SQUAD_SLOTS.MID),
      FWD: topN("FWD", SQUAD_SLOTS.FWD),
    };
  }

  private toResponse(p: ScoredPlayer): PlayerResponse {
    const base = {
      id: p.id,
      name: p.name,
      team: p.team,
      position: p.position,
      price: p.price,
      form: p.form,
      totalPoints: p.totalPoints,
      selectedByPct: p.selectedByPct,
      chanceOfPlayingNext: p.chanceOfPlayingNext,
      isInjured: p.isInjured,
      score: p.score,
    };

    switch (p.position) {
      case "GKP":
        return { ...base, keyStats: { cleanSheets: p.cleanSheets, pointsPerGame: p.pointsPerGame, bonus: p.bonus } };
      case "DEF":
        return { ...base, keyStats: { cleanSheets: p.cleanSheets, goalsScored: p.goalsScored, assists: p.assists, xgPer90: p.xgPer90, xaPer90: p.xaPer90 } };
      case "MID":
        return { ...base, keyStats: { goalsScored: p.goalsScored, assists: p.assists, ictIndex: p.ictIndex, xgPer90: p.xgPer90, xaPer90: p.xaPer90, penaltiesOrder: p.penaltiesOrder } };
      case "FWD":
        return { ...base, keyStats: { goalsScored: p.goalsScored, assists: p.assists, xgPer90: p.xgPer90, penaltiesOrder: p.penaltiesOrder } };
      default:
        return { ...base, keyStats: {} as never };
    }
  }

  private fixtureScore(
    teamId: number,
    sortedFixtures: Awaited<ReturnType<PrismaService["fixture"]["findMany"]>>
  ): number {
    const next3 = sortedFixtures
      .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
      .slice(0, 3);

    if (next3.length === 0) return 0;

    const avgFDR =
      next3.reduce((sum, f) => {
        const fdr = f.homeTeamId === teamId ? f.difficultyHome : f.difficultyAway;
        return sum + fdr;
      }, 0) / next3.length;

    return Math.max(0, (6 - avgFDR) * 6);
  }

  private scoreGK(form: number, ppg: number, totalPoints: number, price: number, cleanSheets: number, bonus: number, chanceOfPlaying: number, isInjured: boolean, fixtureScore: number): number {
    let s = 0;
    s += fixtureScore;
    s += Math.min(cleanSheets * 4, 24);
    s += Math.min(ppg * 3, 18);
    s += Math.min(form * 2, 16);
    s += Math.min(bonus * 0.4, 8);
    s += (totalPoints / price) * 0.4;
    s += this.availabilityScore(chanceOfPlaying, isInjured);
    return Math.round(s * 10) / 10;
  }

  private scoreDEF(form: number, ppg: number, totalPoints: number, price: number, cleanSheets: number, bonus: number, goalsScored: number, assists: number, xgPer90: number, xaPer90: number, penaltiesOrder: number | null, chanceOfPlaying: number, isInjured: boolean, fixtureScore: number): number {
    let s = 0;
    s += fixtureScore;
    s += Math.min(cleanSheets * 4, 24);
    s += Math.min(form * 2.5, 20);
    s += Math.min(ppg * 2, 16);
    s += Math.min((xgPer90 + xaPer90) * 6, 12);
    s += Math.min((goalsScored * 2 + assists) * 0.5, 8);
    s += Math.min(bonus * 0.3, 6);
    s += (totalPoints / price) * 0.4;
    s += this.penaltyBonus(penaltiesOrder);
    s += this.availabilityScore(chanceOfPlaying, isInjured);
    return Math.round(s * 10) / 10;
  }

  private scoreMID(form: number, ppg: number, totalPoints: number, price: number, cleanSheets: number, bonus: number, goalsScored: number, assists: number, ictIndex: number, xgPer90: number, xaPer90: number, penaltiesOrder: number | null, chanceOfPlaying: number, isInjured: boolean, fixtureScore: number): number {
    let s = 0;
    s += Math.min(form * 3, 30);
    s += fixtureScore;
    s += Math.min(ppg * 2, 20);
    s += Math.min((xgPer90 + xaPer90) * 5, 10);
    s += Math.min(ictIndex / 30, 10);
    s += Math.min((goalsScored * 1.5 + assists) * 0.4, 8);
    s += Math.min(cleanSheets * 0.3, 3);
    s += Math.min(bonus * 0.3, 6);
    s += (totalPoints / price) * 0.4;
    s += this.penaltyBonus(penaltiesOrder);
    s += this.availabilityScore(chanceOfPlaying, isInjured);
    return Math.round(s * 10) / 10;
  }

  private scoreFWD(form: number, ppg: number, totalPoints: number, price: number, bonus: number, goalsScored: number, assists: number, xgPer90: number, xaPer90: number, penaltiesOrder: number | null, chanceOfPlaying: number, isInjured: boolean, fixtureScore: number): number {
    let s = 0;
    s += Math.min(form * 3, 30);
    s += fixtureScore;
    s += Math.min(ppg * 2, 18);
    s += Math.min(xgPer90 * 10, 14);
    s += Math.min(xaPer90 * 5, 6);
    s += Math.min(goalsScored * 0.6, 8);
    s += Math.min(assists * 0.3, 4);
    s += Math.min(bonus * 0.3, 5);
    s += (totalPoints / price) * 0.4;
    s += this.penaltyBonus(penaltiesOrder);
    s += this.availabilityScore(chanceOfPlaying, isInjured);
    return Math.round(s * 10) / 10;
  }

  private availabilityScore(chanceOfPlaying: number, isInjured: boolean): number {
    let s = 0;
    if (chanceOfPlaying === 100) s += 5;
    if (chanceOfPlaying <= 50) s -= 15;
    if (isInjured) s -= 30;
    return s;
  }

  private penaltyBonus(penaltiesOrder: number | null): number {
    if (penaltiesOrder === 1) return 8;
    if (penaltiesOrder === 2) return 3;
    return 0;
  }
}
