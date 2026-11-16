import { useCallback, useEffect, useState } from 'react';
import { ApkModals, type ApkModalKind } from './components/ApkModals.tsx';
import { BattleArena } from './components/BattleArena.tsx';
import { NavTabIcon } from './components/GameArt.tsx';
import { LegendScreen } from './components/LegendScreen.tsx';
import { SpinWheelModal } from './components/SpinWheelModal.tsx';
import { StoreScreen } from './components/StoreScreen.tsx';
import { TopBar } from './components/TopBar.tsx';
import { IslandScreen, TournamentScreen } from './components/TournamentAndIsland.tsx';
import { AI_OPPONENTS, LEGENDS } from './game/legends.ts';
import { playBgm, playSfx, unlockAudio } from './game/sound.ts';
import {
  advanceTournamentBracket,
  createTournamentBracket,
  grantProfileRewards,
  loadProfile,
  performSummonPack,
  placeOrUpgradeDecor,
  saveProfile,
  setLineupSlot,
  spinRewardWheel,
  upgradeOwnedLegend,
} from './game/storage.ts';
import type { PlayerProfile } from './game/types.ts';

type MainTab = 'store' | 'legend' | 'match' | 'tournament' | 'island';

export function App() {
  const [enteredGame, setEnteredGame] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(15);
  const [loadingPhase, setLoadingPhase] = useState('Checking game version...');
  const [readyToStart, setReadyToStart] = useState(false);
  const [tab, setTab] = useState<MainTab>('match');
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [queuedMatch, setQueuedMatch] = useState<{
    presetIndex: number;
    fromBracket: boolean;
  } | null>(null);
  const [activeBracketBattle, setActiveBracketBattle] = useState(false);
  const [battleActive, setBattleActive] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ApkModalKind>(null);

  useEffect(() => {
    if (enteredGame) return;
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setReadyToStart(true);
          setLoadingPhase('Ready! Tap to Start');
          return 100;
        }
        const step = Math.floor(Math.random() * 14 + 8);
        const next = Math.min(prev + step, 100);
        if (next < 35) {
          setLoadingPhase('Connecting to server...');
        } else if (next < 70) {
          setLoadingPhase('Loading game assets & legends...');
        } else if (next < 95) {
          setLoadingPhase('Configuring PvP Match arena...');
        } else {
          setReadyToStart(true);
          setLoadingPhase('Ready! Tap to Start');
        }
        return next;
      });
    }, 220);
    return () => clearInterval(interval);
  }, [enteredGame]);

  const handleStartGame = useCallback(() => {
    unlockAudio();
    playSfx('ui-click');
    playBgm('lobby');
    setEnteredGame(true);
  }, []);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (!enteredGame) {
      playBgm('lobby');
      return;
    }
    if (battleActive) {
      playBgm('battle');
    } else if (tab === 'match') {
      playBgm('match');
    } else if (tab === 'island') {
      playBgm('island');
    } else {
      playBgm('lobby');
    }
  }, [enteredGame, battleActive, tab]);

  const handleAssignSlot = useCallback((slotIndex: number, legendId: string | null) => {
    playSfx(legendId ? 'ui-equip' : 'ui-close');
    setProfile((prev) => setLineupSlot(prev, slotIndex, legendId));
  }, []);

  const handleUpgradeLegend = useCallback((legendId: string) => {
    setProfile((prev) => {
      const upgraded = upgradeOwnedLegend(prev, legendId);
      if (!upgraded) return prev;
      playSfx('ui-upgrade');
      return upgraded;
    });
  }, []);

  const handleSummon = useCallback(
    (count: 1 | 9, currency: 'gold' | 'diamonds') => {
      const outcome = performSummonPack(profile, count, currency);
      if (!outcome) return null;
      playSfx(outcome.pulls.some((p) => p.isNew) ? 'ui-new-card' : 'ui-summon-open');
      setProfile(outcome.profile);
      return outcome.pulls;
    },
    [profile],
  );

  const handleExchangeOrbs = useCallback(() => {
    setProfile((prev) => {
      if (prev.manaOrbs < 200) return prev;
      playSfx('ui-gold');
      return { ...prev, manaOrbs: prev.manaOrbs - 200, gold: prev.gold + 350 };
    });
  }, []);

  const handleSpinWheel = useCallback(() => {
    const outcome = spinRewardWheel(profile);
    if (!outcome) return null;
    playSfx('ui-wheel-spin');
    setProfile(outcome.profile);
    return { sliceIndex: outcome.sliceIndex, summary: outcome.summary };
  }, [profile]);

  const handleBattleComplete = useCallback(
    (won: boolean, presetIndex: number | null) => {
      const preset = presetIndex !== null ? AI_OPPONENTS[presetIndex] : AI_OPPONENTS[0];
      setProfile((prev) => {
        const nextBracket =
          activeBracketBattle && prev.bracket
            ? advanceTournamentBracket(prev.bracket, won)
            : prev.bracket;

        if (!won) {
          const lossProfile = grantProfileRewards(prev, {
            gold: 50,
            manaOrbs: 40,
            diamonds: 0,
            xp: 45,
            trophies: -8,
          });
          return { ...lossProfile, bracket: nextBracket };
        }

        const rewardLegend = LEGENDS[Math.floor(Math.random() * LEGENDS.length) % LEGENDS.length];
        const nextStage =
          presetIndex !== null && presetIndex + 1 === prev.tournamentStage
            ? Math.min(AI_OPPONENTS.length, prev.tournamentStage + 1)
            : prev.tournamentStage;
        const championBonus = nextBracket?.champion?.isPlayer ? 120 : 0;
        const rewarded = grantProfileRewards(prev, {
          gold: preset.rewardGold + championBonus,
          manaOrbs: preset.rewardOrbs,
          diamonds: preset.rewardDiamonds + (championBonus > 0 ? 40 : 0),
          xp: 120,
          trophies: preset.rewardTrophies,
          shardLegendId: rewardLegend.id,
          shards: 2,
        });
        return {
          ...rewarded,
          tournamentStage: nextStage,
          bracket: nextBracket,
        };
      });
      setActiveBracketBattle(false);
    },
    [activeBracketBattle],
  );

  const handleClaimIsland = useCallback((nodeId: 'shrine' | 'mine' | 'grove') => {
    const now = Date.now();
    setProfile((prev) => {
      const node = prev.islands.find((n) => n.id === nodeId);
      if (!node) return prev;
      const elapsedSec = Math.max(0, Math.floor((now - node.lastClaimAt) / 1000));
      const mult = node.guardianId ? 1.5 : 1;
      const ratePerMin =
        node.id === 'grove'
          ? Math.round(4 * node.level * mult)
          : Math.round(36 * node.level * mult);
      const pending = Math.min(ratePerMin * 20, Math.floor((elapsedSec / 60) * ratePerMin));
      if (pending <= 0) return prev;

      playSfx(node.id === 'grove' ? 'ui-diamond' : 'ui-gold');
      return {
        ...prev,
        manaOrbs: node.id === 'shrine' ? prev.manaOrbs + pending : prev.manaOrbs,
        gold: node.id === 'mine' ? prev.gold + pending : prev.gold,
        diamonds: node.id === 'grove' ? prev.diamonds + pending : prev.diamonds,
        islands: prev.islands.map((n) => (n.id === nodeId ? { ...n, lastClaimAt: now } : n)),
      };
    });
  }, []);

  const handleUpgradeIsland = useCallback((nodeId: 'shrine' | 'mine' | 'grove') => {
    setProfile((prev) => {
      const node = prev.islands.find((n) => n.id === nodeId);
      if (!node) return prev;
      const cost = 260 * node.level;
      if (prev.gold < cost) return prev;
      playSfx('ui-build');
      return {
        ...prev,
        gold: prev.gold - cost,
        islands: prev.islands.map((n) =>
          n.id === nodeId ? { ...n, level: n.level + 1 } : n,
        ),
      };
    });
  }, []);

  const handleAssignGuardian = useCallback(
    (nodeId: 'shrine' | 'mine' | 'grove', legendId: string | null) => {
      setProfile((prev) => ({
        ...prev,
        islands: prev.islands.map((n) =>
          n.id === nodeId ? { ...n, guardianId: legendId } : n,
        ),
      }));
    },
    [],
  );

  const handlePlaceDecor = useCallback((slot: number, decorId: string) => {
    setProfile((prev) => {
      const next = placeOrUpgradeDecor(prev, slot, decorId);
      if (!next) return prev;
      playSfx('ui-build');
      return next;
    });
  }, []);

  if (!enteredGame) {
    return (
      <div className="app-viewport">
        <div
          className="phone-shell splash-screen apk-splash"
          onClick={readyToStart ? handleStartGame : undefined}
          style={{ cursor: readyToStart ? 'pointer' : 'default' }}
        >
          <div className="splash-logo-wrap">
            <img
              src="./assets/ui/logo.png"
              alt="Little Legends: Puzzle PVP"
              draggable={false}
              className="splash-logo-img"
            />
          </div>

          <div className="splash-fireflies" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="splash-actions">
            <div className="splash-update-track">
              <img
                src="./assets/ui/login/bg_updatebar01.png"
                alt=""
                draggable={false}
                className="splash-bar-bg"
              />
              <div
                className="splash-bar-fill-wrap"
                style={{ width: `${loadingProgress}%` }}
              >
                <img
                  src="./assets/ui/login/img_updatebar01.png"
                  alt=""
                  draggable={false}
                  className="splash-bar-fill"
                />
              </div>
              <span className="splash-bar-label">
                {loadingPhase} ({loadingProgress}%)
              </span>
            </div>

            {readyToStart ? (
              <button
                type="button"
                className="apk-login-btn apk-start-ready-pulse"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartGame();
                }}
              >
                <img
                  src="./assets/ui/login/btn_login01.png"
                  alt=""
                  draggable={false}
                  className="apk-login-bg"
                />
                <span className="apk-btn-text">TOUCH TO START</span>
              </button>
            ) : (
              <div className="apk-loading-hint">Connecting server...</div>
            )}
          </div>

          <div className="splash-version-tag">Version 2.1.43 (S011_13)</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewport">
      <div className={`phone-shell ${battleActive ? 'in-battle' : ''}`}>
        {!battleActive && (
          <TopBar
            profile={profile}
            mode={tab === 'match' ? 'lobby' : 'resources'}
            onQuickStore={() => setTab('store')}
            onOpenExchangeOrbs={() => {
              playSfx('ui-popup');
              setActiveModal('exchangeOrbs');
            }}
            onOpenPlayerInfo={() => setActiveModal('playerInfo')}
            onOpenMenuModal={(kind) => {
              playSfx('ui-popup');
              setActiveModal(kind);
            }}
          />
        )}

        <main className={`main-stage ${battleActive ? 'no-chrome' : ''}`}>
          {tab === 'store' && (
            <StoreScreen
              profile={profile}
              onSummon={handleSummon}
              onExchangeOrbsForGold={handleExchangeOrbs}
              onOpenWheel={() => {
                playSfx('ui-popup');
                setWheelOpen(true);
              }}
              onGrantBonus={(reward) =>
                setProfile((prev) => ({
                  ...prev,
                  gold: prev.gold + (reward.gold ?? 0),
                  diamonds: prev.diamonds + (reward.diamonds ?? 0),
                  manaOrbs: prev.manaOrbs + (reward.manaOrbs ?? 0),
                }))
              }
              onOpenPrivilege={() => {
                playSfx('ui-popup');
                setActiveModal('privilege');
              }}
            />
          )}
          {tab === 'legend' && (
            <LegendScreen
              profile={profile}
              onAssignSlot={handleAssignSlot}
              onUpgradeLegend={handleUpgradeLegend}
              onUpdateProfile={setProfile}
            />
          )}
          {tab === 'match' && (
            <BattleArena
              profile={profile}
              initialPresetIndex={queuedMatch?.presetIndex ?? null}
              onConsumePreset={() => setQueuedMatch(null)}
              onBattleComplete={handleBattleComplete}
              onOpenWheel={() => {
                playSfx('ui-popup');
                setWheelOpen(true);
              }}
              onOpenModal={(kind) => {
                playSfx('ui-popup');
                setActiveModal(kind);
              }}
              onOpenCollection={() => setTab('legend')}
              onBattleActiveChange={setBattleActive}
            />
          )}
          {tab === 'tournament' && (
            <TournamentScreen
              profile={profile}
              onStartBracket={() =>
                setProfile((prev) => ({
                  ...prev,
                  bracket: createTournamentBracket(prev),
                }))
              }
              onResetBracket={() =>
                setProfile((prev) => ({
                  ...prev,
                  bracket: createTournamentBracket(prev),
                }))
              }
              onStartTournamentMatch={(presetIndex, fromBracket) => {
                setActiveBracketBattle(fromBracket);
                setQueuedMatch({ presetIndex, fromBracket });
                setTab('match');
              }}
            />
          )}
          {tab === 'island' && (
            <IslandScreen
              profile={profile}
              onClaimIsland={handleClaimIsland}
              onUpgradeIsland={handleUpgradeIsland}
              onAssignGuardian={handleAssignGuardian}
              onPlaceDecor={handlePlaceDecor}
            />
          )}
        </main>

        {/* Bottom 5-tab wooden dock chuẩn APK Việt hoá */}
        {!battleActive && (
          <nav className="bottom-nav" aria-label="Thanh điều hướng">
            {(
              [
                { id: 'store', label: 'Shop' },
                { id: 'legend', label: 'Thẻ Bài' },
                { id: 'match', label: 'Chiến đấu' },
                { id: 'tournament', label: 'Giải đấu' },
                { id: 'island', label: 'Gia Viên' },
              ] as const
            ).map((item) => {
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    unlockAudio();
                    playSfx('ui-click');
                    setBattleActive(false);
                    setTab(item.id);
                  }}
                >
                  <span className="nav-icon" aria-hidden="true">
                    <NavTabIcon tab={item.id} active={isActive} size={isActive ? 38 : 30} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {wheelOpen && (
          <SpinWheelModal
            profile={profile}
            onSpin={handleSpinWheel}
            onOpenPrivilege={() => setActiveModal('privilege')}
            onClose={() => {
              playSfx('ui-close');
              setWheelOpen(false);
            }}
          />
        )}

        <ApkModals
          modal={activeModal}
          profile={profile}
          onClose={() => {
            playSfx('ui-close');
            setActiveModal(null);
          }}
          onSwitchModal={setActiveModal}
          onUpdateProfile={setProfile}
          onSummon={handleSummon}
        />
      </div>
    </div>
  );
}
export default App;
