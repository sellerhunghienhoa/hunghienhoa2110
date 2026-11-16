import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COLS,
  MAX_BATTLE_ROUNDS,
  MAX_TEAM_ENERGY,
  MOVES_PER_TURN,
  ROWS,
  advanceTurnState,
  applyMatchImpact,
  applySwap,
  buildBattleTeam,
  castLegendSkill,
  cloneTeam,
  createBoard,
  findAllValidSwaps,
  getLegendEnergyCost,
  isLegendSkillReady,
  pickBestAiAction,
} from '../game/engine.ts';
import { AI_OPPONENTS, getLegendDef, getXpToNextLevel } from '../game/legends.ts';
import {
  isAudioMuted,
  playSfx,
  playSkillSfxForLegend,
  subscribeMute,
  toggleAudioMuted,
} from '../game/sound.ts';
import type {
  BattleMode,
  BattleTeam,
  GemCell,
  GridPos,
  OnlineRoomSnapshot,
  PlayerProfile,
  SwapResolution,
} from '../game/types.ts';
import { GemIcon } from './GemIcon.tsx';
import { LegendSprite } from './LegendSprite.tsx';
import { SPINE_SKILL_CODE, SpineCanvas } from './SpineCanvas.tsx';

import type { ApkModalKind } from './ApkModals.tsx';

interface BattleArenaProps {
  profile: PlayerProfile;
  initialPresetIndex: number | null;
  onConsumePreset: () => void;
  onBattleComplete: (won: boolean, presetIndex: number | null) => void;
  onOpenWheel: () => void;
  onOpenModal?: (kind: ApkModalKind) => void;
  onOpenCollection?: () => void;
  onBattleActiveChange?: (active: boolean) => void;
}

interface ClearVfxItem {
  id: number;
  kind: 'boom' | 'lightning';
  vfxColor: string;
  row: number;
  col: number;
}

interface DmgPopupItem {
  id: number;
  side: 0 | 1;
  amount: number;
  kind: 'dmg' | 'heal';
}

interface ActiveMatch {
  mode: BattleMode;
  presetIndex: number | null;
  board: GemCell[][];
  teams: [BattleTeam, BattleTeam];
  turn: 0 | 1;
  round: number;
  movesLeft: number;
  winner: 0 | 1 | null;
  busy: boolean;
  callout: string;
  attackingSide: 0 | 1 | null;
  flashingCells: Set<string>;
  extraMoveBanner: boolean;
  scorePopup: { side: 0 | 1; amount: number } | null;
  clearVfx?: ClearVfxItem[];
  fallingIds?: Set<number>;
  dmgPopups?: DmgPopupItem[];
  flyingOrbs?: number;
}

const GEM_TO_VFX_COLOR: Record<string, string> = {
  azure: 'blue',
  jade: 'green',
  amber: 'orange',
  rose: 'purple',
  violet: 'red',
  gold: 'yellow',
};

function getMovedOrNewIds(prevBoard: GemCell[][], nextBoard: GemCell[][]): Set<number> {
  const prevPos = new Map<number, number>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      prevPos.set(prevBoard[r][c].id, r * COLS + c);
    }
  }
  const changed = new Set<number>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = nextBoard[r][c].id;
      const oldIdx = prevPos.get(id);
      if (oldIdx === undefined || oldIdx !== r * COLS + c) {
        changed.add(id);
      }
    }
  }
  return changed;
}

const DEFAULT_WS_URL = 'ws://localhost:8787';
const TURN_SECONDS = 20;
const QUICK_EMOTES = ['Nice!', 'Good!', 'WOW!', 'GG!'] as const;

