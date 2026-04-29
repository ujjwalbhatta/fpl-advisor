export interface PriceChangedEvent {
  playerId: number;
  playerName: string;
  oldPrice: number;
  newPrice: number;
  direction: 'rise' | 'fall';
  timestamp: string;
}

export interface InjuryUpdatedEvent {
  playerId: number;
  playerName: string;
  status: 'available' | 'injured' | 'doubt' | 'suspended';
  news: string;
  chanceOfPlayingNext: number;
  timestamp: string;
}

export interface SyncCompletedEvent {
  gameweek: number;
  playersUpdated: number;
  timestamp: string;
}
