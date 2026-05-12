import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "@app/database";
import { CacheService } from "@app/redis";
import { AiService } from "../ai/ai.service";
import { AiAdviceResponse, FplPicksResponse } from "./transfer-advice.dto";

const FPL_BASE = "https://fantasy.premierleague.com/api";

@Injectable()
export class TransferAdviceService {
  constructor(
    private readonly http: HttpService,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async getAdvice(teamId: number, freeTransfers: number) {
    const gw = await this.getCurrentGw();
    const picks = await this.fetchPicks(teamId, gw);

    const itb = picks.entry_history.bank / 10;
    const squadValue = picks.entry_history.value / 10;
    const squadIds = picks.picks.map((p) => p.element);
    const chip = picks.active_chip;

    const squad = await this.fetchSquadFromDb(squadIds, picks.picks);
    const fixtures = await this.fetchFixtures(gw + 1);

    const squadWithFixtures = squad.map((p) => {
      const fixtureSummary = this.teamFixtureSummary(p.teamId, gw + 1, fixtures);
      const score = this.scorePlayer(p.form, p.chanceOfPlayingNext, p.isInjured, fixtureSummary);
      return { ...p, fixtureSummary, score };
    });

    // Build team count for 3-per-team rule
    const teamCount: Record<number, number> = {};
    for (const p of squadWithFixtures) {
      teamCount[p.teamId] = (teamCount[p.teamId] || 0) + 1;
    }

    // Weakest starting XI players sorted by score ascending
    const weakest = squadWithFixtures
      .filter((p) => p.isStarting)
      .sort((a, b) => a.score - b.score)
      .slice(0, freeTransfers);

    const suggestions = await Promise.all(
      weakest.map(async (outPlayer) => {
        const budget = outPlayer.price + itb;
        const candidates = await this.fetchCandidates(outPlayer.position, budget, squadIds);

        const scored = candidates
          .filter((c) => (teamCount[c.teamId] || 0) < 3)
          .map((c) => {
            const fix = this.teamFixtureSummary(c.teamId, gw + 1, fixtures);
            const score = this.scorePlayer(c.form, c.chanceOfPlayingNext, c.isInjured, fix);
            return { ...c, fixtureSummary: fix, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        return {
          transferOut: {
            name: outPlayer.name,
            team: outPlayer.team,
            position: outPlayer.position,
            price: outPlayer.price,
            form: outPlayer.form,
            score: outPlayer.score,
          },
          transferIn: scored,
        };
      }),
    );

    const aiAdvice = await this.callAi(gw, freeTransfers, itb, squadWithFixtures, suggestions);

    return {
      teamId,
      gameweek: gw,
      nextGameweek: gw + 1,
      freeTransfers,
      itb,
      squadValue,
      chip,
      squad: squadWithFixtures,
      suggestions,
      captainSuggestion: aiAdvice.captainSuggestion,
      aiSummary: aiAdvice.aiSummary,
    };
  }

  private async callAi(
    gw: number,
    freeTransfers: number,
    itb: number,
    squad: { id: number; name: string; team: string; position: string; price: number; form: number; score: number; isStarting: boolean; fixtureSummary: { gw: number; count: number; avgFdr: number | null; isDgw: boolean; isBgw: boolean }[] }[],
    suggestions: { transferOut: { name: string; team: string; position: string; price: number; form: number; score: number }; transferIn: { name: string; team: string; price: number; form: number; score: number; fixtureSummary: { gw: number; count: number; avgFdr: number | null; isDgw: boolean; isBgw: boolean }[] }[] }[],
  ): Promise<AiAdviceResponse> {
    const systemPrompt = `You are an expert Fantasy Premier League (FPL) analyst.
Scoring factors in order of importance:
1. Fixture difficulty next 3 GWs (FDR 1=easy, 5=hard)
2. Current form
3. Injury/availability
4. Price vs points value
5. Double/blank gameweeks

Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.
Match this exact shape:
{
  "captainSuggestion": { "playerId": number, "name": string, "reasoning": string },
  "suggestions": [{ "transferOut": string, "transferIn": string, "reasoning": string }],
  "aiSummary": string
}
Be specific — mention fixture names, recent form scores, and FDR numbers in reasoning.`;

    const startingXI = squad.filter((p) => p.isStarting).map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      position: p.position,
      price: p.price,
      form: p.form,
      score: p.score,
      fixtures: p.fixtureSummary.map((f) => `GW${f.gw}: ${f.isBgw ? 'BLANK' : f.isDgw ? 'DOUBLE' : ''} FDR${f.avgFdr?.toFixed(1)}`).join(', '),
    }));

    const transferOptions = suggestions.map((s) => ({
      out: s.transferOut,
      candidates: s.transferIn.map((c) => ({
        name: c.name,
        team: c.team,
        price: c.price,
        form: c.form,
        score: c.score,
        fixtures: c.fixtureSummary.map((f) => `GW${f.gw}: ${f.isBgw ? 'BLANK' : f.isDgw ? 'DOUBLE' : ''} FDR${f.avgFdr?.toFixed(1)}`).join(', '),
      })),
    }));

    const userPrompt = `Current GW: ${gw} | Next GW: ${gw + 1}
Free transfers: ${freeTransfers} | ITB: £${itb}m

Starting XI (scored by form + fixtures):
${JSON.stringify(startingXI, null, 2)}

Transfer options (pick the best candidate for each out player):
${JSON.stringify(transferOptions, null, 2)}

Tasks:
1. Pick the best captain from the starting XI.
2. For each transfer option, pick the best candidate and explain why.
3. Write a 2-3 sentence overall summary.

Return JSON only.`;

    const raw = await this.ai.complete(systemPrompt, userPrompt);
    const json = raw.replace(/^```json\n?/m, '').replace(/^```\n?/m, '').replace(/```$/m, '').trim();
    return JSON.parse(json) as AiAdviceResponse;
  }

  private async fetchFixtures(fromGw: number) {
    return this.prisma.fixture.findMany({
      where: { gameweek: { in: [fromGw, fromGw + 1, fromGw + 2] }, finished: false },
      include: { homeTeam: true, awayTeam: true },
    });
  }

  private async fetchCandidates(position: string, budget: number, excludeIds: number[]) {
    const players = await this.prisma.player.findMany({
      where: {
        position,
        status: "a",
        price: { lte: budget },
        id: { notIn: excludeIds },
      },
      include: { team: true },
      orderBy: { form: "desc" },
      take: 50,
    });

    return players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team.name,
      teamId: p.teamId,
      position: p.position,
      price: p.price.toNumber(),
      form: p.form.toNumber(),
      totalPoints: p.totalPoints,
      chanceOfPlayingNext: p.chanceOfPlayingNext ?? 100,
      isInjured: p.isInjured,
      status: p.status,
    }));
  }

  private teamFixtureSummary(
    teamId: number,
    fromGw: number,
    fixtures: Awaited<ReturnType<typeof this.fetchFixtures>>,
  ) {
    const availableGws = [...new Set(fixtures.map((f) => f.gameweek))]
      .filter((g) => g >= fromGw && g <= fromGw + 2)
      .sort((a, b) => a - b);

    return availableGws.map((g) => {
      const gf = fixtures.filter(
        (f) => f.gameweek === g && (f.homeTeamId === teamId || f.awayTeamId === teamId)
      );
      const count = gf.length;
      const avgFdr = count === 0 ? null :
        gf.reduce((s, f) => s + (f.homeTeamId === teamId ? f.difficultyHome : f.difficultyAway), 0) / count;
      return {
        gw: g,
        count,
        avgFdr,
        isDgw: count === 2,
        isBgw: count === 0,
      };
    });
  }

  private async fetchSquadFromDb(
    squadIds: number[],
    picks: FplPicksResponse["picks"],
  ) {
    const players = await this.prisma.player.findMany({
      where: { id: { in: squadIds } },
      include: { team: true },
    });

    return players.map((p) => {
      const pick = picks.find((pk) => pk.element === p.id)!;
      return {
        id: p.id,
        name: p.name,
        team: p.team.name,
        teamId: p.teamId,
        position: p.position,
        price: p.price.toNumber(),
        form: p.form.toNumber(),
        totalPoints: p.totalPoints,
        chanceOfPlayingNext: p.chanceOfPlayingNext ?? 100,
        isInjured: p.isInjured,
        status: p.status,
        isStarting: pick.position <= 11,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
      };
    });
  }

  private scorePlayer(
    form: number,
    chanceOfPlaying: number,
    isInjured: boolean,
    fixtureSummary: ReturnType<typeof this.teamFixtureSummary>,
  ): number {
    let s = 0;

    s += Math.min(form * 3, 30);

    const weights = [1.0, 0.7, 0.4];
    for (const [i, f] of fixtureSummary.entries()) {
      const w = weights[i];
      if (f.isBgw) {
        s -= 15 * w;
      } else if (f.isDgw) {
        s += (6 - f.avgFdr!) * 6 * 2 * w;
      } else {
        s += (6 - f.avgFdr!) * 6 * w;
      }
    }

    if (chanceOfPlaying === 100) s += 5;
    if (chanceOfPlaying <= 50)   s -= 15;
    if (isInjured)               s -= 30;

    return Math.round(s * 10) / 10;
  }

  async getCurrentGw(): Promise<number> {
    const cached = await this.cache.get<number>("fpl:gw:current");
    if (cached) return cached;

    const res = await firstValueFrom(
      this.http.get<{ events: { id: number; is_current: boolean }[] }>(
        `${FPL_BASE}/bootstrap-static/`
      )
    );

    const current = res.data.events.find((e) => e.is_current);
    return current?.id ?? 1;
  }

  async fetchPicks(teamId: number, gw: number): Promise<FplPicksResponse> {
    const cacheKey = `fpl:team:${teamId}:picks:${gw}`;
    const cached = await this.cache.get<FplPicksResponse>(cacheKey);
    if (cached) return cached;

    const res = await firstValueFrom(
      this.http.get<FplPicksResponse>(
        `${FPL_BASE}/entry/${teamId}/event/${gw}/picks/`
      )
    );

    await this.cache.set(cacheKey, res.data, 600);
    return res.data;
  }
}
