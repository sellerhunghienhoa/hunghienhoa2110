import { GEM_COLORS, getLegendDef, getLegendStats } from './legends.ts';
import type {
  BattleLegendState,
  BattleTeam,
  CascadeStep,
  GemCell,
  GemColor,
  GridPos,
  SkillCastResult,
  SpecialKind,
  SwapResolution,
} from './types.ts';

export const ROWS = 7;
export const COLS = 7;

let nextGemId = 1;

function makeGem(color: GemColor, special: SpecialKind = 'none'): GemCell {
  return { id: nextGemId++, color, special };
}

function emptyColorCounts(): Record<GemColor, number> {
  return { gold: 0, amber: 0, jade: 0, azure: 0, rose: 0, violet: 0 };
}

export function cloneBoard(board: GemCell[][]): GemCell[][] {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function cloneTeam(team: BattleTeam): BattleTeam {
  return {
    ...team,
    legends: team.legends.map((l) => ({ ...l })),
  };
}

export function areAdjacent(a: GridPos, b: GridPos): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

function parseKey(key: string): GridPos {
  const [r, c] = key.split(',').map(Number);
  return { row: r, col: c };
}

interface MatchRun {
  cells: GridPos[];
  color: GemColor;
  orientation: 'h' | 'v';
}

function findRuns(board: GemCell[][]): MatchRun[] {
  const runs: MatchRun[] = [];

  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS) {
      const color = board[r][c].color;
      let end = c + 1;
      while (end < COLS && board[r][end].color === color) end++;
      if (end - c >= 3) {
        const cells: GridPos[] = [];
        for (let k = c; k < end; k++) cells.push({ row: r, col: k });
        runs.push({ cells, color, orientation: 'h' });
      }
      c = end;
    }
  }

  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS) {
      const color = board[r][c].color;
      let end = r + 1;
      while (end < ROWS && board[end][c].color === color) end++;
      if (end - r >= 3) {
        const cells: GridPos[] = [];
        for (let k = r; k < end; k++) cells.push({ row: k, col: c });
        runs.push({ cells, color, orientation: 'v' });
      }
      r = end;
    }
  }

  return runs;
}

interface MatchCluster {
  color: GemColor;
  cells: GridPos[];
  maxRunLen: number;
  hasH: boolean;
  hasV: boolean;
}

export function findMatchClusters(board: GemCell[][]): MatchCluster[] {
  const runs = findRuns(board);
  if (runs.length === 0) return [];

  const used = new Array<boolean>(runs.length).fill(false);
  const clusters: MatchCluster[] = [];

  for (let i = 0; i < runs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const queue = [runs[i]];
    const cellSet = new Set<string>();
    let maxRunLen = runs[i].cells.length;
    let hasH = runs[i].orientation === 'h';
    let hasV = runs[i].orientation === 'v';
    for (const p of runs[i].cells) cellSet.add(posKey(p.row, p.col));

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (let j = 0; j < runs.length; j++) {
        if (used[j] || runs[j].color !== current.color) continue;
        const overlaps = runs[j].cells.some((p) => cellSet.has(posKey(p.row, p.col)));
        if (overlaps) {
          used[j] = true;
          queue.push(runs[j]);
          maxRunLen = Math.max(maxRunLen, runs[j].cells.length);
          hasH = hasH || runs[j].orientation === 'h';
          hasV = hasV || runs[j].orientation === 'v';
          for (const p of runs[j].cells) cellSet.add(posKey(p.row, p.col));
        }
      }
    }

    clusters.push({
      color: runs[i].color,
      cells: Array.from(cellSet).map(parseKey),
      maxRunLen,
      hasH,
      hasV,
    });
  }

  return clusters;
}

