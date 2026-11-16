import {
  DECOR_CATALOG,
  LEGENDS,
  createStarterProfile,
  getLegendDef,
  getSlotUnlockTrophies,
  getTeamPower,
  getUpgradeCost,
  getUpgradeXpReward,
  getXpToNextLevel,
} from './legends.ts';
import type { BracketSlot, PlayerProfile, TournamentBracket } from './types.ts';

const STORAGE_KEY = 'little_legends_puzzle_pvp_profile_v1';

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStarterProfile();
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    if (!parsed || !parsed.owned || !Array.isArray(parsed.lineup)) {
      return createStarterProfile();
    }
    const starter = createStarterProfile();
    return {
      ...starter,
      ...parsed,
      lineup: [...parsed.lineup, null, null, null, null, null].slice(0, 5),
      islands:
        Array.isArray(parsed.islands) && parsed.islands.length === 3
          ? parsed.islands
          : starter.islands,
      decorations: Array.isArray(parsed.decorations)
        ? parsed.decorations
        : starter.decorations,
      decorScore: typeof parsed.decorScore === 'number' ? parsed.decorScore : starter.decorScore,
      freeSpins: typeof parsed.freeSpins === 'number' ? parsed.freeSpins : starter.freeSpins,
      bracket: parsed.bracket ?? null,
    };
  } catch {
    return createStarterProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage quota or private browsing; game remains playable in memory.
  }
}

export function grantProfileRewards(
  profile: PlayerProfile,
  rewards: {
    gold: number;
    manaOrbs: number;
    diamonds: number;
    xp: number;
    trophies: number;
    shardLegendId?: string;
    shards?: number;
  },
): PlayerProfile {
  let playerLevel = profile.playerLevel;
  let xp = profile.xp + rewards.xp;
  while (xp >= getXpToNextLevel(playerLevel)) {
    xp -= getXpToNextLevel(playerLevel);
    playerLevel += 1;
  }

  const owned = { ...profile.owned };
  if (rewards.shardLegendId && rewards.shards && rewards.shards > 0) {
    const prev = owned[rewards.shardLegendId];
    owned[rewards.shardLegendId] = prev
      ? { ...prev, shards: prev.shards + rewards.shards }
      : { id: rewards.shardLegendId, level: 1, shards: rewards.shards };
  }

  return {
    ...profile,
    playerLevel,
    xp,
    gold: profile.gold + rewards.gold,
    manaOrbs: profile.manaOrbs + rewards.manaOrbs,
    diamonds: profile.diamonds + rewards.diamonds,
    trophies: Math.max(0, profile.trophies + rewards.trophies),
    owned,
  };
}

export interface SummonPull {
  legendId: string;
  isNew: boolean;
  shardsGained: number;
  newLevel: number;
}

export function performSummonPack(
  profile: PlayerProfile,
  count: 1 | 9,
  currency: 'gold' | 'diamonds',
  rng: () => number = Math.random,
): { profile: PlayerProfile; pulls: SummonPull[] } | null {
  const cost = count === 9
    ? (currency === 'diamonds' ? 180 : 1200)
    : (currency === 'diamonds' ? 25 : 160);

  if (currency === 'diamonds' && profile.diamonds < cost) return null;
  if (currency === 'gold' && profile.gold < cost) return null;

  const owned = { ...profile.owned };
  const pulls: SummonPull[] = [];

  for (let i = 0; i < count; i++) {
    const pick = LEGENDS[Math.floor(rng() * LEGENDS.length) % LEGENDS.length];
    const existing = owned[pick.id];
    const shardsGained = pick.rarity === 'Legend' ? 2 : 3;
    if (!existing) {
      owned[pick.id] = { id: pick.id, level: 1, shards: shardsGained };
      pulls.push({
        legendId: pick.id,
        isNew: true,
        shardsGained,
        newLevel: 1,
      });
    } else {
      owned[pick.id] = { ...existing, shards: existing.shards + shardsGained };
      pulls.push({
        legendId: pick.id,
        isNew: false,
        shardsGained,
        newLevel: existing.level,
      });
    }
  }

  return {
    profile: {
      ...profile,
      gold: currency === 'gold' ? profile.gold - cost : profile.gold,
      diamonds: currency === 'diamonds' ? profile.diamonds - cost : profile.diamonds,
      owned,
    },
    pulls,
  };
}

