export enum AppPhase {
  SETUP = 'SETUP',
  P1_DRAFT = 'P1_DRAFT',
  P2_DRAFT = 'P2_DRAFT',
  BATTLE = 'BATTLE',
  RESULT = 'RESULT',
  CELEBRATION = 'CELEBRATION'
}

export interface Player {
  id: 1 | 2;
  nickname: string;
  avatarId: string;
  mainView: string;
  team: string[]; // The selected arguments
}

export interface BattleRound {
  roundNumber: number;
  p1Arg: string;
  p2Arg: string;
  isP1Manual: boolean;
  isP2Manual: boolean;
  dialogue: { speaker: string; text: string; isSelf?: boolean }[];
  voteP1: number; // 0-100
  winnerId: 1 | 2 | 0;
  reason: string;
}

export interface GameState {
  topic: string;
  p1: Player;
  p2: Player;
  rounds: BattleRound[];
  currentRoundIndex: number;
  totalP1Votes: number;
  totalP2Votes: number;
  phase: AppPhase;
  isBattleProcessing: boolean;
  surrenderBy?: 1 | 2; // New: track who surrendered
}

export const INITIAL_STATE: GameState = {
  topic: '',
  p1: { id: 1, nickname: '', avatarId: '1', mainView: '', team: [] },
  p2: { id: 2, nickname: '', avatarId: '2', mainView: '', team: [] },
  rounds: [],
  currentRoundIndex: 0,
  totalP1Votes: 0,
  totalP2Votes: 0,
  phase: AppPhase.SETUP,
  isBattleProcessing: false,
};