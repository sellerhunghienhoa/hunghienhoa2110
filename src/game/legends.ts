import type {
  GemColor,
  LegendDef,
  LegendRole,
  OwnedLegend,
  PlayerProfile,
  SkillEffectKind,
  TierTag,
} from './types.ts';

export const GEM_COLORS: readonly GemColor[] = [
  'gold',
  'amber',
  'jade',
  'azure',
  'rose',
  'violet',
];

const COLOR_PALETTES: Record<GemColor, LegendDef['palette']> = {
  gold: { primary: '#fbbf24', secondary: '#fff3c4', accent: '#f97316', glow: '#fde047' },
  amber: { primary: '#fb923c', secondary: '#ffedd5', accent: '#dc2626', glow: '#fdba74' },
  jade: { primary: '#4ade80', secondary: '#dcfce7', accent: '#15803d', glow: '#86efac' },
  azure: { primary: '#38bdf8', secondary: '#e0f2fe', accent: '#0284c7', glow: '#7dd3fc' },
  rose: { primary: '#f472b6', secondary: '#fce7f3', accent: '#db2777', glow: '#f9a8d4' },
  violet: { primary: '#a78bfa', secondary: '#ede9fe', accent: '#6d28d9', glow: '#c4b5fd' },
};

const TIER_TO_RARITY: Record<TierTag, LegendDef['rarity']> = {
  COMMON: 'Common',
  RARE: 'Rare',
  EPIC: 'Epic',
  MYTHIC: 'Legend',
};

const TIER_POWER_BONUS: Record<TierTag, number> = {
  COMMON: 24,
  RARE: 25,
  EPIC: 30,
  MYTHIC: 33,
};

function mkLegend(
  id: string,
  cardCode: string,
  name: string,
  tierTag: TierTag,
  color: GemColor,
  role: LegendRole,
  manaCost: number,
  effectKind: SkillEffectKind,
  skillName: string,
  skillDesc: string,
  opts: { targetTile?: boolean; hp?: number; awakenDesc?: string } = {},
): LegendDef {
  return {
    id,
    cardCode,
    name,
    title: tierTag,
    color,
    role,
    manaCost,
    baseAttack: TIER_POWER_BONUS[tierTag],
    baseHp: opts.hp ?? (tierTag === 'MYTHIC' ? 148 : tierTag === 'EPIC' ? 132 : 118),
    skillName,
    skillDesc,
    awakenDesc: opts.awakenDesc ?? 'Thức tỉnh +25% sát thương kỹ năng & giảm 1 điểm tiêu hao Ma lực.',
    effectKind,
    targetTile: opts.targetTile,
    rarity: TIER_TO_RARITY[tierTag],
    tierTag,
    palette: COLOR_PALETTES[color],
  };
}