export function findAllValidSwaps(board: GemCell[][]): Array<[GridPos, GridPos]> {
  const valid: Array<[GridPos, GridPos]> = [];
  const trySwap = (a: GridPos, b: GridPos) => {
    const copy = cloneBoard(board);
    const tmp = copy[a.row][a.col];
    copy[a.row][a.col] = copy[b.row][b.col];
    copy[b.row][b.col] = tmp;
    if (
      findRuns(copy).length > 0 ||
      copy[a.row][a.col].special !== 'none' ||
      copy[b.row][b.col].special !== 'none'
    ) {
      valid.push([a, b]);
    }
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) trySwap({ row: r, col: c }, { row: r, col: c + 1 });
      if (r + 1 < ROWS) trySwap({ row: r, col: c }, { row: r + 1, col: c });
    }
  }
  return valid;
}

function randomColor(rng: () => number): GemColor {
  return GEM_COLORS[Math.floor(rng() * GEM_COLORS.length) % GEM_COLORS.length];
}

export function createBoard(rng: () => number = Math.random): GemCell[][] {
  for (let attempt = 0; attempt < 25; attempt++) {
    const board: GemCell[][] = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => makeGem('gold')),
    );

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const forbidden = new Set<GemColor>();
        if (c >= 2 && board[r][c - 1].color === board[r][c - 2].color) {
          forbidden.add(board[r][c - 1].color);
        }
        if (r >= 2 && board[r - 1][c].color === board[r - 2][c].color) {
          forbidden.add(board[r - 1][c].color);
        }
        const choices = GEM_COLORS.filter((col) => !forbidden.has(col));
        const pick = choices[Math.floor(rng() * choices.length) % choices.length];
        board[r][c] = makeGem(pick);
      }
    }

    if (findAllValidSwaps(board).length > 0) {
      return board;
    }
  }
  return createDeterministicFallbackBoard();
}

function createDeterministicFallbackBoard(): GemCell[][] {
  const board = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) =>
      makeGem(GEM_COLORS[(r * 2 + c) % GEM_COLORS.length]),
    ),
  );
  board[0][0] = makeGem('amber');
  board[0][1] = makeGem('amber');
  board[0][3] = makeGem('amber');
  return board;
}

function expandSpecialExplosions(
  board: GemCell[][],
  initial: Set<string>,
): { cleared: Set<string>; specialEvents: Array<'line' | 'bomb' | 'nova' | 'combo'> } {
  const cleared = new Set<string>(initial);
  const queue = Array.from(initial).map(parseKey);
  const triggered = new Set<string>();
  const specialEvents: Array<'line' | 'bomb' | 'nova' | 'combo'> = [];

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const key = posKey(pos.row, pos.col);
    if (triggered.has(key)) continue;
    triggered.add(key);

    const cell = board[pos.row]?.[pos.col];
    if (!cell || cell.special === 'none') continue;

    const addCell = (r: number, c: number) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      const k = posKey(r, c);
      if (!cleared.has(k)) {
        cleared.add(k);
        queue.push({ row: r, col: c });
      }
    };

    if (cell.special === 'line-h') {
      specialEvents.push('line');
      for (let c = 0; c < COLS; c++) addCell(pos.row, c);
    } else if (cell.special === 'line-v') {
      specialEvents.push('line');
      for (let r = 0; r < ROWS; r++) addCell(r, pos.col);
    } else if (cell.special === 'bomb') {
      specialEvents.push('bomb');
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) addCell(pos.row + dr, pos.col + dc);
      }
    } else if (cell.special === 'nova') {
      specialEvents.push('nova');
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c].color === cell.color) addCell(r, c);
        }
      }
    }
  }

  return { cleared, specialEvents };
}

