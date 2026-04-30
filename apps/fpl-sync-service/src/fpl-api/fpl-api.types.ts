// Raw shapes from the FPL public API — snake_case, strings for numeric stats.
// These are only used inside fpl-api.service.ts to type the HTTP responses.
// Everything outside this file uses the domain types from @fpl-advisor/shared-types.

export interface FplElement {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: 1 | 2 | 3 | 4; // 1=GKP 2=DEF 3=MID 4=FWD
  now_cost: number;              // price × 10 (e.g. 85 = £8.5m)
  form: string;
  total_points: number;
  points_per_game: string;
  ict_index: string;
  selected_by_percent: string;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  bonus: number;
  status: string;
  news: string;
  chance_of_playing_next_round: number | null;
  expected_goals_per_90: string;
  expected_assists_per_90: string;
  penalties_order: number | null;
}

export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  strength: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FplEvent {
  id: number;
  name: string;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
  deadline_time: string;
}

export interface FplBootstrapResponse {
  elements: FplElement[];
  teams: FplTeam[];
  events: FplEvent[];
}

export interface FplFixture {
  id: number;
  event: number | null;          // null if gameweek not assigned yet
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string | null;
  finished: boolean;
}

export interface FplPickEntry {
  element: number;               // player ID
  position: number;              // 1-11 starting, 12-15 bench
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplEntryPicks {
  picks: FplPickEntry[];
  entry_history: {
    bank: number;                // ITB × 10
    value: number;               // squad value × 10
    event_transfers: number;
  };
}
