export interface Player {
  id: number;
  name: string;
  teamId: number;
  position: 'GKP' | 'DEF' | 'MID' | 'FWD';
  price: number;                      // in millions e.g. 8.5
  form: number;                       // FPL rolling form score
  totalPoints: number;
  pointsPerGame: number;
  ictIndex: number;                   // influence + creativity + threat
  selectedByPct: number;              // ownership %
  isInjured: boolean;
  injuryNews: string | null;
  chanceOfPlayingNext: number | null; // 0, 25, 50, 75, 100
  minutes: number;                    // total season minutes
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  status: 'a' | 'i' | 'd' | 's';    // available, injured, doubt, suspended
  xgPer90: number;                    // expected goals per 90 min
  xaPer90: number;                    // expected assists per 90 min
  penaltiesOrder: number | null;      // 1 = primary penalty taker
  updatedAt: Date;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  strength: number;
  strengthAttack: number;
  strengthDefence: number;
}

export interface Fixture {
  id: number;
  gameweek: number;
  homeTeamId: number;
  awayTeamId: number;
  difficultyHome: number;  // FDR 1-5
  difficultyAway: number;
  kickoffTime: Date | null;
  finished: boolean;
}

export interface Gameweek {
  id: number;
  name: string;
  isCurrent: boolean;
  isNext: boolean;
  finished: boolean;
}