function applySpecialComboSwap(
  board: GemCell[][],
  a: GridPos,
  b: GridPos,
  initial: Set<string>,
): boolean {
  const cellA = board[a.row][a.col];
  const cellB = board[b.row][b.col];
  const spA = cellA.special;
  const spB = cellB.special;

  // Single Nova swapped with a regular gem clears all gems of that color
  if ((spA === 'nova' && spB === 'none') || (spB === 'nova' && spA === 'none')) {
    const novaPos = spA === 'nova' ? a : b;
    const partnerColor = (spA === 'nova' ? cellB : cellA).color;
    initial.add(posKey(novaPos.row, novaPos.col));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].color === partnerColor) initial.add(posKey(r, c));
      }
    }
    return false;
  }

  if (spA === 'none' || spB === 'none') return false;

  const mark = (r: number, c: number) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) initial.add(posKey(r, c));
  };

  if (spA === 'nova' && spB === 'nova') {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) mark(r, c);
    }
  } else if (spA === 'nova' || spB === 'nova') {
    const other = spA === 'nova' ? cellB : cellA;
    mark(a.row, a.col);
    mark(b.row, b.col);
    let idx = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].color === other.color) {
          board[r][c] = {
            ...board[r][c],
            special:
              other.special === 'bomb'
                ? 'bomb'
                : idx++ % 2 === 0
                  ? 'line-h'
                  : 'line-v',
          };
          mark(r, c);
        }
      }
    }
  } else if (spA === 'bomb' && spB === 'bomb') {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) mark(b.row + dr, b.col + dc);
    }
  } else if (spA === 'bomb' || spB === 'bomb') {
    for (let d = -1; d <= 1; d++) {
      for (let c = 0; c < COLS; c++) mark(b.row + d, c);
      for (let r = 0; r < ROWS; r++) mark(r, b.col + d);
    }
  } else {
    // Two line rockets swapped -> full cross blast
    for (let c = 0; c < COLS; c++) mark(b.row, c);
    for (let r = 0; r < ROWS; r++) mark(r, b.col);
  }
  return true;
}

function collapseAndRefill(
  board: GemCell[][],
  cleared: Set<string>,
  spawnMap: Map<string, { color: GemColor; special: SpecialKind }>,
  rng: () => number,
): GemCell[][] {
  const next = cloneBoard(board);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = posKey(r, c);
      const spawn = spawnMap.get(key);
      if (spawn) {
        next[r][c] = makeGem(spawn.color, spawn.special);
      } else if (cleared.has(key)) {
        next[r][c] = { id: -1, color: 'gold', special: 'none' };
      }
    }
  }

  for (let c = 0; c < COLS; c++) {
    const survivors: GemCell[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (next[r][c].id !== -1) survivors.push(next[r][c]);
    }
    let writeRow = ROWS - 1;
    for (const gem of survivors) {
      next[writeRow][c] = gem;
      writeRow--;
    }
    while (writeRow >= 0) {
      next[writeRow][c] = makeGem(randomColor(rng));
      writeRow--;
    }
  }

  return next;
}

