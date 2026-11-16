export type BgmId = 'lobby' | 'match' | 'battle' | 'island';

export type SfxId =
  | 'ui-click'
  | 'ui-close'
  | 'ui-popup'
  | 'ui-equip'
  | 'ui-upgrade'
  | 'ui-summon-btn'
  | 'ui-summon-open'
  | 'ui-new-card'
  | 'ui-wheel-spin'
  | 'ui-wheel-win'
  | 'ui-chest'
  | 'ui-gold'
  | 'ui-diamond'
  | 'ui-build'
  | 'ui-trophy'
  | 'ui-match-go'
  | 'ui-match-found'
  | 'battle-ready'
  | 'battle-start'
  | 'tile-drag'
  | 'tile-move'
  | 'tile-clear-1'
  | 'tile-clear-2'
  | 'tile-clear-3'
  | 'tile-hv'
  | 'tile-bomb'
  | 'tile-bolt'
  | 'mana-gain'
  | 'orb-fly'
  | 'score-gain'
  | 'extra-move'
  | 'turn-switch'
  | 'enemy-turn'
  | 'star-1'
  | 'star-2'
  | 'star-3'
  | 'cheer'
  | 'skill-cast'
  | 'skill-fire'
  | 'skill-frost'
  | 'skill-thunder'
  | 'skill-nature'
  | 'skill-bloom'
  | 'skill-illusion'
  | 'skill-rainbow'
  | 'battle-win'
  | 'battle-lose';

const BGM_SRC: Record<BgmId, string> = {
  lobby: './assets/audio/bgm-lobby.ogg',
  match: './assets/audio/bgm-match.ogg',
  battle: './assets/audio/bgm-battle.ogg',
  island: './assets/audio/bgm-island.ogg',
};

const MUTE_STORAGE_KEY = 'little_legends_audio_muted_v1';

const SFX_VOLUME: Partial<Record<SfxId, number>> = {
  'ui-click': 0.55,
  'ui-close': 0.55,
  'tile-drag': 0.45,
  'tile-move': 0.65,
  'tile-clear-1': 0.65,
  'tile-clear-2': 0.7,
  'tile-clear-3': 0.75,
  'mana-gain': 0.5,
  'orb-fly': 0.42,
  'score-gain': 0.5,
};

let muted = loadInitialMute();
let currentBgmId: BgmId | null = null;
let bgmElement: HTMLAudioElement | null = null;
let pendingBgmId: BgmId | null = null;
const lastSfxAt = new Map<SfxId, number>();
const listeners = new Set<(isMuted: boolean) => void>();

function loadInitialMute(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isAudioMuted(): boolean {
  return muted;
}

export function subscribeMute(fn: (isMuted: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setAudioMuted(nextMuted: boolean): void {
  muted = nextMuted;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MUTE_STORAGE_KEY, nextMuted ? '1' : '0');
    }
  } catch {
    // Ignore storage failures in private windows.
  }

  if (bgmElement) {
    bgmElement.muted = nextMuted;
    if (!nextMuted && pendingBgmId && bgmElement.paused) {
      bgmElement.play().catch(() => {});
    }
  }
  listeners.forEach((fn) => fn(muted));
}

export function toggleAudioMuted(): boolean {
  const next = !muted;
  setAudioMuted(next);
  if (!next) {
    playSfx('ui-click');
  }
  return next;
}

export function unlockAudio(): void {
  if (typeof Audio === 'undefined' || muted) return;
  if (bgmElement && bgmElement.paused && currentBgmId) {
    bgmElement.play().catch(() => {});
  } else if (!bgmElement && pendingBgmId) {
    playBgm(pendingBgmId);
  }
}

export function playBgm(id: BgmId | null): void {
  pendingBgmId = id;
  if (typeof Audio === 'undefined') return;

  if (!id) {
    currentBgmId = null;
    if (bgmElement) {
      bgmElement.pause();
      bgmElement.currentTime = 0;
    }
    return;
  }

  if (currentBgmId === id && bgmElement) {
    if (!muted && bgmElement.paused) {
      bgmElement.play().catch(() => {});
    }
    return;
  }

  if (bgmElement) {
    bgmElement.pause();
  }

  currentBgmId = id;
  const audio = new Audio(BGM_SRC[id]);
  audio.loop = true;
  audio.volume = id === 'battle' ? 0.34 : 0.38;
  audio.muted = muted;
  bgmElement = audio;
  if (!muted) {
    audio.play().catch(() => {});
  }
}

export function playSfx(id: SfxId, volumeOverride?: number): void {
  if (muted || typeof Audio === 'undefined') return;
  const now = Date.now();
  const prev = lastSfxAt.get(id) ?? 0;
  if (now - prev < 40) return;
  lastSfxAt.set(id, now);

  try {
    const audio = new Audio(`./assets/audio/${id}.ogg`);
    audio.volume = volumeOverride ?? SFX_VOLUME[id] ?? 0.72;
    audio.play().catch(() => {});
  } catch {
    // Ignore decode/autoplay failures.
  }
}

export function playSkillSfxForLegend(legendId: string): void {
  if (legendId === 'emberdrake' || legendId === 'c104' || legendId === 'c124' || legendId === 'c130') {
    playSfx('skill-fire');
    return;
  }
  if (legendId === 'frostkit' || legendId === 'c108' || legendId === 'c137' || legendId === 'c139') {
    playSfx('skill-frost');
    return;
  }
  if (legendId === 'galewing' || legendId === 'c109' || legendId === 'c114' || legendId === 'c125' || legendId === 'c103') {
    playSfx('skill-thunder');
    return;
  }
  if (legendId === 'leafcoon' || legendId === 'verdawyrm' || legendId === 'c111' || legendId === 'c126') {
    playSfx('skill-nature');
    return;
  }
  if (legendId === 'petalwisps' || legendId === 'c122' || legendId === 'c138') {
    playSfx('skill-bloom');
    return;
  }
  if (legendId === 'mistfox' || legendId === 'duskhorn' || legendId === 'c142' || legendId === 'c153') {
    playSfx('skill-illusion');
    return;
  }
  if (legendId === 'solfox' || legendId === 'c136' || legendId === 'c107' || legendId === 'c134') {
    playSfx('skill-rainbow');
    return;
  }
  playSfx('skill-cast');
}
