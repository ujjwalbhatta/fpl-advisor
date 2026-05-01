export interface ScoredPlayer {
  id: number;
  name: string;
  team: string;
  teamId: number;
  position: string;
  price: number;
  form: number;
  pointsPerGame: number;
  totalPoints: number;
  cleanSheets: number;
  bonus: number;
  goalsScored: number;
  assists: number;
  ictIndex: number;
  selectedByPct: number;
  chanceOfPlayingNext: number | null;
  isInjured: boolean;
  xgPer90: number;
  xaPer90: number;
  penaltiesOrder: number | null;
  score: number;
}

// Lean response shape — only what a user/UI actually needs
export interface PlayerResponse {
  id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  form: number;
  totalPoints: number;
  selectedByPct: number;
  chanceOfPlayingNext: number | null;
  isInjured: boolean;
  score: number;
  keyStats: GkStats | DefStats | MidStats | FwdStats;
}

export interface GkStats {
  cleanSheets: number;
  pointsPerGame: number;
  bonus: number;
}

export interface DefStats {
  cleanSheets: number;
  goalsScored: number;
  assists: number;
  xgPer90: number;
  xaPer90: number;
}

export interface MidStats {
  goalsScored: number;
  assists: number;
  ictIndex: number;
  xgPer90: number;
  xaPer90: number;
  penaltiesOrder: number | null;
}

export interface FwdStats {
  goalsScored: number;
  assists: number;
  xgPer90: number;
  penaltiesOrder: number | null;
}

export interface TopPicksResult {
  GKP: PlayerResponse[];
  DEF: PlayerResponse[];
  MID: PlayerResponse[];
  FWD: PlayerResponse[];
}

export interface TopPicksQuery {
  position?: string;
  budget?: number;
  limit?: number;
}