export function applySwap(
  board: GemCell[][],
  a: GridPos,
  b: GridPos,
  rng: () => number = Math.random,
): SwapResolution {
  if (!areAdjacent(a, b)) {
    return {
      valid: false,
      steps: [],
      totalCleared: 0,
      comboCount: 0,
      extraTurn: false,
      colorTotals: emptyColorCounts(),
      finalBoard: board,
      reshuffled: false,
    };
  }

  let working = cloneBoard(board);
  const tmp = working[a.row][a.col];
  working[a.row][a.col] = working[b.row][b.col];
  working[b.row][b.col] = tmp;

  const swappedSpecials: GridPos[] = [];
  if (working[a.row][a.col].special !== 'none') swappedSpecials.push(a);
  if (working[b.row][b.col].special !== 'none') swappedSpecials.push(b);

  let clusters = findMatchClusters(working);
  if (clusters.length === 0 && swappedSpecials.length === 0) {
    return {
      valid: false,
      steps: [],
      totalCleared: 0,
      comboCount: 0,
      extraTurn: false,
      colorTotals: emptyColorCounts(),
      finalBoard: board,
      reshuffled: false,
    };
  }

  const steps: CascadeStep[] = [];
  const colorTotals = emptyColorCounts();
  let totalCleared = 0;
  let extraTurn = false;
  let firstWave = true;

  while (
    steps.length < 24 &&
    (clusters.length > 0 || (firstWave && swappedSpecials.length > 0))
  ) {
    const initial = new Set<string>();
    const spawnMap = new Map<string, { color: GemColor; special: SpecialKind }>();
    const createdSpecials: Array<{ pos: GridPos; color: GemColor; special: SpecialKind }> = [];
    const comboEvents: Array<'line' | 'bomb' | 'nova' | 'combo'> = [];

    if (firstWave && swappedSpecials.length > 0) {
      const triggeredCombo = applySpecialComboSwap(working, a, b, initial);
      if (triggeredCombo) {
        comboEvents.push('combo');
        extraTurn = true;
      } else if (clusters.length === 0) {
        for (const sp of swappedSpecials) initial.add(posKey(sp.row, sp.col));
      }
    }

    for (const cluster of clusters) {
      for (const cell of cluster.cells) initial.add(posKey(cell.row, cell.col));
      const makesSpecial = cluster.maxRunLen >= 4 || (cluster.hasH && cluster.hasV);
      if (makesSpecial && comboEvents.length === 0) {
        if (firstWave) {
          extraTurn = true;
        }
        const special: SpecialKind =
          cluster.maxRunLen >= 5
            ? 'nova'
            : cluster.hasH && cluster.hasV
              ? 'bomb'
              : cluster.hasH
                ? 'line-v'
                : 'line-h';
        const anchor =
          cluster.cells.find(
            (p) => (p.row === a.row && p.col === a.col) || (p.row === b.row && p.col === b.col),
          ) ?? cluster.cells[0];
        spawnMap.set(posKey(anchor.row, anchor.col), { color: cluster.color, special });
        createdSpecials.push({ pos: anchor, color: cluster.color, special });
      }
    }

    const { cleared: clearedSet, specialEvents } = expandSpecialExplosions(working, initial);
    const stepCounts = emptyColorCounts();
    const clearedList: GridPos[] = [];
    for (const k of clearedSet) {
      const p = parseKey(k);
      clearedList.push(p);
      const col = working[p.row][p.col].color;
      stepCounts[col]++;
      colorTotals[col]++;
    }

    totalCleared += clearedList.length;
    working = collapseAndRefill(working, clearedSet, spawnMap, rng);

    steps.push({
      cleared: clearedList,
      colorCounts: stepCounts,
      createdSpecials,
      specialEvents: [...comboEvents, ...specialEvents],
      boardAfter: cloneBoard(working),
    });

    firstWave = false;
    clusters = findMatchClusters(working);
  }

  let reshuffled = false;
  if (findAllValidSwaps(working).length === 0) {
    working = createBoard(rng);
    reshuffled = true;
  }

  return {
    valid: true,
    steps,
    totalCleared,
    comboCount: steps.length,
    extraTurn,
    colorTotals,
    finalBoard: working,
    reshuffled,
  };
}

export const MAX_TEAM_ENERGY = 8;
export const MOVES_PER_TURN = 2;
export const MAX_BATTLE_ROUNDS = 4;

export function getLegendEnergyCost(maxMana: number): number {
  return Math.min(MAX_TEAM_ENERGY, maxMana);
}

export function isLegendSkillReady(team: BattleTeam, legendIndex: number): boolean {
  const legendState = team.legends[legendIndex];
  if (!legendState) return false;
  const def = getLegendDef(legendState.id);
  if (def.role === 'Limited' && legendState.limitedUsed) return false;
  return (
    legendState.mana >= legendState.maxMana ||
    (def.role !== 'Passive' && team.energy >= getLegendEnergyCost(legendState.maxMana))
  );
}

export function buildBattleTeam(
  name: string,
  squad: Array<{ id: string; level: number }>,
): BattleTeam {
  let maxHp = 0;
  const legends: BattleLegendState[] = squad.map(({ id, level }) => {
    const def = getLegendDef(id);
    const stats = getLegendStats(id, level);
    maxHp += stats.hp;
    return {
      id,
      level,
      mana: 0,
      maxMana: def.manaCost,
      limitedUsed: false,
    };
  });
  return {
    name,
    hp: maxHp,
    maxHp,
    shield: 0,
    energy: 0,
    score: 0,
    burnTurns: 0,
    burnDamage: 0,
    legends,
  };
}