export function upgradeOwnedLegend(
  profile: PlayerProfile,
  legendId: string,
): PlayerProfile | null {
  const existing = profile.owned[legendId];
  if (!existing) return null;
  const cost = getUpgradeCost(existing);
  if (existing.shards < cost.shardsNeeded || profile.gold < cost.gold) return null;

  const upgraded: PlayerProfile = {
    ...profile,
    gold: profile.gold - cost.gold,
    owned: {
      ...profile.owned,
      [legendId]: {
        ...existing,
        level: existing.level + 1,
        shards: existing.shards - cost.shardsNeeded,
      },
    },
  };
  return grantProfileRewards(upgraded, {
    gold: 0,
    manaOrbs: 0,
    diamonds: 0,
    xp: getUpgradeXpReward(existing.level),
    trophies: 0,
  });
}

export function setLineupSlot(
  profile: PlayerProfile,
  slotIndex: number,
  legendId: string | null,
): PlayerProfile {
  if (slotIndex < 0 || slotIndex >= 5) return profile;
  if (legendId && profile.trophies < getSlotUnlockTrophies(slotIndex)) return profile;
  const next = [...profile.lineup];
  if (legendId) {
    const prevIdx = next.indexOf(legendId);
    if (prevIdx !== -1 && prevIdx !== slotIndex) {
      next[prevIdx] = next[slotIndex];
    }
  }
  next[slotIndex] = legendId;

  // Ensure at least 1 legend remains in lineup for combat.
  const hasAny = next.some((id) => id !== null);
  if (!hasAny) {
    next[0] = legendId ?? Object.keys(profile.owned)[0] ?? getLegendDef('solfox').id;
  }
  return { ...profile, lineup: next };
}

export interface WheelSlice {
  id: string;
  label: string;
  color: string;
  reward:
    | { kind: 'orbs'; amount: number }
    | { kind: 'diamonds'; amount: number }
    | { kind: 'gold'; amount: number }
    | { kind: 'shards'; amount: number };
}

export const WHEEL_SLICES: readonly WheelSlice[] = [
  { id: 'w0', label: 'Chest +6★', color: '#facc15', reward: { kind: 'shards', amount: 6 } },
  { id: 'w1', label: '300 Orbs', color: '#fb923c', reward: { kind: 'orbs', amount: 300 } },
  { id: 'w2', label: '+3 Shards', color: '#84cc16', reward: { kind: 'shards', amount: 3 } },
  { id: 'w3', label: '600 Orbs', color: '#22c55e', reward: { kind: 'orbs', amount: 600 } },
  { id: 'w4', label: '500 Gold', color: '#14b8a6', reward: { kind: 'gold', amount: 500 } },
  { id: 'w5', label: '1000 Orbs', color: '#3b82f6', reward: { kind: 'orbs', amount: 1000 } },
  { id: 'w6', label: 'Card +4★', color: '#6366f1', reward: { kind: 'shards', amount: 4 } },
  { id: 'w7', label: '1500 Orbs', color: '#a855f7', reward: { kind: 'orbs', amount: 1500 } },
  { id: 'w8', label: '100 Gems', color: '#ec4899', reward: { kind: 'diamonds', amount: 100 } },
  { id: 'w9', label: '2000 Orbs', color: '#f43f5e', reward: { kind: 'orbs', amount: 2000 } },
];

export function spinRewardWheel(
  profile: PlayerProfile,
  rng: () => number = Math.random,
): { profile: PlayerProfile; sliceIndex: number; summary: string } | null {
  const paidGoldCost = 180;
  const usingFree = profile.freeSpins > 0;
  if (!usingFree && profile.gold < paidGoldCost) return null;

  const sliceIndex = Math.floor(rng() * WHEEL_SLICES.length) % WHEEL_SLICES.length;
  const slice = WHEEL_SLICES[sliceIndex];
  const next: PlayerProfile = {
    ...profile,
    freeSpins: usingFree ? profile.freeSpins - 1 : profile.freeSpins,
    gold: usingFree ? profile.gold : profile.gold - paidGoldCost,
    owned: { ...profile.owned },
  };

  let summary = slice.label;
  if (slice.reward.kind === 'orbs') {
    next.manaOrbs += slice.reward.amount;
    summary = `+${slice.reward.amount} Mana Orbs!`;
  } else if (slice.reward.kind === 'diamonds') {
    next.diamonds += slice.reward.amount;
    summary = `+${slice.reward.amount} Diamonds!`;
  } else if (slice.reward.kind === 'gold') {
    next.gold += slice.reward.amount;
    summary = `+${slice.reward.amount} Gold!`;
  } else {
    const pick = LEGENDS[Math.floor(rng() * LEGENDS.length) % LEGENDS.length];
    const prev = next.owned[pick.id];
    next.owned[pick.id] = prev
      ? { ...prev, shards: prev.shards + slice.reward.amount }
      : { id: pick.id, level: 1, shards: slice.reward.amount };
    summary = `+${slice.reward.amount} ${pick.name} Shards!`;
  }

  return { profile: next, sliceIndex, summary };
}