export const LEGENDS: readonly LegendDef[] = [
  // 9 IDs gốc tương thích engine & test, nâng cấp đúng dữ liệu APK tiếng Việt
  mkLegend('solfox', 'c109', 'Tia Sét', 'EPIC', 'gold', 'Limited', 7, 'nova_burst', 'Đám Mây Dông', 'Tạo một đám mây dông tại một cột ngẫu nhiên. Sau khi so khớp theo chiều dọc 1, đám mây dông sẽ xóa cột đó.', { targetTile: true }),
  mkLegend('frostkit', 'c106', 'Cánh Cụt Xanh', 'RARE', 'azure', 'Limited', 6, 'shield_heal', 'Biến Đổi Lam', 'Chọn một mảnh thường và biến nó thành một mảnh màu lam, tạo giáp bảo vệ đồng minh.', { hp: 135 }),
  mkLegend('emberdrake', 'c145', 'Thợ Săn Bánh Đà', 'MYTHIC', 'amber', 'Active', 7, 'drain_burn', 'Bánh Đà Xoáy', 'Triệu hồi một Bánh Đà bay quanh trận và loại bỏ tất cả các mảnh trên đường của nó.'),
  mkLegend('leafcoon', 'c142', 'Nhà Ảo Thuật', 'RARE', 'jade', 'Active', 6, 'convert_gems', 'Sao Chép Cột', 'Chọn 1 cột và sao chép tất cả các phần sang bên phải.', { hp: 140 }),
  mkLegend('petalwisps', 'c122', 'Hoa La', 'EPIC', 'rose', 'Active', 7, 'shield_heal', 'Nở Hoa Kết Giới', 'Ghép 3 mảnh ngẫu nhiên thành [Hoa]. Điểm ban đầu là 3 và mỗi lần loại bỏ, Điểm hoa +1.'),
  mkLegend('duskhorn', 'c107', 'Flash', 'EPIC', 'violet', 'Active', 7, 'blast_row', 'Nhấp Nháy', 'Đánh dấu ngẫu nhiên 5 mảnh và loại bỏ chúng bằng Flash, với hiệu ứng [Nhấp nháy].'),
  mkLegend('galewing', 'c105', 'Chim Cú', 'RARE', 'azure', 'Limited', 6, 'strike', 'Đạo Cụ Gió', 'Kích hoạt ngẫu nhiên 2 [Đạo cụ đặc biệt] trên trận (Nấm, Bí Ngô, Quả Điện).'),
  mkLegend('verdawyrm', 'c103', 'Lốc Xoáy', 'RARE', 'jade', 'Limited', 7, 'convert_gems', 'Gió Lốc Xáo Trộn', 'Gió Lốc dẫn gió để xáo trộn tất cả các mảnh trên trận.'),
  mkLegend('mistfox', 'c153', 'Mị Tinh', 'MYTHIC', 'rose', 'Limited', 7, 'strike', 'Bẫy Bóng Tối', 'Triệu hồi 4 bẫy bóng tối và sẽ được kích hoạt sau khi loại bỏ: Lấy 1 Ma Lực của đối thủ.'),

  // Các Tinh Linh còn lại đầy đủ từ bộ ảnh APK
  mkLegend('c101', 'c101', 'Chuột Nổ', 'COMMON', 'amber', 'Active', 7, 'nova_burst', 'Quả Thông Nổ', 'Chọn một mảnh làm trung tâm và thả Quả Thông Nổ để loại bỏ 13 mảnh xung quanh nó.', { targetTile: true }),
  mkLegend('c102', 'c102', 'Thỏ Quái Lực', 'COMMON', 'gold', 'Limited', 6, 'strike', 'Củ Cà Rốt Khổng Lồ', 'Loại bỏ ngẫu nhiên 2 mảnh màu lam và dồn sát thương.'),
  mkLegend('c104', 'c104', 'Rồng Lửa Nhỏ', 'RARE', 'amber', 'Active', 7, 'drain_burn', 'Phun Lửa Hai Bên', 'Sau khi sử dụng kỹ năng, di chuyển để khớp các mảnh và phun lửa từ cả hai phía.'),
  mkLegend('c108', 'c108', 'Cáo Tuyết Băng Tinh', 'EPIC', 'azure', 'Passive', 6, 'shield_heal', 'Đóng Băng Khởi Đầu', 'Được kích hoạt vào đầu mỗi trận đấu, nhận được 1 điểm Ma Lực và đóng băng ngẫu nhiên 2 mảnh.'),
  mkLegend('c110', 'c110', 'Rồng Thời Gian', 'MYTHIC', 'violet', 'Limited', 8, 'blast_row', 'Ngưng Đọng Thời Gian', 'Tạm dừng đếm ngược trò chơi trong một khoảng thời gian nhất định để di chuyển các mảnh tùy ý.'),
  mkLegend('c114', 'c114', 'Cừu Điện', 'RARE', 'gold', 'Active', 7, 'blast_row', 'Tia Sét Chữ Thập', 'Chọn 1 mảnh và loại bỏ tất cả các mảnh trong hàng và cột của nó.', { targetTile: true }),
  mkLegend('c115', 'c115', 'Hô Hô', 'COMMON', 'jade', 'Active', 8, 'convert_gems', 'Ngọn Gió Thổi Bay', 'Thổi tất cả các mảnh của 1 màu ngẫu nhiên sang bên phải.'),
  mkLegend('c113', 'c113', 'Cáo Nho Xanh', 'COMMON', 'jade', 'Active', 7, 'blast_row', 'Bắn Dây Leo', 'Bắn 2 Dây Leo để loại bỏ tất cả các mảnh trong 2 cột ngẫu nhiên.'),
  mkLegend('c116', 'c116', 'Chuột Bay Tia Chớp', 'COMMON', 'azure', 'Limited', 6, 'strike', 'Thả Đạo Cụ', 'Thả 1 [Đạo cụ đặc biệt] ngẫu nhiên trên trận (Nấm, Bí Ngô, Quả Điện).'),
  mkLegend('c118', 'c118', 'Bướm Đêm', 'RARE', 'jade', 'Active', 7, 'convert_gems', 'Hút Màu', 'Hút mất tất cả các mảnh có màu ngẫu nhiên trên bàn cờ.'),
  mkLegend('c121', 'c121', 'Trưởng Chuột Bay', 'EPIC', 'jade', 'Active', 8, 'nova_burst', 'Mưa Quả Điện', 'Ném 3 Quả Điện hoặc Quả Điện nhỏ lên bàn cờ và kích hoạt ngay.'),
  mkLegend('c124', 'c124', 'Viêm Bộc', 'EPIC', 'amber', 'Passive', 7, 'drain_burn', 'Bí Ngô Bộc Phá', 'Mỗi vòng kích hoạt 1 lần, nếu có Bí Ngô trên trận, nó sẽ tự phát nổ.'),
  mkLegend('c126', 'c126', 'Vua Khỉ', 'MYTHIC', 'gold', 'Active', 8, 'blast_row', 'Thả 5 Trái Cây', 'Thả 5 [Trái Cây] và Vua Khỉ sẽ thu thập loại bỏ các mảnh trên đường đi từ trái sang phải.'),
  mkLegend('c129', 'c129', 'Anubis', 'MYTHIC', 'violet', 'Active', 7, 'nova_burst', 'Cát Hoàng Kim', 'Chọn một màu và 4 mảnh sẽ được thay đổi thành màu đó rồi kích hoạt nổ 2 lần.'),
  mkLegend('c130', 'c130', 'Kẻ Bắt Sao', 'MYTHIC', 'violet', 'Active', 8, 'nova_burst', 'Mưa Thiên Thạch', 'Triệu hồi 1 Thiên Thạch lớn và 2 Thiên Thạch nhỏ loại bỏ các mảnh; mỗi bước rơi thêm 1 Thiên Thạch.'),
  mkLegend('c131', 'c131', 'Chuột Điên Bộc Phá', 'EPIC', 'amber', 'Active', 7, 'blast_row', 'Hai Hàng Chuột Nổ', 'Thả 1 quả Bí Ngô lên trận và triệu tập hai nhóm Chuột Nổ càn quét hai hàng ngẫu nhiên.'),
  mkLegend('c133', 'c133', 'Tiên Tri Hươu', 'EPIC', 'jade', 'Active', 8, 'convert_gems', 'Tiên Tri Di Chuyển', 'Di chuyển 5 mảnh trên trận, ưu tiên các mảnh bị xóa sau khi chọn.'),
  mkLegend('c134', 'c134', 'Ánh Sáng Vàng', 'EPIC', 'gold', 'Active', 8, 'strike', 'Đào Kho Báu', 'Đánh dấu 6 mảnh theo lòng đất để đào ra [Kho báu] nhận đạo cụ hoặc điểm Ma Lực.'),
  mkLegend('c135', 'c135', 'Sương Hoả', 'MYTHIC', 'rose', 'Limited', 7, 'nova_burst', 'Pha Lê Đỏ Lam', 'Tạo một số [Pha lê] mang hai thuộc tính đỏ và xanh lam; ghép 2 viên kích nổ cực đại.'),
  mkLegend('c136', 'c136', 'Cầu Vồng', 'MYTHIC', 'rose', 'Active', 6, 'convert_gems', 'Chiếu Sáng Cầu Vồng', 'Chiếu sáng các mảnh trên trận, chuyển toàn bộ vùng sáng về cùng một màu.'),
  mkLegend('c137', 'c137', 'Sương Linh', 'MYTHIC', 'azure', 'Limited', 7, 'strike', 'Triệu Hồi Linh Ngư', 'Triệu hồi 3 [Linh Ngư] trên trận; khi bị loại bỏ sẽ xóa thêm mảnh màu lam.'),
  mkLegend('c138', 'c138', 'Thần Phục Sinh', 'MYTHIC', 'jade', 'Passive', 7, 'shield_heal', 'Nấm Xung Kích', 'Mỗi vòng bắt đầu, ngẫu nhiên hình thành 1 Nấm xung kích màu xanh.'),
  mkLegend('c139', 'c139', 'Rồng Nước', 'MYTHIC', 'azure', 'Limited', 7, 'blast_row', 'Thủy Long Sao Chép', 'Sao chép và kích hoạt 2 đạo cụ đặc biệt; mỗi lần di chuyển tạo thêm tối đa 9 đạo cụ.'),
  mkLegend('c146', 'c146', 'Lãnh Chủ Lôi Đình', 'MYTHIC', 'gold', 'Active', 7, 'nova_burst', 'Quả Cầu Sét', 'Tạo [Quả Cầu Sét] nhận 4 Quả Điện nhỏ và kích hoạt ngay; mỗi bước rơi thêm Quả Điện.'),
  mkLegend('c148', 'c148', 'Ma Ném Bóng', 'MYTHIC', 'violet', 'Active', 8, 'drain_burn', 'Bí Ngô Cộng Dồn', 'Chọn 1 khối ném Bí Ngô nổ ngay lập tức; cộng dồn thêm tối đa 9 quả mỗi lần dùng kỹ năng.', { targetTile: true }),
  mkLegend('c151', 'c151', 'Vuốt Ngự Lôi', 'MYTHIC', 'violet', 'Limited', 7, 'nova_burst', 'Lôi Trảo Chữ Thập', 'Chọn 1 ô khiến các mảnh vàng chữ thập biến thành Quả Điện và có thể tái kích hoạt trong lượt.', { targetTile: true }),
  mkLegend('c152', 'c152', 'Âm Thanh Vui Nhộn', 'MYTHIC', 'rose', 'Passive', 7, 'shield_heal', 'Nốt Nhạc Cộng Hưởng', 'Khi kết thúc chuỗi mắt xích sinh mảnh Lam [Nốt Nhạc]; kích hoạt 1 Nốt Nhạc sẽ nổ toàn bộ Nốt Nhạc.'),
];