function buildPlayerSquad(profile: PlayerProfile): Array<{ id: string; level: number }> {
  const squad = profile.lineup
    .filter((id): id is string => Boolean(id && profile.owned[id]))
    .map((id) => ({ id, level: profile.owned[id].level }));
  return squad.length > 0 ? squad : [{ id: 'solfox', level: 1 }];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getCalloutSprite(stepIndex: number): string {
  if (stepIndex >= 4) return './assets/ui/callout-unbelievable.png';
  if (stepIndex === 3) return './assets/ui/callout-perfect.png';
  if (stepIndex === 2) return './assets/ui/callout-amazing.png';
  if (stepIndex === 1) return './assets/ui/callout-cool.png';
  return './assets/ui/callout-nice.png';
}

function PawMoveIcon({ active }: { active: boolean; side: 'left' | 'right' }) {
  const src = active ? './assets/ui/battle/img_step01.png' : './assets/ui/battle/img_step02.png';
  return (
    <img
      src={src}
      width={18}
      height={18}
      alt=""
      draggable={false}
      className={`paw-pip-img ${active ? 'active' : 'spent'}`}
    />
  );
}

const ROLE_ICON = {
  Active: './assets/ui/skill-active.png',
  Limited: './assets/ui/skill-limited.png',
  Passive: './assets/ui/skill-passive.png',
} as const;

export function BattleArena({
  profile,
  initialPresetIndex,
  onConsumePreset,
  onBattleComplete,
  onOpenWheel,
  onOpenModal,
  onOpenCollection,
  onBattleActiveChange,
}: BattleArenaProps) {
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridPos | null>(null);
  const [targetingSkillIndex, setTargetingSkillIndex] = useState<number | null>(null);
  const [calloutStep, setCalloutStep] = useState(0);
  const [invalidShake, setInvalidShake] = useState(false);
  const [muted, setMuted] = useState(isAudioMuted);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [turnTimer, setTurnTimer] = useState<{ key: string; left: number }>({
    key: 'none',
    left: TURN_SECONDS,
  });
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [showEmotes, setShowEmotes] = useState(false);
  const [emoteBubble, setEmoteBubble] = useState<{ side: 0 | 1; text: string } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [selectedOppIndex, setSelectedOppIndex] = useState(0);
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [skillCutIn, setSkillCutIn] = useState<{ legendId: string; side: 0 | 1 } | null>(null);
  const vfxIdRef = useRef(1);

  // Online room lobby state
  const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);
  const [roomInput, setRoomInput] = useState('');
  const [onlineStatus, setOnlineStatus] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState('');
  const [onlineSide, setOnlineSide] = useState<0 | 1>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const swipeOriginRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  busyRef.current = Boolean(match?.busy);
  const turnKey = match ? `${match.mode}-${match.round}-${match.turn}-${match.winner}` : 'none';
  const turnSecondsLeft = turnTimer.key === turnKey ? turnTimer.left : TURN_SECONDS;

  useEffect(() => subscribeMute(setMuted), []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, []);

  const isInMatch = Boolean(match);
  useEffect(() => {
    onBattleActiveChange?.(isInMatch);
  }, [isInMatch, onBattleActiveChange]);
  useEffect(() => {
    return () => onBattleActiveChange?.(false);
  }, [onBattleActiveChange]);

  const startOfflineMatch = useCallback(
    (mode: 'ai' | 'local', presetIndex: number | null) => {
      wsRef.current?.close();
      wsRef.current = null;
      setCreatedRoomCode('');
      setOnlineStatus('');
      setRewardClaimed(false);
      setSelectedCell(null);
      setTargetingSkillIndex(null);
      setCalloutStep(0);
      setTurnTimer({ key: `${mode}-1-0-null`, left: TURN_SECONDS });
      setIdleSeconds(0);
      setShowEmotes(false);
      playSfx('ui-match-found');
      window.setTimeout(() => {
        if (mountedRef.current) playSfx('battle-start');
      }, 220);

      const playerSquad = buildPlayerSquad(profile);
      const preset = presetIndex !== null ? AI_OPPONENTS[presetIndex] : AI_OPPONENTS[0];
      const leftTeam = buildBattleTeam(mode === 'local' ? 'Player 1' : 'Your Squad', playerSquad);
      const rightTeam = buildBattleTeam(
        mode === 'local' ? 'Player 2' : preset.name,
        mode === 'local' ? playerSquad : preset.squad,
      );

      setMatch({
        mode,
        presetIndex,
        board: createBoard(),
        teams: [leftTeam, rightTeam],
        turn: 0,
        round: 1,
        movesLeft: MOVES_PER_TURN,
        winner: null,
        busy: false,
        callout: 'Round 1/4 · 2 Moves per turn!',
        attackingSide: null,
        flashingCells: new Set<string>(),
        extraMoveBanner: false,
        scorePopup: null,
      });
    },
    [profile],
  );

  // Auto-launch if triggered from Tournament tab
  useEffect(() => {
    if (initialPresetIndex !== null) {
      startOfflineMatch('ai', initialPresetIndex);
      onConsumePreset();
    }
  }, [initialPresetIndex, onConsumePreset, startOfflineMatch]);

  const controlledSide: 0 | 1 = match
    ? match.mode === 'online'
      ? onlineSide
      : match.mode === 'local'
        ? match.turn
        : 0
    : 0;

  // Grant progression rewards & play win/loss fanfare once when a match concludes
  useEffect(() => {
    if (!match || match.winner === null || rewardClaimed) return;
    playSfx(match.winner === controlledSide ? 'battle-win' : 'battle-lose');
    if (match.mode === 'ai') {
      setRewardClaimed(true);
      onBattleComplete(match.winner === 0, match.presetIndex);
    }
  }, [controlledSide, match, onBattleComplete, rewardClaimed]);

  const animateResolutionAndAdvance = useCallback(
    async (
      current: ActiveMatch,
      a: GridPos,
      b: GridPos,
      res: SwapResolution,
    ) => {
      const attackerIdx = current.turn;
      const defenderIdx: 0 | 1 = attackerIdx === 0 ? 1 : 0;

      setMatch((prev) => (prev ? { ...prev, busy: true } : prev));
      setSelectedCell(null);
      setTargetingSkillIndex(null);
      playSfx('tile-move');

      let prevBoardSnapshot = current.board;
      for (let i = 0; i < res.steps.length; i++) {
        if (!mountedRef.current) return;
        const step = res.steps[i];
        const flashSet = new Set(step.cleared.map((p) => `${p.row},${p.col}`));
        const labels = ['Nice!', 'Cool!', 'Amazing!', 'Perfect!', 'Unbelievable!'];
        const label = labels[Math.min(i, labels.length - 1)];
        const isLine = step.specialEvents?.includes('line') || step.specialEvents?.includes('combo');
        const isBoom =
          step.specialEvents?.includes('bomb') ||
          step.specialEvents?.includes('nova') ||
          step.cleared.length >= 4;
        const stepVfx: ClearVfxItem[] = [];
        if (step.cleared.length > 0 && (isLine || isBoom)) {
          const anchor = step.cleared[Math.floor(step.cleared.length / 2)];
          const dominantColor =
            Object.entries(step.colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'azure';
          const vfxColor = GEM_TO_VFX_COLOR[dominantColor] ?? 'blue';
          stepVfx.push({
            id: vfxIdRef.current++,
            kind: isLine && !step.specialEvents?.includes('nova') ? 'lightning' : 'boom',
            vfxColor,
            row: anchor.row,
            col: anchor.col,
          });
        }

        setCalloutStep(i);
        playSfx(i === 0 ? 'tile-clear-1' : i === 1 ? 'tile-clear-2' : 'tile-clear-3');
        if (step.specialEvents?.includes('combo') || step.specialEvents?.includes('nova')) {
          playSfx('tile-bolt');
        } else if (step.specialEvents?.includes('bomb')) {
          playSfx('tile-bomb');
        } else if (step.specialEvents?.includes('line')) {
          playSfx('tile-hv');
        }
        if (i === 1) playSfx('star-1');
        else if (i === 2) playSfx('star-2');
        else if (i >= 3) {
          playSfx('star-3');
          playSfx('cheer');
        }
        if (step.colorCounts.azure > 0) {
          playSfx('orb-fly');
        }

        setMatch((prev) =>
          prev
            ? {
                ...prev,
                flashingCells: flashSet,
                callout: label,
                attackingSide: attackerIdx,
                clearVfx: stepVfx,
                flyingOrbs: step.colorCounts.azure > 0 ? Math.min(4, step.colorCounts.azure) : 0,
              }
            : prev,
        );
        await sleep(220);
        if (!mountedRef.current) return;

        const fallingIds = getMovedOrNewIds(prevBoardSnapshot, step.boardAfter);
        prevBoardSnapshot = step.boardAfter;

        setMatch((prev) =>
          prev
            ? {
                ...prev,
                board: step.boardAfter,
                flashingCells: new Set<string>(),
                clearVfx: [],
                fallingIds,
              }
            : prev,
        );
        await sleep(165);
      }

      if (!mountedRef.current) return;

      setMatch((prev) => {
        if (!prev) return prev;
        const nextTeams: [BattleTeam, BattleTeam] = [
          cloneTeam(prev.teams[0]),
          cloneTeam(prev.teams[1]),
        ];
        const impact = applyMatchImpact(nextTeams[attackerIdx], nextTeams[defenderIdx], res);
        const next = advanceTurnState(
          prev.turn,
          prev.round,
          prev.movesLeft,
          nextTeams,
          'swap',
          res.extraTurn,
        );
        if (impact.energyGain > 0) playSfx('mana-gain');
        if (impact.scoreGained > 0) playSfx('score-gain');
        if (res.extraTurn) playSfx('extra-move');
        else if (next.turnChanged) playSfx(next.turn === 1 ? 'enemy-turn' : 'turn-switch');

        const popups: DmgPopupItem[] = [];
        if (impact.damageDealt > 0) {
          popups.push({
            id: vfxIdRef.current++,
            side: defenderIdx,
            amount: impact.damageDealt,
            kind: 'dmg',
          });
        }
        if (impact.healAmount > 0) {
          popups.push({
            id: vfxIdRef.current++,
            side: attackerIdx,
            amount: impact.healAmount,
            kind: 'heal',
          });
        }

        const burnNote =
          next.burnDamage > 0 ? ` • ${nextTeams[next.turn].name} burned -${next.burnDamage}` : '';
        const extraTag = res.extraTurn ? ' • Extra Move!' : '';
        const shuffleTag = res.reshuffled ? ' • Reshuffled!' : '';

        void a;
        void b;

        return {
          ...prev,
          board: res.finalBoard,
          teams: nextTeams,
          turn: next.turn,
          round: next.round,
          movesLeft: next.movesLeft,
          winner: next.winner,
          busy: false,
          attackingSide: null,
          flashingCells: new Set<string>(),
          clearVfx: [],
          fallingIds: undefined,
          flyingOrbs: 0,
          dmgPopups: popups,
          extraMoveBanner: res.extraTurn,
          scorePopup:
            impact.scoreGained > 0 ? { side: attackerIdx, amount: impact.scoreGained } : null,
          callout: `+${impact.scoreGained} pts${impact.energyGain > 0 ? ` • +${impact.energyGain}⚡` : ''}${extraTag}${burnNote}${shuffleTag}`,
        };
      });
      window.setTimeout(() => {
        if (mountedRef.current) {
          setMatch((prev) =>
            prev ? { ...prev, extraMoveBanner: false, scorePopup: null, dmgPopups: [] } : prev,
          );
        }
      }, 1150);
    },
    [],
  );

  const handleSwap = useCallback(
    (a: GridPos, b: GridPos) => {
      if (!match || match.busy || match.winner !== null) return;

      if (match.mode === 'online') {
        if (match.turn !== onlineSide) return;
        wsRef.current?.send(JSON.stringify({ type: 'swap', a, b }));
        setSelectedCell(null);
        return;
      }

      if (match.mode === 'ai' && match.turn !== 0) return;

      const res = applySwap(match.board, a, b);
      if (!res.valid) {
        playSfx('ui-close');
        setInvalidShake(true);
        window.setTimeout(() => {
          if (mountedRef.current) setInvalidShake(false);
        }, 320);
        setMatch((prev) => (prev ? { ...prev, callout: 'No match! Try adjacent swap' } : prev));
        setSelectedCell(null);
        return;
      }
      void animateResolutionAndAdvance(match, a, b, res);
    },
    [animateResolutionAndAdvance, match, onlineSide],
  );

  const handleCastSkill = useCallback(
    (side: 0 | 1, legendIndex: number, target?: GridPos) => {
      if (!match || match.busy || match.winner !== null) return;
      if (match.turn !== side) return;

      if (match.mode === 'online') {
        if (side !== onlineSide) return;
        playSkillSfxForLegend(match.teams[side].legends[legendIndex]?.id ?? 'solfox');
        wsRef.current?.send(JSON.stringify({ type: 'cast_skill', legendIndex }));
        setTargetingSkillIndex(null);
        return;
      }

      if (match.mode === 'ai' && side !== 0) return;

      const legendId = match.teams[side].legends[legendIndex]?.id ?? 'solfox';
      const def = getLegendDef(legendId);
      if (def.targetTile && !target) {
        playSfx('ui-popup');
        setTargetingSkillIndex((cur) => (cur === legendIndex ? null : legendIndex));
        setMatch((prev) =>
          prev ? { ...prev, callout: `Tap any gem to target ${def.skillName}!` } : prev,
        );
        return;
      }

      const nextTeams: [BattleTeam, BattleTeam] = [
        cloneTeam(match.teams[0]),
        cloneTeam(match.teams[1]),
      ];
      const defenderIdx: 0 | 1 = side === 0 ? 1 : 0;
      const cast = castLegendSkill(
        nextTeams[side],
        nextTeams[defenderIdx],
        legendIndex,
        match.board,
        Math.random,
        target,
      );
      if (!cast) return;

      setTargetingSkillIndex(null);
      playSkillSfxForLegend(legendId);
      if (cast.extraTurn) playSfx('extra-move');
      if (SPINE_SKILL_CODE[legendId]) {
        setSkillCutIn({ legendId, side });
      }

      const next = advanceTurnState(
        match.turn,
        match.round,
        match.movesLeft,
        nextTeams,
        'skill',
        cast.extraTurn,
      );

      const skillPopups: DmgPopupItem[] = [];
      if (cast.damage > 0) {
        skillPopups.push({ id: vfxIdRef.current++, side: defenderIdx, amount: cast.damage, kind: 'dmg' });
      }
      if (cast.heal > 0) {
        skillPopups.push({ id: vfxIdRef.current++, side, amount: cast.heal, kind: 'heal' });
      }

      setMatch((prev) =>
        prev
          ? {
              ...prev,
              board: cast.board,
              teams: nextTeams,
              turn: next.turn,
              round: next.round,
              movesLeft: next.movesLeft,
              winner: next.winner,
              attackingSide: side,
              dmgPopups: skillPopups,
              extraMoveBanner: cast.extraTurn,
              scorePopup: { side, amount: cast.scoreGained },
              callout: cast.summary,
            }
          : prev,
      );
      window.setTimeout(() => {
        if (mountedRef.current) {
          setSkillCutIn(null);
          setMatch((prev) =>
            prev
              ? { ...prev, attackingSide: null, extraMoveBanner: false, scorePopup: null, dmgPopups: [] }
              : prev,
          );
        }
      }, 1050);
    },
    [match, onlineSide],
  );

  // Countdown Fuse Timer (20s/turn) & 5s Idle Hint Pulse keyed by turnKey to avoid stale timeout cascades
  useEffect(() => {
    setTurnTimer({ key: turnKey, left: TURN_SECONDS });
    setIdleSeconds(0);
    if (turnKey === 'none') return;
    const id = window.setInterval(() => {
      if (!mountedRef.current || busyRef.current) return;
      setIdleSeconds((s) => s + 1);
      setTurnTimer((prev) =>
        prev.key === turnKey ? { key: turnKey, left: Math.max(0, prev.left - 1) } : prev,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [turnKey]);

  useEffect(() => {
    setIdleSeconds(0);
  }, [match?.movesLeft, selectedCell]);

  useEffect(() => {
    if (!match || match.mode === 'online' || match.busy || match.winner !== null) return;
    if (turnTimer.key !== turnKey || turnTimer.left > 0) return;
    setMatch((prev) => {
      if (!prev || prev.busy || prev.winner !== null) return prev;
      const nextTeams: [BattleTeam, BattleTeam] = [
        cloneTeam(prev.teams[0]),
        cloneTeam(prev.teams[1]),
      ];
      const next = advanceTurnState(prev.turn, prev.round, 1, nextTeams, 'swap', false);
      return {
        ...prev,
        teams: nextTeams,
        turn: next.turn,
        round: next.round,
        movesLeft: next.movesLeft,
        winner: next.winner,
        extraMoveBanner: false,
        callout: `Time up! ${nextTeams[next.turn].name}'s turn`,
      };
    });
  }, [match, turnKey, turnTimer]);

  // AI Turn Runner
  useEffect(() => {
    if (!match || match.mode !== 'ai' || match.turn !== 1 || match.busy || match.winner !== null) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!mountedRef.current) return;
      const action = pickBestAiAction(match.board, match.teams[1]);
      if (action.type === 'skill') {
        const nextTeams: [BattleTeam, BattleTeam] = [
          cloneTeam(match.teams[0]),
          cloneTeam(match.teams[1]),
        ];
        const cast = castLegendSkill(nextTeams[1], nextTeams[0], action.legendIndex, match.board);
        if (cast) {
          playSkillSfxForLegend(nextTeams[1].legends[action.legendIndex]?.id ?? 'emberdrake');
          const next = advanceTurnState(
            1,
            match.round,
            match.movesLeft,
            nextTeams,
            'skill',
            cast.extraTurn,
          );
          setMatch((prev) =>
            prev
              ? {
                  ...prev,
                  board: cast.board,
                  teams: nextTeams,
                  turn: next.turn,
                  round: next.round,
                  movesLeft: next.movesLeft,
                  winner: next.winner,
                  extraMoveBanner: cast.extraTurn,
                  scorePopup: { side: 1, amount: cast.scoreGained },
                  callout: cast.summary,
                }
              : prev,
          );
          return;
        }
      }

      if (action.type === 'swap') {
        const res = applySwap(match.board, action.a, action.b);
        if (res.valid) {
          void animateResolutionAndAdvance(match, action.a, action.b, res);
        }
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [animateResolutionAndAdvance, match]);

  const connectOnline = (action: 'create' | 'join') => {
    wsRef.current?.close();
    setOnlineStatus('Connecting...');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const squad = buildPlayerSquad(profile);
      if (action === 'create') {
        ws.send(JSON.stringify({ type: 'create_room', name: 'Host', squad }));
      } else {
        ws.send(
          JSON.stringify({
            type: 'join_room',
            roomCode: roomInput.trim().toUpperCase(),
            name: 'Challenger',
            squad,
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(String(event.data)) as {
        type: string;
        roomCode?: string;
        message?: string;
        snapshot?: OnlineRoomSnapshot;
      };
      if (data.type === 'room_created' && data.roomCode) {
        setCreatedRoomCode(data.roomCode);
        setOnlineStatus(`Room ${data.roomCode} ready. Share code with friend!`);
      } else if (data.type === 'error' && data.message) {
        setOnlineStatus(data.message);
      } else if (data.type === 'snapshot' && data.snapshot) {
        const snap = data.snapshot;
        setOnlineSide(snap.side);
        setCreatedRoomCode('');
        setOnlineStatus('');
        setMatch({
          mode: 'online',
          presetIndex: null,
          board: snap.board,
          teams: snap.teams,
          turn: snap.turn,
          round: snap.round ?? 1,
          movesLeft: snap.movesLeft ?? MOVES_PER_TURN,
          winner: snap.winner,
          busy: false,
          callout: snap.lastEvent,
          attackingSide: null,
          flashingCells: new Set<string>(),
          extraMoveBanner: false,
          scorePopup: null,
        });
      }
    };

    ws.onerror = () => {
      setOnlineStatus('Could not reach PvP server. Run "npm run server" first.');
    };
  };

  const canControl = Boolean(
    match && !match.busy && match.winner === null && match.turn === controlledSide,
  );
  const hintPair = useMemo(() => {
    if (!match || !canControl || idleSeconds < 5) return null;
    return findAllValidSwaps(match.board)[0] ?? null;
  }, [match, canControl, idleSeconds]);

  if (!match) {
    const leadId =
      profile.lineup.find((id): id is string => Boolean(id && profile.owned[id])) ?? 'solfox';
    const supportIds = profile.lineup
      .filter((id): id is string => Boolean(id && id !== leadId && profile.owned[id]))
      .slice(0, 2);
    const ladderGoal = Math.max(500, Math.ceil((profile.trophies + 1) / 200) * 200);
    const ladderPct = Math.min(100, Math.round((profile.trophies / ladderGoal) * 100));
    const streak = profile.winStreak ?? 3;

    return (
      <section className="screen match-lobby apk-match-lobby">
        {/* Banner Đặc quyền + Hoạt động giống ảnh sảnh APK */}
        <div className="apk-event-banners-row">
          <button
            type="button"
            className="apk-banner-privilege"
            onClick={() => {
              playSfx('ui-popup');
              onOpenModal?.('privilege');
            }}
          >
            <span className="apk-priv-pill">Đặc quyền</span>
            <span className="apk-priv-lv">♥ 80</span>
            <span className="apk-priv-days">999 ngày</span>
          </button>

          <button
            type="button"
            className="apk-banner-activity"
            onClick={() => {
              playSfx('ui-popup');
              onOpenModal?.('activity');
            }}
          >
            <strong>Hoạt</strong>
            <span className="apk-red-dot" />
          </button>
        </div>

        {/* Thanh Thế giới ticker */}
        <button
          type="button"
          className="lobby-top-bar world-btn"
          onClick={() => {
            playSfx('ui-popup');
            onOpenModal?.('social');
          }}
        >
          <span className="world-badge">Thế giới</span>
          <span className="world-ticker-text">Bot_Master: Server test offline sẵn sàng!</span>
        </button>

        {/* 2 Cột icon Trái/Phải + Bệ đá Hoa Sen giữa */}
        <div className="lobby-stage-grid">
          <div className="lobby-side-rail left">
            <button
              type="button"
              className="rail-icon-btn"
              onClick={() => {
                playSfx('ui-popup');
                onOpenModal?.('social');
              }}
            >
              <img src="./assets/ui/fight/icon_friend01.png" width={36} height={36} alt="" draggable={false} />
              <span>Giao lưu</span>
              <b className="rail-count-badge">1</b>
            </button>
            <button
              type="button"
              className="rail-icon-btn wheel"
              onClick={onOpenWheel}
            >
              <img src="./assets/ui/fight/icon_DailyTurntable01.png" width={36} height={36} alt="" draggable={false} />
              <span>Quay thưởng</span>
            </button>
            <button
              type="button"
              className="rail-icon-btn"
              onClick={() => {
                playSfx('ui-popup');
                onOpenModal?.('rank');
              }}
            >
              <img src="./assets/ui/fight/icon_rank01.png" width={36} height={36} alt="" draggable={false} />
              <span>BXH</span>
            </button>
            <button
              type="button"
              className="rail-icon-btn friend-duel"
              onClick={() => {
                playSfx('ui-popup');
                setFriendModalOpen(true);
              }}
            >
              <img src="./assets/ui/fight/icon_fightWithFriend01.png" width={34} height={34} alt="" draggable={false} />
              <span>2P / Phòng</span>
            </button>
          </div>

          <div className="lotus-sanctuary-card apk-shrine-stage">
            <div className="lotus-pedestal">
              <img
                src="./assets/ui/summon-portal.png"
                alt=""
                draggable={false}
                className="portal-pedestal-img"
              />
              <div className="sanctuary-heroes">
                {supportIds[0] && (
                  <LegendSprite legendId={supportIds[0]} size={64} />
                )}
                <LegendSprite legendId={leadId} size={96} className="lead" />
                {supportIds[1] && (
                  <LegendSprite legendId={supportIds[1]} size={64} flipped />
                )}
              </div>
            </div>

            <div className="opp-tier-row">
              {AI_OPPONENTS.map((opp, idx) => (
                <button
                  key={opp.name}
                  type="button"
                  className={`tier-pill ${selectedOppIndex === idx ? 'active' : ''}`}
                  onClick={() => {
                    playSfx('ui-click');
                    setSelectedOppIndex(idx);
                  }}
                >
                  {opp.title}
                </button>
              ))}
            </div>
          </div>

          <div className="lobby-side-rail right">
            <button
              type="button"
              className="rail-icon-btn"
              onClick={() => {
                playSfx('ui-popup');
                onOpenModal?.('summon');
              }}
            >
              <img src="./assets/ui/fight/icon_summon01.png" width={38} height={38} alt="" draggable={false} />
              <span>Triệu hồi</span>
            </button>
            <button
              type="button"
              className="rail-icon-btn"
              onClick={() => {
                playSfx('ui-popup');
                onOpenModal?.('treasure');
              }}
            >
              <img src="./assets/ui/fight/icon_lucky01.png" width={36} height={36} alt="" draggable={false} />
              <span>Bí Cảnh</span>
            </button>
            <button
              type="button"
              className="rail-icon-btn"
              onClick={() => {
                playSfx('ui-popup');
                onOpenModal?.('newcomer');
              }}
            >
              <img src="./assets/ui/fight/icon_newcomergift01.png" width={36} height={36} alt="" draggable={false} />
              <span>Gói Tân Thủ</span>
            </button>
            <button
              type="button"
              className="rail-icon-btn"
              onClick={() => {
                playSfx('ui-click');
                onOpenCollection?.();
              }}
            >
              <img src="./assets/ui/fight/icon_album.png" width={34} height={34} alt="" draggable={false} />
              <span>Bộ sưu tập</span>
            </button>
          </div>
        </div>

        {/* Thanh Cúp + Nút Vàng "Bắt đầu ghép" + Thanh Liên Thắng */}
        <div className="lobby-bottom-deck">
          <div className="apk-ladder-bar">
            <img src="./assets/ui/cup.png" width={24} height={24} alt="" draggable={false} className="apk-cup-badge" />
            <div className="apk-cup-track">
              <img src="./assets/ui/fight/bar_cupbg01.png" alt="" draggable={false} className="cup-track-bg" />
              <div className="cup-track-fill-wrap" style={{ width: `${Math.max(12, ladderPct)}%` }}>
                <img src="./assets/ui/fight/bar_cup01.png" alt="" draggable={false} className="cup-track-fill" />
              </div>
              <span className="cup-track-text">{profile.trophies} / {ladderGoal}</span>
            </div>
          </div>

          <button
            type="button"
            className="apk-gold-match-btn"
            onClick={() => startOfflineMatch('ai', selectedOppIndex)}
          >
            Bắt đầu ghép
          </button>

          <div className="apk-streak-pill">
            <img src="./assets/ui/item/fire.png" width={18} height={18} alt="" draggable={false} />
            <span>{streak} liên thắng</span>
          </div>
        </div>

        {/* APK Friend / 2P & Online Room Modal */}
        {friendModalOpen && (
          <div className="modal-backdrop" onClick={() => setFriendModalOpen(false)}>
            <div className="modal-card wood-modal" onClick={(e) => e.stopPropagation()}>
              <div className="wood-modal-head">
                <h3>Fight with Friend</h3>
                <button
                  type="button"
                  className="modal-close-x"
                  onClick={() => {
                    playSfx('ui-close');
                    setFriendModalOpen(false);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="friend-mode-box">
                <h4>Local 2P Pass &amp; Play</h4>
                <p>Two players battle turn-by-turn on the same screen.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setFriendModalOpen(false);
                    startOfflineMatch('local', null);
                  }}
                >
                  Start Local 2P Duel
                </button>
              </div>
              <div className="friend-mode-box">
                <h4>Online Room PvP (WebSocket)</h4>
                <input
                  type="text"
                  className="ws-input"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  placeholder="ws://localhost:8787"
                />
                <div className="online-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => connectOnline('create')}
                  >
                    Create Room
                  </button>
                  <input
                    type="text"
                    className="code-input"
                    maxLength={6}
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                    placeholder="CODE"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={roomInput.trim().length < 4}
                    onClick={() => connectOnline('join')}
                  >
                    Join
                  </button>
                </div>
                {createdRoomCode && (
                  <div className="room-code-box">Room Code: {createdRoomCode}</div>
                )}
                {onlineStatus && <p className="online-status">{onlineStatus}</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  const leftTeam = match.teams[0];
  const rightTeam = match.teams[1];
  const activeTeam = match.teams[controlledSide];
  const fusePct = Math.max(0, Math.round((turnSecondsLeft / TURN_SECONDS) * 100));
  const xpNext = getXpToNextLevel(profile.playerLevel);

  return (
    <section className="screen battle-screen">
      {/* Top Forest Combat Stage over full-bleed battle-full.jpg (APK Screenshots 1 & 8) */}
      <div className="arena-stage">
        <div className="hud-wings">
          <div className={`wing-ribbon left ${match.turn === 0 ? 'active-turn' : ''}`}>
            <div className="wing-avatar">
              <LegendSprite legendId={leftTeam.legends[0]?.id ?? 'solfox'} variant="head" size={28} />
            </div>
            <div className="wing-stats">
              <div className="wing-top-line">
                <span className="wing-name">{leftTeam.name}</span>
                <strong className="wing-score">{leftTeam.score}</strong>
              </div>
              <div className="hp-track">
                <div
                  className="hp-fill player"
                  style={{ width: `${Math.max(0, (leftTeam.hp / leftTeam.maxHp) * 100)}%` }}
                />
              </div>
              <span className="wing-hp-text">
                ♥ {leftTeam.hp}/{leftTeam.maxHp}
                {leftTeam.shield > 0 ? ` 🛡${leftTeam.shield}` : ''}
              </span>
            </div>
            {match.scorePopup?.side === 0 && (
              <span className="score-float-pop">+{match.scorePopup.amount}</span>
            )}
          </div>

          <div className="round-star-center">
            <div className="round-star-badge" title={`Round ${match.round} of ${MAX_BATTLE_ROUNDS}`}>
              <img src="./assets/ui/round-star.png" width={36} height={36} alt="" draggable={false} />
              <strong>
                {match.round}/{MAX_BATTLE_ROUNDS}
              </strong>
            </div>
            <button
              type="button"
              className="btn-exit"
              onClick={() => {
                wsRef.current?.close();
                setMatch(null);
              }}
            >
              Exit
            </button>
          </div>

          <div className={`wing-ribbon right ${match.turn === 1 ? 'active-turn' : ''}`}>
            {match.scorePopup?.side === 1 && (
              <span className="score-float-pop">+{match.scorePopup.amount}</span>
            )}
            <div className="wing-stats">
              <div className="wing-top-line">
                <strong className="wing-score">{rightTeam.score}</strong>
                <span className="wing-name">{rightTeam.name}</span>
              </div>
              <div className="hp-track">
                <div
                  className="hp-fill enemy"
                  style={{ width: `${Math.max(0, (rightTeam.hp / rightTeam.maxHp) * 100)}%` }}
                />
              </div>
              <span className="wing-hp-text">
                {rightTeam.hp}/{rightTeam.maxHp} ♥
                {rightTeam.shield > 0 ? ` 🛡${rightTeam.shield}` : ''}
              </span>
            </div>
            <div className="wing-avatar">
              <LegendSprite legendId={rightTeam.legends[0]?.id ?? 'frostkit'} variant="head" size={28} flipped />
            </div>
          </div>
        </div>

        <div className="arena-fighters">
          <div className={`squad-cluster left ${match.attackingSide === 0 ? 'lunge-right' : ''}`}>
            {emoteBubble?.side === 0 && (
              <div className="fighter-emote-bubble">{emoteBubble.text}</div>
            )}
            {match.dmgPopups?.filter((p) => p.side === 0).map((p) => (
              <span key={p.id} className={`fighter-dmg-pop ${p.kind}`}>
                {p.kind === 'dmg' ? `-${p.amount}` : `+${p.amount}`}
              </span>
            ))}
            {leftTeam.legends.slice(0, 5).map((l, idx) => {
              const anim =
                match.winner !== null
                  ? match.winner === 0
                    ? 'win'
                    : 'lost'
                  : match.attackingSide === 0 && idx === 0
                    ? 'run'
                    : 'stand';
              return (
                <LegendSprite
                  key={`${l.id}-${idx}`}
                  legendId={l.id}
                  size={idx === 0 ? 74 : 52}
                  animation={anim}
                  shielded={leftTeam.shield > 0 && idx === 0}
                />
              );
            })}
          </div>

          {match.attackingSide !== null && (
            <div
              className={`combat-bolts ${match.attackingSide === 0 ? 'fly-right' : 'fly-left'}`}
              aria-hidden="true"
            >
              <span className="fx-bolt primary" />
              <span className="fx-bolt secondary" />
            </div>
          )}

          {skillCutIn && SPINE_SKILL_CODE[skillCutIn.legendId] && (
            <div className={`skill-spine-cutin side-${skillCutIn.side}`} aria-hidden="true">
              <SpineCanvas
                basePath={`./assets/spine/skills/${skillCutIn.legendId}/${SPINE_SKILL_CODE[skillCutIn.legendId]}`}
                animation="skill"
                loop={false}
                flipped={skillCutIn.side === 1}
                size={180}
              />
            </div>
          )}

          <div className={`squad-cluster right ${match.attackingSide === 1 ? 'lunge-left' : ''}`}>
            {emoteBubble?.side === 1 && (
              <div className="fighter-emote-bubble">{emoteBubble.text}</div>
            )}
            {match.dmgPopups?.filter((p) => p.side === 1).map((p) => (
              <span key={p.id} className={`fighter-dmg-pop ${p.kind}`}>
                {p.kind === 'dmg' ? `-${p.amount}` : `+${p.amount}`}
              </span>
            ))}
            {rightTeam.legends.slice(0, 5).map((l, idx) => {
              const anim =
                match.winner !== null
                  ? match.winner === 1
                    ? 'win'
                    : 'lost'
                  : match.attackingSide === 1 && idx === 0
                    ? 'run'
                    : 'stand';
              return (
                <LegendSprite
                  key={`${l.id}-${idx}`}
                  legendId={l.id}
                  size={idx === 0 ? 74 : 52}
                  flipped
                  animation={anim}
                  shielded={rightTeam.shield > 0 && idx === 0}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Grass Seam HUD Bar matching APK Battle HUD */}
      <div className="grass-seam-hud">
        <div className="seam-butterfly-badge" title={`${profile.xp}/${xpNext}`}>
          <img src="./assets/ui/butterfly-ring.png" width={36} height={36} alt="" draggable={false} />
          <span className="level-num">{profile.playerLevel}</span>
          <small className="seam-xp">{profile.xp}/{xpNext}</small>
        </div>

        <div className="seam-turn-core">
          <div className="seam-tools-row">
            <button
              type="button"
              className="mini-sprite-btn"
              aria-label="Quick Emotes"
              onClick={() => setShowEmotes((v) => !v)}
            >
              <img src="./assets/ui/battle/img_btn_chat.png" width={22} height={20} alt="" draggable={false} />
            </button>
            <button type="button" className="rule-pill-btn apk-rule-btn" onClick={() => setShowRules(true)}>
              Rule
            </button>
            <div className="paw-pips" title="Player Moves Left">
              {[0, 1].map((idx) => (
                <PawMoveIcon key={idx} side="left" active={match.turn === 0 && idx < match.movesLeft} />
              ))}
            </div>
            <span className={`fuse-label apk-time-pill ${match.turn === 0 ? 'p1' : 'p2'}`}>
              {turnSecondsLeft}s
            </span>
            <div className="paw-pips" title="Opponent Moves Left">
              {[0, 1].map((idx) => (
                <PawMoveIcon key={idx} side="right" active={match.turn === 1 && idx < match.movesLeft} />
              ))}
            </div>
            <button
              type="button"
              className="mini-sprite-btn"
              aria-label="Sticker & Elemental Guide"
              onClick={() => setShowStickers(true)}
            >
              <img src="./assets/ui/battle/img_btn_setting.png" width={21} height={21} alt="" draggable={false} />
            </button>
          </div>
          <div className="fuse-track">
            <div
              className={`fuse-fill ${match.turn === 0 ? 'blue' : 'red'}`}
              style={{ width: `${fusePct}%` }}
            >
              <span className="fuse-spark" />
            </div>
          </div>
          <div className="callout-sub-line">{match.callout}</div>
        </div>

        <div className="seam-score-pill" title="Active Score">
          <img src="./assets/ui/power.png" width={17} height={17} alt="" draggable={false} />
          <span>{activeTeam.score}</span>
        </div>

        {showEmotes && (
          <div className="emote-popover">
            {QUICK_EMOTES.map((text) => (
              <button
                key={text}
                type="button"
                className="emote-choice"
                onClick={() => {
                  setEmoteBubble({ side: controlledSide, text });
                  setShowEmotes(false);
                  window.setTimeout(() => {
                    if (mountedRef.current) setEmoteBubble(null);
                  }, 2100);
                }}
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 7x7 Match-3 Board inside authentic moss flower hedge */}
      <div className="board-moss-stage">
        {match.extraMoveBanner && (
          <img
            src="./assets/ui/extra-move.png"
            alt="Extra Move!"
            draggable={false}
            className="extra-move-banner-img"
          />
        )}
        {match.round === MAX_BATTLE_ROUNDS && match.winner === null && (
          <img
            src="./assets/ui/final-round.png"
            alt="Final Round"
            draggable={false}
            className="final-round-pill-img"
          />
        )}
        <div
          className={`puzzle-grid ${targetingSkillIndex !== null ? 'targeting-board' : ''} ${invalidShake ? 'invalid-shake' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {match.board.map((row, r) =>
            row.map((cell, c) => {
              const isSelected = selectedCell?.row === r && selectedCell?.col === c;
              const isFlashing = match.flashingCells.has(`${r},${c}`);
              const isFalling = Boolean(match.fallingIds?.has(cell.id));
              const isHinted =
                hintPair !== null &&
                ((hintPair[0].row === r && hintPair[0].col === c) ||
                  (hintPair[1].row === r && hintPair[1].col === c));
              const checkerAlt = (r + c) % 2 === 1;

              return (
                <button
                  key={`${r}-${c}-${cell.id}`}
                  type="button"
                  disabled={!canControl}
                  className={`gem-tile ${checkerAlt ? 'checker-alt' : ''} ${isSelected ? 'selected' : ''} ${isFlashing ? 'clearing' : ''} ${isFalling ? 'falling' : ''} ${isHinted ? 'hint-pair' : ''}`}
                  onPointerDown={(e) => {
                    if (!canControl || targetingSkillIndex !== null) return;
                    setIdleSeconds(0);
                    playSfx('tile-drag');
                    swipeOriginRef.current = { row: r, col: c, x: e.clientX, y: e.clientY };
                  }}
                  onPointerMove={(e) => {
                    const origin = swipeOriginRef.current;
                    if (!origin || !canControl || targetingSkillIndex !== null) return;
                    const dx = e.clientX - origin.x;
                    const dy = e.clientY - origin.y;
                    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
                    swipeOriginRef.current = null;

                    let targetR = origin.row;
                    let targetC = origin.col;
                    if (Math.abs(dx) > Math.abs(dy)) {
                      targetC += dx > 0 ? 1 : -1;
                    } else {
                      targetR += dy > 0 ? 1 : -1;
                    }
                    if (targetR >= 0 && targetR < ROWS && targetC >= 0 && targetC < COLS) {
                      handleSwap({ row: origin.row, col: origin.col }, { row: targetR, col: targetC });
                    }
                  }}
                  onPointerUp={() => {
                    swipeOriginRef.current = null;
                  }}
                  onClick={() => {
                    if (!canControl) return;
                    setIdleSeconds(0);
                    if (targetingSkillIndex !== null) {
                      handleCastSkill(controlledSide, targetingSkillIndex, { row: r, col: c });
                      return;
                    }
                    if (!selectedCell) {
                      playSfx('tile-drag');
                      setSelectedCell({ row: r, col: c });
                      return;
                    }
                    if (selectedCell.row === r && selectedCell.col === c) {
                      setSelectedCell(null);
                      return;
                    }
                    if (
                      Math.abs(selectedCell.row - r) + Math.abs(selectedCell.col - c) ===
                      1
                    ) {
                      handleSwap(selectedCell, { row: r, col: c });
                    } else {
                      playSfx('tile-drag');
                      setSelectedCell({ row: r, col: c });
                    }
                  }}
                >
                  <GemIcon color={cell.color} special={cell.special} size={42} />
                </button>
              );
            }),
          )}

          {match.clearVfx?.map((vfx) => (
            <img
              key={vfx.id}
              src={`./assets/vfx/img_${vfx.kind}_${vfx.vfxColor}.png`}
              alt=""
              draggable={false}
              className={`board-apk-vfx ${vfx.kind}`}
              style={{
                left: `${((vfx.col + 0.5) / COLS) * 100}%`,
                top: `${((vfx.row + 0.5) / ROWS) * 100}%`,
              }}
            />
          ))}

          {(match.flyingOrbs ?? 0) > 0 && (
            <div className="flying-mana-orbs" aria-hidden="true">
              {Array.from({ length: match.flyingOrbs ?? 0 }, (_, idx) => (
                <img
                  key={idx}
                  src="./assets/ui/orb.png"
                  width={20}
                  height={20}
                  alt=""
                  draggable={false}
                  className="flying-orb-sprite"
                  style={{ animationDelay: `${idx * 45}ms` }}
                />
              ))}
            </div>
          )}

          {match.flashingCells.size > 0 && (
            <div className="good-callout-burst" aria-hidden="true">
              <img
                src={getCalloutSprite(calloutStep)}
                alt={match.callout}
                draggable={false}
                className="callout-plaque-img"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom 9-Orb Energy Pool + Framed Skill Medallions */}
      <div className="energy-battle-dock">
        <div className="energy-orb-strip">
          <div className="orb-side left">
            <span className="orb-count-pill blue">💧 {leftTeam.energy}/{MAX_TEAM_ENERGY}</span>
            <div className="orb-dots">
              {Array.from({ length: MAX_TEAM_ENERGY }, (_, i) => (
                <span key={i} className={`energy-dot blue ${i < leftTeam.energy ? 'filled' : ''}`} />
              ))}
            </div>
          </div>
          <div className="orb-side right">
            <div className="orb-dots">
              {Array.from({ length: MAX_TEAM_ENERGY }, (_, i) => (
                <span key={i} className={`energy-dot red ${i < rightTeam.energy ? 'filled' : ''}`} />
              ))}
            </div>
            <span className="orb-count-pill red">{rightTeam.energy}/{MAX_TEAM_ENERGY} 🔥</span>
          </div>
        </div>

        <div className="skill-dock">
          {activeTeam.legends.map((l, idx) => {
            const def = getLegendDef(l.id);
            const cost = getLegendEnergyCost(l.maxMana);
            const ready = canControl && isLegendSkillReady(activeTeam, idx);
            const energyRatio = def.role === 'Passive' ? l.mana / l.maxMana : Math.max(l.mana / l.maxMana, activeTeam.energy / cost);
            const pct = Math.min(100, Math.round(energyRatio * 100));

            return (
              <button
                key={`${l.id}-${idx}`}
                type="button"
                className={`skill-chip ${ready ? 'ready' : ''} ${targetingSkillIndex === idx ? 'targeting' : ''}`}
                disabled={!ready}
                onClick={() => handleCastSkill(controlledSide, idx)}
                title={`${def.name}: ${def.skillName} (${def.skillDesc})`}
              >
                <div className="skill-medallion-wrap">
                  <LegendSprite legendId={l.id} variant="head" size={32} />
                  <img
                    src={ready ? './assets/ui/headframe-gold.png' : './assets/ui/headframe-bronze.png'}
                    alt=""
                    draggable={false}
                    className="med-ring-img"
                  />
                </div>
                <div className="skill-meta">
                  <span>{def.skillName.split(' ')[0]}</span>
                  <div className="mana-bar">
                    <div className="mana-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="skill-drop-cost">
                  <img src={ROLE_ICON[def.role]} width={18} height={18} alt="" draggable={false} />
                  {def.role !== 'Passive' && <b>{def.role === 'Limited' && l.limitedUsed ? '✓' : cost}</b>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Match Winner Overlay */}
      {match.winner !== null && (
        <div className="modal-backdrop">
          <div className="modal-card victory-modal">
            <img
              src={match.winner === controlledSide ? './assets/ui/victory.png' : './assets/ui/lose.png'}
              alt={match.winner === controlledSide ? 'Victory!' : 'Defeat'}
              draggable={false}
              className="result-banner-img"
            />
            <p>
              {match.teams[match.winner].name} won · Final Score{' '}
              <strong>
                {leftTeam.score} vs {rightTeam.score}
              </strong>{' '}
              (Round {match.round}/{MAX_BATTLE_ROUNDS})
            </p>
            {match.mode === 'ai' && match.winner === 0 && (
              <p className="reward-line">
                Rewards added to your profile (Gold, Mana Orbs, Diamonds &amp; Shards)!
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  wsRef.current?.close();
                  setMatch(null);
                }}
              >
                Back to Match Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Battle Rules Modal */}
      {showRules && (
        <div className="modal-backdrop" onClick={() => setShowRules(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Little Legends: Puzzle PVP Rules</h3>
            <ul className="rules-list">
              <li>Each turn grants <strong>2 Paw Moves</strong> within <strong>20 seconds</strong>.</li>
              <li>Match <strong>4+ gems</strong> or trigger a blast skill for an <strong>Extra Move</strong> &amp; special Mushroom / Pumpkin / Berry gem.</li>
              <li><strong>Blue Hearts</strong> charge your shared <strong>{MAX_TEAM_ENERGY} Energy Orbs</strong> to unleash Active &amp; Limited skills.</li>
              <li>Swap <strong>2 Special gems</strong> together (Rocket+Rocket, Bomb+Bomb, Berry+Special) for massive combos!</li>
              <li>Win by <strong>Knockout (0 HP)</strong> or highest <strong>Score</strong> after <strong>Round 4/4</strong>!</li>
            </ul>
            <button type="button" className="btn-primary" onClick={() => setShowRules(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Element & Gem Stickers Guide Modal */}
      {showStickers && (
        <div className="modal-backdrop" onClick={() => setShowStickers(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Gems &amp; Legend Roles</h3>
            <div className="guide-gem-row">
              {(['azure', 'gold', 'amber', 'jade', 'rose', 'violet'] as const).map((color) => (
                <div key={color} className="guide-gem-cell">
                  <GemIcon color={color} size={30} />
                  <small>{color === 'azure' ? '+Energy' : color === 'rose' ? '+Heal' : 'DMG'}</small>
                </div>
              ))}
            </div>
            <p className="locked-hint">
              🛡 Passive cards grant auras automatically · 💧 Active skills spend Energy Orbs · ⬡ Limited skills cast once per duel!
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toggleAudioMuted()}
              >
                {muted ? '🔇 Unmute Sound' : '🔊 Mute Sound'}
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowStickers(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
