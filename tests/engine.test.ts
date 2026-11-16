import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLS,
  ROWS,
  advanceTurnState,
  applyMatchImpact,
  applySwap,
  buildBattleTeam,
  castLegendSkill,
  isLegendSkillReady,
  MAX_BATTLE_ROUNDS,
  MAX_TEAM_ENERGY,
  MOVES_PER_TURN,
  createBoard,
  findAllValidSwaps,
  findMatchClusters,
  pickBestAiAction,
  tickBurnStatus,
} from '../src/game/engine.ts';
import {
  createStarterProfile,
  getLegendUses,
  getSlotUnlockTrophies,
  getXpToNextLevel,
} from '../src/game/legends.ts';
import {
  advanceTournamentBracket,
  createTournamentBracket,
  performSummonPack,
  placeOrUpgradeDecor,
  setLineupSlot,
  spinRewardWheel,
  upgradeOwnedLegend,
} from '../src/game/storage.ts';

function makeRng(seedStart = 17): () => number {
  let state = seedStart;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('createBoard builds a 7x7 board with no starting matches and at least one valid move', () => {
  const board = createBoard(makeRng(101));
  assert.equal(board.length, ROWS);
  assert.equal(board[0].length, COLS);
  assert.equal(findMatchClusters(board).length, 0);
  assert.ok(findAllValidSwaps(board).length > 0);
});

test('applySwap rejects non-adjacent or non-matching moves cleanly', () => {
  const board = createBoard(makeRng(202));
  const nonAdjacent = applySwap(board, { row: 0, col: 0 }, { row: 0, col: 2 });
  assert.equal(nonAdjacent.valid, false);
  assert.equal(nonAdjacent.steps.length, 0);
});

test('applySwap resolves matches, cascades, creates specials on 4-match, and refills', () => {
  const rng = makeRng(303);
  const board = createBoard(rng);
  const swaps = findAllValidSwaps(board);
  assert.ok(swaps.length > 0);

  // Force a guaranteed 4-in-a-row swap on row 0: [amber, amber, jade, amber, amber]
  board[0][0] = { ...board[0][0], color: 'amber', special: 'none' };
  board[0][1] = { ...board[0][1], color: 'amber', special: 'none' };
  board[0][2] = { ...board[0][2], color: 'jade', special: 'none' };
  board[0][3] = { ...board[0][3], color: 'amber', special: 'none' };
  board[1][2] = { ...board[1][2], color: 'amber', special: 'none' };
  // Prevent accidental vertical jade match at col 2
  board[2][2] = { ...board[2][2], color: 'azure', special: 'none' };
  board[1][0] = { ...board[1][0], color: 'rose', special: 'none' };
  board[1][1] = { ...board[1][1], color: 'violet', special: 'none' };
  board[1][3] = { ...board[1][3], color: 'gold', special: 'none' };

  const res = applySwap(board, { row: 0, col: 2 }, { row: 1, col: 2 }, rng);
  assert.equal(res.valid, true);
  assert.ok(res.totalCleared >= 4);
  assert.equal(res.extraTurn, true);
  assert.ok(res.steps[0].createdSpecials.length >= 1);
  assert.equal(res.finalBoard.length, ROWS);
  assert.equal(res.finalBoard[0].length, COLS);
});

test('applyMatchImpact charges mana and castLegendSkill triggers shield/heal and damage', () => {
  const rng = makeRng(404);
  const player = buildBattleTeam('Player', [
    { id: 'solfox', level: 2 },
    { id: 'frostkit', level: 2 },
  ]);
  const enemy = buildBattleTeam('Enemy', [{ id: 'emberdrake', level: 1 }]);
  const board = createBoard(rng);
  const [a, b] = findAllValidSwaps(board)[0];
  const swapRes = applySwap(board, a, b, rng);

  const enemyStartHp = enemy.hp;
  const impact = applyMatchImpact(player, enemy, swapRes);
  assert.ok(impact.damageDealt > 0);
  assert.ok(enemy.hp < enemyStartHp);

  // Fill frostkit mana and cast Hex Frost Aegis
  player.legends[1].mana = player.legends[1].maxMana;
  player.hp = Math.max(10, player.hp - 50);
  const hpBeforeSkill = player.hp;
  const cast = castLegendSkill(player, enemy, 1, swapRes.finalBoard, rng);
  assert.ok(cast !== null);
  assert.ok(cast.shield > 0);
  assert.ok(cast.heal > 0);
  assert.ok(player.hp > hpBeforeSkill);
  assert.equal(player.legends[1].mana, 0);
});

test('pickBestAiAction returns either a ready skill or a legal board swap', () => {
  const board = createBoard(makeRng(505));
  const ai = buildBattleTeam('AI', [{ id: 'leafcoon', level: 1 }]);
  const action = pickBestAiAction(board, ai);
  assert.equal(action.type, 'swap');
  const check = applySwap(board, action.a, action.b);
  assert.equal(check.valid, true);
});

test('tickBurnStatus ticks burn damage and decrements turns', () => {
  const team = buildBattleTeam('Target', [{ id: 'solfox', level: 1 }]);
  const startHp = team.hp;
  team.burnDamage = 15;
  team.burnTurns = 2;
  const dealt = tickBurnStatus(team);
  assert.equal(dealt, 15);
  assert.equal(team.hp, startHp - 15);
  assert.equal(team.burnTurns, 1);
});

test('summon, upgrade, and lineup slot management update profile safely', () => {
  const starter = createStarterProfile();
  const summoned = performSummonPack(starter, 9, 'diamonds', makeRng(606));
  assert.ok(summoned !== null);
  assert.equal(summoned.pulls.length, 9);
  assert.equal(summoned.profile.diamonds, starter.diamonds - 180);

  assert.equal(upgradeOwnedLegend(starter, 'solfox'), null);
  const upgraded = upgradeOwnedLegend(starter, 'leafcoon');
  assert.ok(upgraded !== null);
  assert.equal(upgraded.owned.leafcoon.level, 2);

  const reassigned = setLineupSlot(starter, 3, 'petalwisps');
  assert.equal(reassigned.lineup[3], 'petalwisps');

  const spin = spinRewardWheel(starter, makeRng(707));
  assert.ok(spin !== null);
  assert.equal(spin.profile.freeSpins, starter.freeSpins - 1);

  const bracket = createTournamentBracket(starter);
  assert.equal(bracket.qfPairs.length, 4);
  const sf = advanceTournamentBracket(bracket, true);
  assert.equal(sf.round, 1);
  const fin = advanceTournamentBracket(sf, true);
  assert.equal(fin.round, 2);
  const done = advanceTournamentBracket(fin, true);
  assert.equal(done.round, 3);
  assert.equal(done.champion?.isPlayer, true);

  const built = placeOrUpgradeDecor(starter, 2, 'carousel');
  assert.ok(built !== null);
  assert.ok(built.decorScore > starter.decorScore);
});

test('2-move turn cadence, 4-round score victory, and 8-orb energy skill readiness work', () => {
  const player = buildBattleTeam('Player', [{ id: 'solfox', level: 2 }]);
  const enemy = buildBattleTeam('Enemy', [{ id: 'frostkit', level: 2 }]);
  const board = createBoard(makeRng(909));

  assert.equal(isLegendSkillReady(player, 0), false);
  player.energy = MAX_TEAM_ENERGY;
  assert.equal(isLegendSkillReady(player, 0), true);
  const cast = castLegendSkill(player, enemy, 0, board, makeRng(909));
  assert.ok(cast !== null);
  assert.ok(cast.scoreGained > 0);
  assert.ok(player.score >= cast.scoreGained);
  assert.equal(player.energy, MAX_TEAM_ENERGY - 7);

  // Move 1 of 2 keeps the same turn; Extra Move keeps movesLeft unchanged
  const extraKeep = advanceTurnState(0, 1, MOVES_PER_TURN, [player, enemy], 'swap', true);
  assert.equal(extraKeep.turn, 0);
  assert.equal(extraKeep.movesLeft, MOVES_PER_TURN);

  const afterMove1 = advanceTurnState(0, 1, MOVES_PER_TURN, [player, enemy], 'swap', false);
  assert.equal(afterMove1.turn, 0);
  assert.equal(afterMove1.movesLeft, 1);

  const passToOpp = advanceTurnState(0, 1, 1, [player, enemy], 'swap', false);
  assert.equal(passToOpp.turn, 1);
  assert.equal(passToOpp.movesLeft, MOVES_PER_TURN);
  assert.equal(passToOpp.round, 1);

  // Finishing P2 turn on MAX_BATTLE_ROUNDS crowns higher score team
  player.score = 1200;
  enemy.score = 900;
  const endRound = advanceTurnState(1, MAX_BATTLE_ROUNDS, 1, [player, enemy], 'swap', false);
  assert.equal(endRound.winner, 0);
});

test('L/T match spawns bomb special and 5-match nova clears entire color cleanly', () => {
  const rng = makeRng(1111);
  const board = createBoard(rng);
  // Reset colors to neutral alternating checkerboard so no accidental stray matches fire
  const cycle = ['rose', 'violet', 'jade', 'amber'] as const;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      board[r][c] = { id: 5000 + r * 7 + c, color: cycle[(r * 2 + c) % 4], special: 'none' };
    }
  }

  // Construct an L-shape of 'gold' via swapping (2, 1) jade with (2, 2) gold
  board[2][0] = { id: 6001, color: 'gold', special: 'none' };
  board[2][1] = { id: 6002, color: 'gold', special: 'none' };
  board[2][3] = { id: 6003, color: 'gold', special: 'none' };
  board[0][2] = { id: 6004, color: 'gold', special: 'none' };
  board[1][2] = { id: 6005, color: 'gold', special: 'none' };
  board[2][2] = { id: 6006, color: 'azure', special: 'none' };
  board[3][2] = { id: 6007, color: 'gold', special: 'none' };

  const resBomb = applySwap(board, { row: 2, col: 2 }, { row: 3, col: 2 }, rng);
  assert.equal(resBomb.valid, true);
  assert.equal(resBomb.extraTurn, true);
  assert.equal(resBomb.steps[0].createdSpecials[0]?.special, 'bomb');

  // Nova + Nova double combo wipes all 49 tiles
  const wipeBoard = createBoard(rng);
  wipeBoard[3][3] = { id: 7001, color: 'azure', special: 'nova' };
  wipeBoard[3][4] = { id: 7002, color: 'gold', special: 'nova' };
  const wipeRes = applySwap(wipeBoard, { row: 3, col: 3 }, { row: 3, col: 4 }, rng);
  assert.equal(wipeRes.valid, true);
  assert.equal(wipeRes.extraTurn, true);
  assert.ok(wipeRes.steps[0].cleared.length === ROWS * COLS);

  // Targeted nova_burst skill blasts centered at custom target (1, 1)
  const team = buildBattleTeam('Player', [{ id: 'solfox', level: 2 }]);
  const foe = buildBattleTeam('Enemy', [{ id: 'frostkit', level: 2 }]);
  team.energy = MAX_TEAM_ENERGY;
  const castTarget = castLegendSkill(team, foe, 0, wipeBoard, rng, { row: 1, col: 1 });
  assert.ok(castTarget !== null);
  assert.ok(castTarget.clearedPositions.some((p) => p.row === 0 && p.col === 0));
});

test('APK progression curves: XP table, upgrade player XP, uses scaling, and trophy slot gates', () => {
  assert.equal(getXpToNextLevel(1), 40);
  assert.equal(getXpToNextLevel(3), 180);
  assert.equal(getLegendUses(1), 5);
  assert.equal(getLegendUses(4), 8);
  assert.deepEqual([0, 1, 2, 3, 4].map(getSlotUnlockTrophies), [0, 0, 0, 50, 300]);

  const starter = createStarterProfile();
  const upgraded = upgradeOwnedLegend(starter, 'leafcoon');
  assert.ok(upgraded !== null);
  assert.equal(upgraded.owned.leafcoon.level, 2);
  assert.ok(upgraded.playerLevel > starter.playerLevel || upgraded.xp > starter.xp);

  // Starter trophies = 120 (< 300): slot 5 stays locked, then unlocks at 300+
  const lockedTry = setLineupSlot(starter, 4, 'petalwisps');
  assert.equal(lockedTry.lineup[4], null);
  const unlockedProfile = { ...starter, trophies: 320 };
  const unlockedTry = setLineupSlot(unlockedProfile, 4, 'petalwisps');
  assert.equal(unlockedTry.lineup[4], 'petalwisps');
});