export const LEGEND_BY_ID: Record<string, LegendDef> = Object.fromEntries(
  LEGENDS.map((legend) => [legend.id, legend]),
);

export function getLegendDef(id: string): LegendDef {
  return LEGEND_BY_ID[id] ?? LEGENDS[0];
}

/** Resolve card/head/splash URLs from extracted APK card sets with safe fallback. */
export function getLegendCardPaths(id: string): { card: string; head: string; splash: string } {
  const def = getLegendDef(id);
  const code = def.cardCode;
  if (code) {
    // c113 only extracted splash texture; reuse splash cleanly when icon is absent
    const hasIcon = code !== 'c112' && code !== 'c113' && code !== 'c117';
    return {
      card: hasIcon ? `./assets/cards/${code}/card.png` : `./assets/cards/${code}/splash.png`,
      head: hasIcon ? `./assets/cards/${code}/head.png` : `./assets/cards/${code}/splash.png`,
      splash: `./assets/cards/${code}/splash.png`,
    };
  }
  return {
    card: `./assets/legends/${id}/card.png`,
    head: `./assets/legends/${id}/head.png`,
    splash: `./assets/legends/${id}/card.png`,
  };
}

export function getLegendStats(id: string, level: number): { attack: number; hp: number } {
  const def = getLegendDef(id);
  const scale = 1 + (Math.max(1, level) - 1) * 0.14;
  return {
    attack: Math.round(def.baseAttack * scale),
    hp: Math.round(def.baseHp * scale),
  };
}