export function applyDamageWithShield(
  target: BattleTeam,
  rawDamage: number,
): { shieldBlocked: number; hpLost: number } {
  const dmg = Math.max(0, Math.round(rawDamage));
  const shieldBlocked = Math.min(target.shield, dmg);
  target.shield -= shieldBlocked;
  const hpLost = Math.min(target.hp, dmg - shieldBlocked);
  target.hp -= hpLost;
  return { shieldBlocked, hpLost };
}

export function applyMatchImpact(
  attacker: BattleTeam,
  defender: BattleTeam,
  resolution: SwapResolution,
): {
  damageDealt: number;
  healAmount: number;
  shieldGain: number;
  energyGain: number;
  scoreGained: number;
} {
  let baseDamage = resolution.totalCleared * 5 + Math.max(0, resolution.comboCount - 1) * 10;
  let healAmount = 0;
  let shieldGain = 0;

  for (const legendState of attacker.legends) {
    const def = getLegendDef(legendState.id);
    const stats = getLegendStats(legendState.id, legendState.level);
    const matchedColor = resolution.colorTotals[def.color];

    if (def.role === 'Passive') {
      if (def.id === 'leafcoon' && resolution.colorTotals.jade > 0) {
        baseDamage += Math.round(stats.attack * 0.25);
      } else if (def.id === 'galewing' && resolution.comboCount >= 2) {
        baseDamage += Math.round(stats.attack * 0.35);
      } else if (def.id === 'mistfox' && resolution.extraTurn) {
        shieldGain += 12 + legendState.level * 2;
      }
    }

    if (matchedColor > 0) {
      baseDamage += Math.round(stats.attack * 0.28 * (matchedColor / 3));
      legendState.mana = Math.min(legendState.maxMana, legendState.mana + matchedColor);
    } else if (resolution.comboCount >= 2) {
      legendState.mana = Math.min(legendState.maxMana, legendState.mana + 1);
    }
  }

  if (resolution.colorTotals.rose >= 3) {
    healAmount += resolution.colorTotals.rose * 3;
  }

  // Blue Hearts charge the shared 9-orb energy pool like the live mobile PvP build.
  const energyGain = resolution.colorTotals.azure + (resolution.comboCount >= 3 ? 1 : 0);
  const actualEnergyGain = Math.min(MAX_TEAM_ENERGY, attacker.energy + energyGain) - attacker.energy;
  attacker.energy += actualEnergyGain;

  attacker.shield = Math.min(220, attacker.shield + shieldGain);
  attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);

  const { hpLost, shieldBlocked } = applyDamageWithShield(defender, baseDamage);
  const damageDealt = hpLost + shieldBlocked;
  const totalTeamAtk = attacker.legends.reduce(
    (sum, ls) => sum + getLegendStats(ls.id, ls.level).attack,
    0,
  );
  const avgAtk = totalTeamAtk / Math.max(1, attacker.legends.length);
  const cascadeMult = 1 + Math.max(0, resolution.comboCount - 1) * 0.4;
  const scoreGained =
    Math.round(resolution.totalCleared * avgAtk * cascadeMult) +
    (resolution.extraTurn ? 60 : 0) +
    Math.round(damageDealt * 0.6);
  attacker.score += scoreGained;

  return {
    damageDealt,
    healAmount,
    shieldGain,
    energyGain: actualEnergyGain,
    scoreGained,
  };
}

export function tickBurnStatus(team: BattleTeam): number {
  if (team.burnTurns <= 0 || team.burnDamage <= 0) return 0;
  team.burnTurns -= 1;
  const { hpLost, shieldBlocked } = applyDamageWithShield(team, team.burnDamage);
  return hpLost + shieldBlocked;
}

