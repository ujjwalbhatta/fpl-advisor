// What the user provides
export interface TransferAdviceRequest {
  teamId: number;
  freeTransfers: number;
}

// FPL API: GET /api/entry/{teamId}/event/{gw}/picks/
export interface FplPick {
  element: number;       // player ID
  position: number;      // 1-11 = starting XI, 12-15 = bench
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplPicksResponse {
  active_chip: string | null;
  entry_history: {
    bank: number;        // ITB in 0.1m units (0 = £0m, 5 = £0.5m)
    value: number;       // squad value in 0.1m units (1043 = £104.3m)
  };
  picks: FplPick[];
}
