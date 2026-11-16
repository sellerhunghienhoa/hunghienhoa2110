export type GemColor = 'gold' | 'amber' | 'jade' | 'azure' | 'rose' | 'violet';

export type SpecialKind = 'none' | 'line-h' | 'line-v' | 'bomb' | 'nova';

export type LegendRole = 'Active' | 'Limited' | 'Passive';

export interface GemCell {
  id: number;
  color: GemColor;
  special: SpecialKind;
}

export interface GridPos {
  row: number;
  col: number;
}

export type SkillEffectKind =
  | 'strike'
  | 'shield_heal'
  | 'blast_row'
  | 'convert_gems'
  | 'nova_burst'
  | 'drain_burn';

export type TierTag = 'COMMON' | 'RARE' | 'EPIC' | 'MYTHIC';

export interface LegendDef {
  id: string;
  cardCode?: string;
  name: string;
  title: string;
  color: GemColor;
  role: LegendRole;
  manaCost: number;
  baseAttack: number;
  baseHp: number;
  skillName: string;
  skillDesc: string;
  awakenDesc?: string;
  effectKind: SkillEffectKind;
  targetTile?: boolean;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legend';
  tierTag?: TierTag;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
}

export interface OwnedLegend {
  id: string;
  level: number;
  shards: number;
}

export interface IslandNode {
  id: 'shrine' | 'mine' | 'grove';
  name: string;
  level: number;
  guardianId: string | null;
  lastClaimAt: number;
}

export interface DecorPlacement {
  slot: number;
  decorId: string;
  level: number;
}

export interface BracketSlot {
  name: string;
  power: number;
  legendId: string;
  isPlayer?: boolean;
}

export interface TournamentBracket {
  round: 0 | 1 | 2 | 3; // 0: QF, 1: SF, 2: Final, 3: Champion
  qfPairs: Array<[BracketSlot, BracketSlot]>;
  qfWinners: Array<BracketSlot | null>;
  sfWinners: Array<BracketSlot | null>;
  champion: BracketSlot | null;
}

export interface PlayerProfile {
  playerLevel: number;
  xp: number;
  manaOrbs: number;
  gold: number;
  diamonds: number;
  trophies: number;
  decorScore: number;
  freeSpins: number;
  tournamentStage: number;
  owned: Record<string, OwnedLegend>;
  lineup: (string | null)[];
  islands: IslandNode[];
  decorations: DecorPlacement[];
  bracket: TournamentBracket | null;
  playerName?: string;
  avatarId?: string;
  avatarFrame?: number;
  winStreak?: number;
  winsTotal?: number;
  talentPreset?: number;
  talentLevels?: Record<string, number>;
  claimFlags?: Record<string, boolean>;
}

export interface BattleLegendState {
  id: string;
  level: number;
  mana: number;
  maxMana: number;
  limitedUsed: boolean;
}

export interface BattleTeam {
  name: string;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  score: number;
  burnTurns: number;
  burnDamage: number;
  legends: BattleLegendState[];
}

export interface CascadeStep {
  cleared: GridPos[];
  colorCounts: Record<GemColor, number>;
  createdSpecials: Array<{ pos: GridPos; color: GemColor; special: SpecialKind }>;
  specialEvents?: Array<'line' | 'bomb' | 'nova' | 'combo'>;
  boardAfter: GemCell[][];
}

export interface SwapResolution {
  valid: boolean;
  steps: CascadeStep[];
  totalCleared: number;
  comboCount: number;
  extraTurn: boolean;
  colorTotals: Record<GemColor, number>;
  finalBoard: GemCell[][];
  reshuffled: boolean;
}

export interface SkillCastResult {
  damage: number;
  heal: number;
  shield: number;
  burnDamage: number;
  burnTurns: number;
  scoreGained: number;
  board: GemCell[][];
  clearedPositions: GridPos[];
  extraTurn: boolean;
  summary: string;
}

export type BattleMode = 'ai' | 'local' | 'online';

export interface OnlineRoomSnapshot {
  roomCode: string;
  side: 0 | 1;
  turn: 0 | 1;
  round: number;
  movesLeft: number;
  winner: 0 | 1 | null;
  board: GemCell[][];
  teams: [BattleTeam, BattleTeam];
  lastEvent: string;
}