export function getUpgradeCost(owned: OwnedLegend): { gold: number; shardsNeeded: number } {
  return {
    gold: 120 + owned.level * 85,
    shardsNeeded: 3 + Math.floor(owned.level / 2) * 2,
  };
}

const CARD_UPGRADE_XP = [20, 25, 30, 40, 50, 100, 120, 140, 160, 180];

export function getUpgradeXpReward(level: number): number {
  const idx = Math.max(0, level - 1);
  return CARD_UPGRADE_XP[idx] ?? 180 + Math.max(0, level - CARD_UPGRADE_XP.length) * 20;
}

export function getLegendUses(level: number): number {
  return 5 + Math.max(0, level - 1);
}

const SLOT_UNLOCK_TROPHIES = [0, 0, 0, 50, 300] as const;

export function getSlotUnlockTrophies(slotIndex: number): number {
  return SLOT_UNLOCK_TROPHIES[slotIndex] ?? 300;
}

export function canUpgradeLegend(owned: OwnedLegend, gold: number): boolean {
  const cost = getUpgradeCost(owned);
  return owned.shards >= cost.shardsNeeded && gold >= cost.gold;
}

export function getTeamPower(profile: PlayerProfile): number {
  return profile.lineup.reduce((total, id) => {
    if (!id) return total;
    const owned = profile.owned[id];
    if (!owned) return total;
    const stats = getLegendStats(id, owned.level);
    return total + Math.round(stats.attack * 1.6 + stats.hp * 0.35);
  }, 0);
}

export const PLAYER_LEVEL_XP = [
  40, 100, 180, 280, 400, 560, 760, 1000, 1280, 1600,
  2000, 2480, 3040, 3680, 4400, 5200, 6100, 7100, 8200, 9400,
  10700, 12100, 13600, 15200, 16900,
] as const;

export function getXpToNextLevel(level: number): number {
  const idx = Math.max(0, level - 1);
  return PLAYER_LEVEL_XP[idx] ?? 16900 + Math.max(0, level - PLAYER_LEVEL_XP.length) * 1800;
}

