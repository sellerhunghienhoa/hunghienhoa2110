import { useEffect, useState } from 'react';
import { AI_OPPONENTS, DECOR_CATALOG, getLegendDef } from '../game/legends.ts';
import { playSfx } from '../game/sound.ts';
import type { BracketSlot, PlayerProfile, TournamentBracket } from '../game/types.ts';
import { DecorBuildingSvg } from './GameArt.tsx';
import { LegendSprite } from './LegendSprite.tsx';
import { SpineCanvas } from './SpineCanvas.tsx';

const BUILDING_SPINE_MAP: Record<string, string> = {
  ferris: 'b101',
  carousel: 'b102',
  spire: 'b103',
  fountain: 'b104',
  bakery: 'b105',
  statue: 'b106',
};

interface TournamentScreenProps {
  profile: PlayerProfile;
  onStartTournamentMatch: (presetIndex: number, fromBracket: boolean) => void;
  onStartBracket: () => void;
  onResetBracket: () => void;
}

const ISLAND_COORDS: Array<{ left: string; top: string }> = [
  { left: '49%', top: '28%' },
  { left: '78%', top: '38%' },
  { left: '18%', top: '41%' },
  { left: '28%', top: '56%' },
  { left: '73%', top: '60%' },
  { left: '52%', top: '69%' },
];

function BracketNode({
  slot,
  won = false,
  champion = false,
}: {
  slot: BracketSlot | null;
  won?: boolean;
  champion?: boolean;
}) {
  if (!slot) {
    return (
      <div className="medallion-node tbd">
        <span className="med-score">—</span>
        <div className="med-circle empty">
          <span>?</span>
        </div>
        <span className="med-name">TBD</span>
      </div>
    );
  }

  const ringSrc = champion
    ? './assets/ui/headframe-champ.png'
    : won || slot.isPlayer
      ? './assets/ui/headframe-gold.png'
      : './assets/ui/headframe-bronze.png';

  return (
    <div className={`medallion-node ${won || champion ? 'winner' : ''} ${slot.isPlayer ? 'is-player' : ''}`}>
      <span className="med-score">{slot.power}</span>
      <div className="med-circle">
        {champion && (
          <img
            src="./assets/ui/sunburst-gold.png"
            alt=""
            draggable={false}
            className="med-champ-sun"
          />
        )}
        <div className="med-portrait-clip">
          <LegendSprite legendId={slot.legendId} variant="head" size={champion ? 44 : 36} />
        </div>
        <img src={ringSrc} alt="" draggable={false} className="med-ring-img" />
        {(won || champion) && (
          <img
            src="./assets/ui/cup.png"
            width={16}
            height={16}
            alt=""
            draggable={false}
            className="med-trophy-pin"
          />
        )}
        {(won || slot.isPlayer) && (
          <img
            src="./assets/ui/star-gold.png"
            width={13}
            height={13}
            alt=""
            draggable={false}
            className="med-star-pin"
          />
        )}
      </div>
      <span className="med-name">{slot.name}</span>
    </div>
  );
}