export function advanceTurnState(
  currentTurn: 0 | 1,
  round: number,
  movesLeft: number,
  teams: [BattleTeam, BattleTeam],
  actionType: 'swap' | 'skill',
  extraMove: boolean,
): {
  turn: 0 | 1;
  round: number;
  movesLeft: number;
  winner: 0 | 1 | null;
  burnDamage: number;
  turnChanged: boolean;
} {
  const opp: 0 | 1 = currentTurn === 0 ? 1 : 0;
  if (teams[opp].hp <= 0) {
    return { turn: currentTurn, round, movesLeft: 0, winner: currentTurn, burnDamage: 0, turnChanged: false };
  }

  const nextMoves =
    actionType === 'skill'
      ? extraMove
        ? Math.min(MOVES_PER_TURN + 1, movesLeft + 1)
        : movesLeft
      : extraMove
        ? movesLeft
        : movesLeft - 1;

  if (nextMoves > 0) {
    return { turn: currentTurn, round, movesLeft: nextMoves, winner: null, burnDamage: 0, turnChanged: false };
  }

  const nextRound = currentTurn === 1 ? round + 1 : round;
  if (nextRound > MAX_BATTLE_ROUNDS) {
    const scoreWinner: 0 | 1 =
      teams[0].score > teams[1].score
        ? 0
        : teams[1].score > teams[0].score
          ? 1
          : teams[0].hp >= teams[1].hp
            ? 0
            : 1;
    return { turn: currentTurn, round, movesLeft: 0, winner: scoreWinner, burnDamage: 0, turnChanged: true };
  }

  const burnDamage = tickBurnStatus(teams[opp]);
  if (teams[opp].hp <= 0) {
    return { turn: currentTurn, round, movesLeft: 0, winner: currentTurn, burnDamage, turnChanged: true };
  }

  return {
    turn: opp,
    round: nextRound,
    movesLeft: MOVES_PER_TURN,
    winner: null,
    burnDamage,
    turnChanged: true,
  };
}