export function createTournamentBracket(profile: PlayerProfile): TournamentBracket {
  const playerPower = Math.max(120, getTeamPower(profile));
  const playerLead = profile.lineup.find(Boolean) ?? 'solfox';
  const rivals: BracketSlot[] = [
    { name: 'Aileen', power: Math.round(playerPower * 0.85), legendId: 'leafcoon' },
    { name: 'Edora', power: Math.round(playerPower * 0.96), legendId: 'emberdrake' },
    { name: 'Kathy', power: Math.round(playerPower * 1.04), legendId: 'galewing' },
    { name: 'Kenny', power: Math.round(playerPower * 1.12), legendId: 'frostkit' },
    { name: 'BB357', power: Math.round(playerPower * 0.92), legendId: 'duskhorn' },
    { name: 'Alex', power: Math.round(playerPower * 1.02), legendId: 'verdawyrm' },
    { name: 'Anna', power: Math.round(playerPower * 1.18), legendId: 'mistfox' },
  ];

  const playerSlot: BracketSlot = {
    name: 'You',
    power: playerPower,
    legendId: playerLead,
    isPlayer: true,
  };

  return {
    round: 0,
    qfPairs: [
      [playerSlot, rivals[0]],
      [rivals[1], rivals[2]],
      [rivals[3], rivals[4]],
      [rivals[5], rivals[6]],
    ],
    qfWinners: [null, null, null, null],
    sfWinners: [null, null],
    champion: null,
  };
}

function higherPower(a: BracketSlot, b: BracketSlot): BracketSlot {
  return a.power >= b.power ? a : b;
}

export function advanceTournamentBracket(
  bracket: TournamentBracket,
  playerWon: boolean,
): TournamentBracket {
  if (bracket.round === 0) {
    const qfWinners: Array<BracketSlot | null> = [
      playerWon ? bracket.qfPairs[0][0] : bracket.qfPairs[0][1],
      higherPower(bracket.qfPairs[1][0], bracket.qfPairs[1][1]),
      higherPower(bracket.qfPairs[2][0], bracket.qfPairs[2][1]),
      higherPower(bracket.qfPairs[3][0], bracket.qfPairs[3][1]),
    ];
    return {
      ...bracket,
      round: playerWon ? 1 : 3,
      qfWinners,
      champion: playerWon ? null : qfWinners[1],
    };
  }

  if (bracket.round === 1) {
    const sf0 = playerWon ? bracket.qfWinners[0]! : bracket.qfWinners[1]!;
    const sf1 = higherPower(bracket.qfWinners[2]!, bracket.qfWinners[3]!);
    return {
      ...bracket,
      round: playerWon ? 2 : 3,
      sfWinners: [sf0, sf1],
      champion: playerWon ? null : sf1,
    };
  }

  if (bracket.round === 2) {
    const champ = playerWon ? bracket.sfWinners[0]! : bracket.sfWinners[1]!;
    return {
      ...bracket,
      round: 3,
      champion: champ,
    };
  }

  return bracket;
}

export function placeOrUpgradeDecor(
  profile: PlayerProfile,
  slot: number,
  decorId: string,
): PlayerProfile | null {
  const item = DECOR_CATALOG.find((d) => d.id === decorId);
  if (!item || slot < 0 || slot >= 6) return null;

  const existing = profile.decorations.find((d) => d.slot === slot);
  if (existing && existing.decorId === decorId) {
    const upgradeCost = Math.round(item.costGold * existing.level * 0.9);
    if (profile.gold < upgradeCost) return null;
    return {
      ...profile,
      gold: profile.gold - upgradeCost,
      decorScore: profile.decorScore + Math.round(item.score * 0.6),
      decorations: profile.decorations.map((d) =>
        d.slot === slot ? { ...d, level: d.level + 1 } : d,
      ),
    };
  }

  if (profile.gold < item.costGold) return null;
  const filtered = profile.decorations.filter((d) => d.slot !== slot);
  const replacedScore = existing
    ? (DECOR_CATALOG.find((d) => d.id === existing.decorId)?.score ?? 0) * existing.level
    : 0;

  return {
    ...profile,
    gold: profile.gold - item.costGold,
    decorScore: Math.max(0, profile.decorScore - replacedScore + item.score),
    decorations: [...filtered, { slot, decorId, level: 1 }],
  };
}