export function TournamentScreen({
  profile,
  onStartTournamentMatch,
  onStartBracket,
  onResetBracket,
}: TournamentScreenProps) {
  const bracket: TournamentBracket | null = profile.bracket;

  return (
    <section className="screen tournament-screen">
      {/* Wooden Bulletin Board + Green Vines matching Screenshot 6 */}
      <div className="wooden-bulletin-board">
        <img src="./assets/ui/vine-top.png" alt="" draggable={false} className="board-top-vines" />
        <div className="bulletin-parchment">
          <i className="rivet tl" />
          <i className="rivet tr" />
          <i className="rivet bl" />
          <i className="rivet br" />

          {!bracket ? (
            <div className="bracket-empty">
              <div className="brown-ribbon-hdr">Giải Đấu 8 Người</div>
              <p className="bracket-intro">
                Cúp Đấu Loại Trực Tiếp · Cúp: <strong>{profile.trophies}</strong>
              </p>
              <button
                type="button"
                className="btn-primary spin-glossy-btn"
                onClick={() => {
                  playSfx('ui-popup');
                  onStartBracket();
                }}
              >
                Tham gia Nhánh 8 Người
              </button>
            </div>
          ) : (
            <div className="bracket-rounds">
              <div className="brown-ribbon-hdr">Tứ kết</div>
              <div className="qf-grid">
                {bracket.qfPairs.map(([a, b], idx) => {
                  const winnerId = bracket.qfWinners[idx]?.name;
                  return (
                    <div key={idx} className="vs-pair-clean">
                      <BracketNode slot={a} won={Boolean(winnerId && winnerId === a.name)} />
                      <img src="./assets/ui/vs-gold.png" width={26} height={18} alt="VS" draggable={false} />
                      <BracketNode slot={b} won={Boolean(winnerId && winnerId === b.name)} />
                    </div>
                  );
                })}
              </div>

              <div className="brown-ribbon-hdr">Bán kết</div>
              <div className="sf-grid">
                <div className="vs-pair-clean">
                  <BracketNode
                    slot={bracket.qfWinners[0]}
                    won={Boolean(bracket.sfWinners[0] && bracket.sfWinners[0]?.name === bracket.qfWinners[0]?.name)}
                  />
                  <img src="./assets/ui/vs-gold.png" width={26} height={18} alt="VS" draggable={false} />
                  <BracketNode
                    slot={bracket.qfWinners[1]}
                    won={Boolean(bracket.sfWinners[0] && bracket.sfWinners[0]?.name === bracket.qfWinners[1]?.name)}
                  />
                </div>
                <div className="vs-pair-clean">
                  <BracketNode
                    slot={bracket.qfWinners[2]}
                    won={Boolean(bracket.sfWinners[1] && bracket.sfWinners[1]?.name === bracket.qfWinners[2]?.name)}
                  />
                  <img src="./assets/ui/vs-gold.png" width={26} height={18} alt="VS" draggable={false} />
                  <BracketNode
                    slot={bracket.qfWinners[3]}
                    won={Boolean(bracket.sfWinners[1] && bracket.sfWinners[1]?.name === bracket.qfWinners[3]?.name)}
                  />
                </div>
              </div>

              <div className="brown-ribbon-hdr">Chung kết</div>
              <div className="vs-pair-clean final-pair">
                <BracketNode
                  slot={bracket.sfWinners[0]}
                  won={Boolean(bracket.champion && bracket.champion.name === bracket.sfWinners[0]?.name)}
                  champion={Boolean(bracket.champion && bracket.champion.name === bracket.sfWinners[0]?.name)}
                />
                <img src="./assets/ui/vs-gold.png" width={36} height={24} alt="VS" draggable={false} />
                <BracketNode
                  slot={bracket.sfWinners[1]}
                  won={Boolean(bracket.champion && bracket.champion.name === bracket.sfWinners[1]?.name)}
                  champion={Boolean(bracket.champion && bracket.champion.name === bracket.sfWinners[1]?.name)}
                />
              </div>

              {bracket.champion && (
                <div className="champ-wins-text">{bracket.champion.name} VÔ ĐỊCH!</div>
              )}

              <div className="bracket-actions">
                {bracket.round < 3 ? (
                  <button
                    type="button"
                    className="btn-primary spin-glossy-btn"
                    onClick={() => {
                      playSfx('ui-match-go');
                      onStartTournamentMatch(Math.min(2, bracket.round), true);
                    }}
                  >
                    Đánh {bracket.round === 0 ? 'Tứ kết' : bracket.round === 1 ? 'Bán kết' : 'Chung kết'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary spin-glossy-btn"
                    onClick={() => {
                      playSfx('ui-trophy');
                      onResetBracket();
                    }}
                  >
                    Giải Đấu Mới
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compact Cup Trials Bar */}
      <div className="cup-ladder-compact">
        {AI_OPPONENTS.map((opp, idx) => {
          const stageNum = idx + 1;
          const unlocked = stageNum <= profile.tournamentStage;
          return (
            <button
              key={opp.name}
              type="button"
              className={`trial-chip-card ${unlocked ? '' : 'locked'}`}
              disabled={!unlocked}
              onClick={() => {
                playSfx('ui-match-go');
                onStartTournamentMatch(idx, false);
              }}
            >
              <span className="cup-stage">Trial {stageNum}</span>
              <strong>{opp.title}</strong>
              <small>+{opp.rewardGold}G</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface IslandScreenProps {
  profile: PlayerProfile;
  onClaimIsland: (nodeId: 'shrine' | 'mine' | 'grove') => void;
  onUpgradeIsland: (nodeId: 'shrine' | 'mine' | 'grove') => void;
  onAssignGuardian: (nodeId: 'shrine' | 'mine' | 'grove', legendId: string | null) => void;
  onPlaceDecor: (slot: number, decorId: string) => void;
}

export function IslandScreen({
  profile,
  onClaimIsland,
  onUpgradeIsland,
  onAssignGuardian,
  onPlaceDecor,
}: IslandScreenProps) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [showNodesDrawer, setShowNodesDrawer] = useState(false);
  const ownedIds = Object.keys(profile.owned);

  const toggleNodesDrawer = () => {
    const opening = !showNodesDrawer;
    playSfx(opening ? 'ui-popup' : 'ui-close');
    setSelectedPlot(null);
    setShowNodesDrawer(opening);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const totalPending = profile.islands.reduce((sum, node) => {
    const elapsedSec = Math.max(0, Math.floor((now - node.lastClaimAt) / 1000));
    const guardianMult = node.guardianId ? 1.5 : 1;
    const ratePerMin =
      node.id === 'grove'
        ? Math.round(4 * node.level * guardianMult)
        : Math.round(36 * node.level * guardianMult);
    return sum + Math.min(ratePerMin * 20, Math.floor((elapsedSec / 60) * ratePerMin));
  }, 0);

  return (
    <section className="screen island-screen">
      {/* Full-bleed Isometric Fantasy Park Canvas matching APK */}
      <div className="island-full-canvas">
        <img src="./assets/bg/map_main_bg.png" alt="" draggable={false} className="island-backdrop-map" />
        <img src="./assets/bg/img_scene01.png" alt="" draggable={false} className="island-backdrop-scene" />
        <div className="island-hud-overlay">
          <div className="island-hud-left">
            <div className="player-avatar-badge">
              <div className="avatar-ring-sm">
                <div className="med-portrait-clip">
                  <LegendSprite legendId={profile.lineup.find(Boolean) ?? 'solfox'} variant="head" size={32} />
                </div>
                <img src="./assets/ui/headframe-gold.png" alt="" draggable={false} className="med-ring-img" />
              </div>
              <div className="star-counters">
                <span>
                  <img src="./assets/ui/star-gold.png" width={13} height={13} alt="" draggable={false} />
                  {profile.trophies}
                </span>
                <span>
                  <img src="./assets/ui/star-gold.png" width={13} height={13} alt="" draggable={false} />
                  {profile.decorScore}
                </span>
              </div>
            </div>

            <div className="island-social-stack">
              <button
                type="button"
                className="island-social-btn"
                onClick={toggleNodesDrawer}
              >
                <img src="./assets/ui/social-smile.png" width={28} height={28} alt="" draggable={false} />
                <span>Giao lưu</span>
              </button>
              <div className="island-chat-feed">
                <div><b>Thế giới</b> SZL: Tuyệt!</div>
                <div><b>Thế giới</b> LittleFox: GG</div>
              </div>
            </div>
          </div>

          <div className="island-hud-right">
            <button
              type="button"
              className="island-overview-badge"
              onClick={toggleNodesDrawer}
              title="Tổng quan & Công trình"
            >
              <img src="./assets/ui/island-overview.png" width={40} height={40} alt="" draggable={false} />
              <span>Tổng quan</span>
              <b>Lv.{profile.playerLevel}</b>
            </button>
            <button
              type="button"
              className="island-harvest-pill icon-btn"
              onClick={toggleNodesDrawer}
            >
              <img src="./assets/ui/orb.png" width={14} height={14} alt="" draggable={false} />
              <span>Tài nguyên {totalPending > 0 ? `(+${totalPending})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Organic Landmark Pins directly on the isometric map */}
        {ISLAND_COORDS.map((coord, slot) => {
          const placed = profile.decorations.find((d) => d.slot === slot);
          const item = placed ? DECOR_CATALOG.find((c) => c.id === placed.decorId) : null;
          const isSelected = selectedPlot === slot;

          return (
            <button
              key={slot}
              type="button"
              className={`map-landmark-pin ${placed ? 'built' : 'empty'} ${isSelected ? 'selected' : ''}`}
              style={{ left: coord.left, top: coord.top }}
              onClick={() => {
                playSfx(isSelected ? 'ui-close' : 'ui-popup');
                setShowNodesDrawer(false);
                setSelectedPlot(isSelected ? null : slot);
              }}
            >
              {item ? (
                <>
                  {BUILDING_SPINE_MAP[item.id] ? (
                    <SpineCanvas
                      basePath={`./assets/spine/buildings/${BUILDING_SPINE_MAP[item.id]}/${BUILDING_SPINE_MAP[item.id]}`}
                      animation="stand"
                      size={74}
                      fallbackSrc="./assets/ui/home/btn_build01.png"
                      className="island-building-spine"
                    />
                  ) : (
                    <DecorBuildingSvg decorId={item.id} size={64} />
                  )}
                  <span className="map-tag">
                    {item.name.split(' ').pop()} Lv.{placed!.level}
                  </span>
                </>
              ) : (
                <span className="map-empty-pin">
                  <img src="./assets/ui/btn-plus.png" width={28} height={28} alt={`Build Plot ${slot + 1}`} draggable={false} />
                </span>
              )}
            </button>
          );
        })}

        {/* Roaming Chibi Legends walking the paths */}
        <div className="park-roamer r1">
          <LegendSprite legendId={profile.lineup[0] ?? 'solfox'} size={42} className="bob-anim" />
        </div>
        <div className="park-roamer r2">
          <LegendSprite legendId={profile.lineup[1] ?? 'frostkit'} size={38} flipped className="bob-anim" />
        </div>

        {/* Floating Plot Builder Drawer */}
        {selectedPlot !== null && (
          <div className="island-drawer wood-drawer">
            <div className="drawer-hdr">
              <strong>Build on Landmark #{selectedPlot + 1}</strong>
              <button
                type="button"
                onClick={() => {
                  playSfx('ui-close');
                  setSelectedPlot(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="decor-catalog-row">
              {DECOR_CATALOG.map((item) => {
                const existing = profile.decorations.find(
                  (d) => d.slot === selectedPlot && d.decorId === item.id,
                );
                const cost = existing
                  ? Math.round(item.costGold * existing.level * 0.9)
                  : item.costGold;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="decor-choice"
                    disabled={profile.gold < cost}
                    onClick={() => {
                      onPlaceDecor(selectedPlot, item.id);
                      setSelectedPlot(null);
                    }}
                  >
                    <DecorBuildingSvg decorId={item.id} size={34} />
                    <small>{existing ? `Up Lv.${existing.level + 1}` : item.name.split(' ')[0]}</small>
                    <strong>{cost}G</strong>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passive Shrine/Mine/Grove Drawer */}
        {showNodesDrawer && (
          <div className="island-drawer wood-drawer">
            <div className="drawer-hdr">
              <strong>Island Resource Shrines</strong>
              <button
                type="button"
                onClick={() => {
                  playSfx('ui-close');
                  setShowNodesDrawer(false);
                }}
              >
                ✕
              </button>
            </div>
            <div className="nodes-compact-list">
              {profile.islands.map((node) => {
                const elapsedSec = Math.max(0, Math.floor((now - node.lastClaimAt) / 1000));
                const guardianMult = node.guardianId ? 1.5 : 1;
                const ratePerMin =
                  node.id === 'grove'
                    ? Math.round(4 * node.level * guardianMult)
                    : Math.round(36 * node.level * guardianMult);
                const pending = Math.min(
                  ratePerMin * 20,
                  Math.floor((elapsedSec / 60) * ratePerMin),
                );
                const upgradeCost = 260 * node.level;
                const resourceLabel =
                  node.id === 'shrine' ? 'Orbs' : node.id === 'mine' ? 'Gold' : 'Diamonds';

                return (
                  <div key={node.id} className="node-row-compact">
                    <DecorBuildingSvg decorId={node.id} size={36} />
                    <div className="node-info">
                      <b>
                        {node.name} Lv.{node.level}
                      </b>
                      <small>
                        +{ratePerMin} {resourceLabel}/m • Ready: {pending}
                      </small>
                      <select
                        aria-label={`${node.name} Guardian`}
                        value={node.guardianId ?? ''}
                        onChange={(e) => {
                          playSfx('ui-equip');
                          onAssignGuardian(node.id, e.target.value || null);
                        }}
                      >
                        <option value="">No Guardian</option>
                        {ownedIds.map((id) => (
                          <option key={id} value={id}>
                            {getLegendDef(id).name} (+50%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="node-btns">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={pending <= 0}
                        onClick={() => onClaimIsland(node.id)}
                      >
                        +{pending}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={profile.gold < upgradeCost}
                        onClick={() => onUpgradeIsland(node.id)}
                      >
                        Up {upgradeCost}G
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