export interface DecorCatalogItem {
  id: string;
  name: string;
  icon: string;
  costGold: number;
  score: number;
}

export const DECOR_CATALOG: readonly DecorCatalogItem[] = [
  { id: 'ferris', name: 'Vòng Quay Mặt Trời', icon: '🎡', costGold: 320, score: 180 },
  { id: 'carousel', name: 'Đu Quay Thảo Nguyên', icon: '🎠', costGold: 220, score: 130 },
  { id: 'spire', name: 'Tháp Hoàng Gia', icon: '🏰', costGold: 280, score: 160 },
  { id: 'fountain', name: 'Đài Phun Pha Lê', icon: '⛲', costGold: 180, score: 110 },
  { id: 'bakery', name: 'Tiệm Bánh Mật Ong', icon: '🧁', costGold: 140, score: 85 },
  { id: 'statue', name: 'Tượng Thiên Thần', icon: '🗽', costGold: 240, score: 145 },
];

export function createStarterProfile(): PlayerProfile {
  const now = Date.now();
  return {
    playerLevel: 1,
    xp: 20,
    manaOrbs: 650,
    gold: 900,
    diamonds: 240,
    trophies: 120,
    decorScore: 290,
    freeSpins: 2,
    tournamentStage: 1,
    playerName: 'TestVIP999',
    avatarId: 'c101',
    avatarFrame: 1,
    winStreak: 3,
    winsTotal: 8,
    talentPreset: 1,
    talentLevels: { root: 1 },
    claimFlags: {},
    owned: {
      solfox: { id: 'solfox', level: 2, shards: 3 },
      frostkit: { id: 'frostkit', level: 2, shards: 2 },
      leafcoon: { id: 'leafcoon', level: 1, shards: 3 },
      petalwisps: { id: 'petalwisps', level: 1, shards: 1 },
      galewing: { id: 'galewing', level: 1, shards: 2 },
      c101: { id: 'c101', level: 2, shards: 4 },
      c102: { id: 'c102', level: 1, shards: 2 },
      c129: { id: 'c129', level: 1, shards: 1 },
    },
    lineup: ['solfox', 'frostkit', 'leafcoon', null, null],
    islands: [
      { id: 'shrine', name: 'Đền Ma Lực', level: 1, guardianId: 'petalwisps', lastClaimAt: now - 35_000 },
      { id: 'mine', name: 'Mỏ Vàng Nắng', level: 1, guardianId: 'galewing', lastClaimAt: now - 35_000 },
      { id: 'grove', name: 'Rừng Pha Lê', level: 1, guardianId: null, lastClaimAt: now - 35_000 },
    ],
    decorations: [
      { slot: 0, decorId: 'ferris', level: 1 },
      { slot: 1, decorId: 'fountain', level: 1 },
    ],
    bracket: null,
  };
}

export interface EnemyPreset {
  name: string;
  title: string;
  rewardGold: number;
  rewardOrbs: number;
  rewardDiamonds: number;
  rewardTrophies: number;
  squad: Array<{ id: string; level: number }>;
}

export const AI_OPPONENTS: readonly EnemyPreset[] = [
  {
    name: 'Đội Tán Rừng',
    title: 'Thử Thách Rừng',
    rewardGold: 220,
    rewardOrbs: 150,
    rewardDiamonds: 25,
    rewardTrophies: 24,
    squad: [
      { id: 'emberdrake', level: 1 },
      { id: 'leafcoon', level: 1 },
      { id: 'galewing', level: 1 },
    ],
  },
  {
    name: 'Bầy Hoàng Hôn',
    title: 'Cúp Bạc',
    rewardGold: 340,
    rewardOrbs: 220,
    rewardDiamonds: 45,
    rewardTrophies: 36,
    squad: [
      { id: 'duskhorn', level: 2 },
      { id: 'frostkit', level: 2 },
      { id: 'verdawyrm', level: 2 },
      { id: 'mistfox', level: 2 },
    ],
  },
  {
    name: 'Vệ Thần Đỉnh Cao',
    title: 'Đại Kiện Tướng',
    rewardGold: 520,
    rewardOrbs: 340,
    rewardDiamonds: 80,
    rewardTrophies: 55,
    squad: [
      { id: 'solfox', level: 4 },
      { id: 'emberdrake', level: 4 },
      { id: 'duskhorn', level: 3 },
      { id: 'frostkit', level: 3 },
      { id: 'mistfox', level: 3 },
    ],
  },
];