export function castLegendSkill(
  caster: BattleTeam,
  defender: BattleTeam,
  legendIndex: number,
  board: GemCell[][],
  rng: () => number = Math.random,
  target?: GridPos,
): SkillCastResult | null {
  if (!isLegendSkillReady(caster, legendIndex)) return null;
  const legendState = caster.legends[legendIndex];
  const def = getLegendDef(legendState.id);

  const stats = getLegendStats(legendState.id, legendState.level);
  const cost = getLegendEnergyCost(legendState.maxMana);
  const triggeredViaMana = legendState.mana >= legendState.maxMana;
  legendState.mana = 0;
  if (!triggeredViaMana || caster.energy >= cost) {
    caster.energy = Math.max(0, caster.energy - cost);
  }
  if (def.role === 'Limited') legendState.limitedUsed = true;

  let working = cloneBoard(board);
  const clearedPositions: GridPos[] = [];
  let damage = 0;
  let heal = 0;
  let shield = 0;
  let burnDamage = 0;
  let burnTurns = 0;
  let extraTurn = false;
  let summary = `${def.name} cast ${def.skillName}!`;

  if (def.effectKind === 'nova_burst') {
    const centerR = target ? Math.max(0, Math.min(ROWS - 1, target.row)) : Math.floor(ROWS / 2);
    const centerC = target ? Math.max(0, Math.min(COLS - 1, target.col)) : Math.floor(COLS / 2);
    const clearedSet = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = centerR + dr;
        const cc = centerC + dc;
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
          clearedSet.add(posKey(rr, cc));
        }
      }
    }
    const { cleared: expanded } = expandSpecialExplosions(working, clearedSet);
    for (const k of expanded) clearedPositions.push(parseKey(k));
    working = collapseAndRefill(working, expanded, new Map(), rng);
    damage = Math.round(stats.attack * 2.1) + clearedPositions.length * 4;
    summary = `${def.skillName} blasted ${clearedPositions.length} gems for ${damage} DMG!`;
  } else if (def.effectKind === 'shield_heal') {
    shield = Math.round(stats.hp * 0.42);
    heal = Math.round(stats.hp * 0.34);
    caster.shield = Math.min(240, caster.shield + shield);
    caster.hp = Math.min(caster.maxHp, caster.hp + heal);
    damage = Math.round(stats.attack * 0.85);
    summary = `${def.skillName}: +${shield} Shield, +${heal} HP, ${damage} DMG!`;
  } else if (def.effectKind === 'drain_burn') {
    const targetRow = target ? Math.max(0, Math.min(ROWS - 1, target.row)) : Math.floor(rng() * ROWS);
    const clearedSet = new Set<string>();
    for (let c = 0; c < COLS; c++) clearedSet.add(posKey(targetRow, c));
    const { cleared: expanded } = expandSpecialExplosions(working, clearedSet);
    for (const k of expanded) clearedPositions.push(parseKey(k));
    working = collapseAndRefill(working, expanded, new Map(), rng);
    damage = Math.round(stats.attack * 2.0);
    burnDamage = Math.round(stats.attack * 0.45);
    burnTurns = 3;
    defender.burnDamage = Math.max(defender.burnDamage, burnDamage);
    defender.burnTurns = Math.max(defender.burnTurns, burnTurns);
    summary = `${def.skillName}: ${damage} DMG + ${burnDamage} Burn/turn!`;
  } else if (def.effectKind === 'blast_row') {
    const targetRow = target ? Math.max(0, Math.min(ROWS - 1, target.row)) : Math.floor(ROWS / 2);
    const clearedSet = new Set<string>();
    for (let c = 0; c < COLS; c++) clearedSet.add(posKey(targetRow, c));
    const { cleared: expanded } = expandSpecialExplosions(working, clearedSet);
    for (const k of expanded) clearedPositions.push(parseKey(k));
    working = collapseAndRefill(working, expanded, new Map(), rng);
    damage = Math.round(stats.attack * 1.9);
    extraTurn = true;
    summary = `${def.skillName}: ${damage} DMG & Extra Turn!`;
  } else if (def.effectKind === 'convert_gems') {
    let converted = 0;
    for (let r = 0; r < ROWS && converted < 4; r++) {
      for (let c = 0; c < COLS && converted < 4; c++) {
        if (working[r][c].color !== def.color && ((r + c) % 3 === 0 || converted < 2)) {
          working[r][c] = makeGem(def.color, working[r][c].special);
          converted++;
        }
      }
    }
    heal = Math.round(stats.hp * 0.22);
    caster.hp = Math.min(caster.maxHp, caster.hp + heal);
    damage = Math.round(stats.attack * 1.35);
    summary = `${def.skillName}: ${damage} DMG, +${heal} HP, +${converted} ${def.color} gems!`;
  } else {
    damage = Math.round(stats.attack * 1.75);
    summary = `${def.skillName} hit for ${damage} DMG!`;
  }

  applyDamageWithShield(defender, damage);
  const scoreGained = Math.max(40, damage + heal + shield + clearedPositions.length * 10);
  caster.score += scoreGained;

  if (findAllValidSwaps(working).length === 0) {
    working = createBoard(rng);
  }

  return {
    damage,
    heal,
    shield,
    burnDamage,
    burnTurns,
    scoreGained,
    board: working,
    clearedPositions,
    extraTurn,
    summary,
  };
}

export function pickBestAiAction(
  board: GemCell[][],
  aiTeam: BattleTeam,
): { type: 'skill'; legendIndex: number } | { type: 'swap'; a: GridPos; b: GridPos } {
  const readyIndex = aiTeam.legends.findIndex((_, idx) => isLegendSkillReady(aiTeam, idx));
  if (readyIndex !== -1) {
    return { type: 'skill', legendIndex: readyIndex };
  }

  const neededColors = new Set(aiTeam.legends.map((l) => getLegendDef(l.id).color));
  const swaps = findAllValidSwaps(board);
  let best = swaps[0] ?? [{ row: 0, col: 0 }, { row: 0, col: 1 }];
  let bestScore = -1;

  for (const [a, b] of swaps) {
    const res = applySwap(board, a, b);
    let score =
      res.totalCleared * 3 +
      res.comboCount * 5 +
      res.colorTotals.azure * 3 +
      (res.extraTurn ? 15 : 0);
    for (const color of neededColors) {
      score += res.colorTotals[color] * 4;
    }
    if (score > bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }

  return { type: 'swap', a: best[0], b: best[1] };
}
