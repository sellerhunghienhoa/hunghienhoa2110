import { useState } from 'react';
import {
  LEGENDS,
  canUpgradeLegend,
  getLegendDef,
  getLegendStats,
  getLegendUses,
  getSlotUnlockTrophies,
  getTeamPower,
  getUpgradeCost,
  getUpgradeXpReward,
  getXpToNextLevel,
} from '../game/legends.ts';
import { playSfx } from '../game/sound.ts';
import type { LegendRole, PlayerProfile } from '../game/types.ts';
import { CurrencyIcon } from './GameArt.tsx';
import { LegendSprite } from './LegendSprite.tsx';
import { SPINE_SKILL_CODE, SpineCanvas } from './SpineCanvas.tsx';

interface LegendScreenProps {
  profile: PlayerProfile;
  onAssignSlot: (slotIndex: number, legendId: string | null) => void;
  onUpgradeLegend: (legendId: string) => void;
  onUpdateProfile?: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

type RoleFilter = 'All' | LegendRole;

const ROLE_ICON: Record<LegendRole, string> = {
  Active: './assets/ui/skill-active.png',
  Limited: './assets/ui/skill-limited.png',
  Passive: './assets/ui/skill-passive.png',
};

const ROLE_VI: Record<LegendRole, string> = {
  Active: 'Chủ Động',
  Limited: 'Giới Hạn',
  Passive: 'Bị Động',
};

const TALENT_TREE_ROWS = [
  [
    { id: 't_t1', name: 'Hợp Thể Nổ', color: 'violet', max: 3 },
    { id: 't_t2', name: 'Pháo Lửa', color: 'amber', max: 3 },
    { id: 't_t3', name: 'Sinh Lực Rừng', color: 'jade', max: 3 },
  ],
  [
    { id: 't_m1', name: 'Ma Lực Tối', color: 'violet', max: 5 },
    { id: 't_m2', name: 'Bùng Cháy', color: 'amber', max: 5 },
    { id: 't_m3', name: 'Thiên Hoa', color: 'jade', max: 5 },
    { id: 't_m4', name: 'Hồ Băng', color: 'azure', max: 5 },
  ],
  [
    { id: 't_b1', name: 'Lôi Sét', color: 'violet', max: 5 },
    { id: 't_b2', name: 'Bạo Kích', color: 'amber', max: 5 },
    { id: 't_b3', name: 'Rễ Vĩnh Cửu', color: 'jade', max: 5 },
    { id: 't_b4', name: 'Xoáy Gió', color: 'azure', max: 5 },
  ],
] as const;

export function LegendScreen({
  profile,
  onAssignSlot,
  onUpgradeLegend,
  onUpdateProfile,
}: LegendScreenProps) {
  const [filter, setFilter] = useState<RoleFilter>('All');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'skill' | 'awaken'>('skill');
  const [previewSkill, setPreviewSkill] = useState(false);
  const [talentOpen, setTalentOpen] = useState(false);
  const [dragLegendId, setDragLegendId] = useState<string | null>(null);

  const visibleLegends = LEGENDS.filter(
    (def) => filter === 'All' || def.role === filter,
  );

  const inspectedIndex = inspectedId ? visibleLegends.findIndex((l) => l.id === inspectedId) : -1;
  const inspectedOwned = inspectedId ? profile.owned[inspectedId] : null;
  const inspectedDef = inspectedId ? getLegendDef(inspectedId) : null;
  const teamPower = getTeamPower(profile);
  const xpNext = getXpToNextLevel(profile.playerLevel);
  const talentPreset = profile.talentPreset ?? 1;
  const talentLevels = profile.talentLevels ?? { root: 1 };
  const spentPoints = Object.values(talentLevels).reduce((s, v) => s + v, 0);
  const availTalentPts = Math.max(5, profile.playerLevel * 4) - spentPoints + 1;

  const stepInspect = (dir: -1 | 1) => {
    if (!visibleLegends.length) return;
    playSfx('ui-click');
    setPreviewSkill(false);
    const nextIdx = (inspectedIndex + dir + visibleLegends.length) % visibleLegends.length;
    setInspectedId(visibleLegends[nextIdx].id);
  };

  return (
    <section className="screen legend-screen">
      {/* Thảm cỏ & sân xuất chiến 5 Tinh Linh chuẩn APK */}
      <div className="lineup-stage">
        <div className="stage-meadow">
          <div className="stage-sprites">
            {profile.lineup.map((id, idx) => (
              <div key={idx} className="stage-unit">
                {id ? (
                  <>
                    <LegendSprite legendId={id} size={74} className="bob-anim" />
                    <img
                      src="./assets/ui/unit-shadow.png"
                      alt=""
                      draggable={false}
                      className="unit-ground-shadow"
                    />
                  </>
                ) : (
                  <div className="stage-ghost" />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="apk-talent-btn"
            onClick={() => {
              playSfx('ui-popup');
              setTalentOpen(true);
            }}
            title="Mở Cây Thiên Phú"
          >
            <small>Thiên phú {talentPreset}</small>
            <div className="apk-talent-butterfly-wrap">
              <img src="./assets/ui/butterfly-ring.png" width={40} height={40} alt="" draggable={false} />
              <span>{profile.playerLevel}</span>
            </div>
            <span className="apk-talent-xp">
              {profile.xp}/{xpNext}
            </span>
          </button>
        </div>

        <div className="lineup-wood-shelf">
          <div className="lineup-slots-wave">
            {profile.lineup.map((id, idx) => {
              const reqTrophies = getSlotUnlockTrophies(idx);
              const isLocked = profile.trophies < reqTrophies;
              const isSelected = !isLocked && selectedSlot === idx;
              const stagger = idx % 2 === 1 ? 'stagger-down' : '';
              const unitName = isLocked
                ? `Ô ${idx + 1} mở ở ${reqTrophies} Cúp`
                : id
                  ? getLegendDef(id).name
                  : `Ô ${idx + 1}`;
              return (
                <button
                  key={idx}
                  type="button"
                  title={unitName}
                  aria-disabled={isLocked}
                  className={`slot-coin ${id ? 'filled' : ''} ${isSelected ? 'active' : ''} ${isLocked ? 'locked' : ''} ${stagger}`}
                  onClick={() => {
                    if (isLocked) {
                      playSfx('ui-close');
                      return;
                    }
                    playSfx('ui-click');
                    setSelectedSlot(isSelected ? null : idx);
                  }}
                  onDragOver={(e) => {
                    if (!isLocked) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (isLocked) return;
                    const dropped = e.dataTransfer.getData('text/plain') || dragLegendId;
                    if (dropped && profile.owned[dropped]) {
                      onAssignSlot(idx, dropped);
                    }
                    setDragLegendId(null);
                  }}
                >
                  <span>{isLocked ? '🔒' : idx + 1}</span>
                </button>
              );
            })}
          </div>

          <div className="shelf-power-pill" title="Lực chiến đội hình">
            <img src="./assets/ui/power.png" width={20} height={20} alt="" draggable={false} />
            <span>{teamPower}</span>
          </div>
        </div>

        <img
          src="./assets/ui/vine-divider.png"
          alt=""
          draggable={false}
          className="formation-vine-divider"
        />
        <p className="stage-hint">
          {selectedSlot !== null
            ? `Chạm vào Tinh Linh bên dưới để đưa vào Ô ${selectedSlot + 1}`
            : profile.trophies < getSlotUnlockTrophies(4)
              ? `Giữ để kéo Tinh Linh lên trận • Ô 5 mở ở ${getSlotUnlockTrophies(4)} 🏆`
              : 'Giữ để kéo Tinh Linh lên trận'}
        </p>
      </div>

      {/* Bộ sưu tập thẻ Tinh Linh */}
      <div className="legend-collection-deck">
        <div className="filter-tabs" role="tablist">
          {(
            [
              { id: 'All', label: 'Tất cả' },
              { id: 'Active', label: 'Chủ Động' },
              { id: 'Limited', label: 'Giới Hạn' },
              { id: 'Passive', label: 'Bị Động' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={`filter-pill ${filter === tab.id ? 'active' : ''}`}
              onClick={() => {
                playSfx('ui-click');
                setFilter(tab.id);
              }}
            >
              {tab.id !== 'All' && (
                <img
                  src={ROLE_ICON[tab.id]}
                  width={15}
                  height={15}
                  alt=""
                  draggable={false}
                  className="ui-sprite-icon"
                />
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="legend-grid">
          {visibleLegends.map((def) => {
            const owned = profile.owned[def.id];
            const inLineupIndex = profile.lineup.indexOf(def.id);
            const upgradeable = owned ? canUpgradeLegend(owned, profile.gold) : false;
            const cost = owned ? getUpgradeCost(owned) : null;
            const shardPct =
              owned && cost
                ? Math.min(100, Math.round((owned.shards / cost.shardsNeeded) * 100))
                : 0;
            const skillSrc = ROLE_ICON[def.role];
            const tierClass = (def.tierTag ?? 'COMMON').toLowerCase();

            return (
              <div
                key={def.id}
                draggable={Boolean(owned)}
                onDragStart={(e) => {
                  if (!owned) return;
                  setDragLegendId(def.id);
                  e.dataTransfer.setData('text/plain', def.id);
                }}
                onClick={() => {
                  if (selectedSlot !== null && owned) {
                    onAssignSlot(selectedSlot, def.id);
                    setSelectedSlot(null);
                  } else {
                    playSfx('ui-popup');
                    setDetailTab('skill');
                    setPreviewSkill(false);
                    setInspectedId(def.id);
                  }
                }}
                className={`legend-card tier-${tierClass} ${owned ? '' : 'locked'}`}
              >
                <div className="card-art-flush">
                  <LegendSprite legendId={def.id} variant="card" size={116} />
                </div>

                <span
                  className="card-cost-badge"
                  title={`${ROLE_VI[def.role]} • Mana ${def.manaCost}`}
                >
                  <img src={skillSrc} width={28} height={28} alt="" draggable={false} />
                  {def.role !== 'Passive' && <b>{def.manaCost}</b>}
                </span>

                {inLineupIndex !== -1 && (
                  <span className="card-lineup-badge">#{inLineupIndex + 1}</span>
                )}

                {upgradeable && (
                  <img
                    src="./assets/ui/upgrade-arrow.png"
                    alt="Nâng cấp được"
                    draggable={false}
                    className="upgrade-arrow-img"
                  />
                )}

                <div className="card-overlay-footer">
                  <span className="card-paw-lv-pill">
                    <CurrencyIcon kind="paw" size={16} />
                    <b>{owned ? owned.level : '–'}</b>
                  </span>
                  <div className="shard-bar">
                    <div className="shard-fill" style={{ width: `${shardPct}%` }} />
                    {!owned && (
                      <img
                        src="./assets/ui/lock-small.png"
                        width={11}
                        height={11}
                        alt="Chưa sở hữu"
                        draggable={false}
                        className="card-lock-ico"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup Chi tiết Tinh Linh chuẩn bộ ảnh APK */}
      {inspectedDef && (() => {
        const tier = inspectedDef.tierTag ?? 'COMMON';
        const lv = inspectedOwned?.level ?? 1;
        const stats = getLegendStats(inspectedDef.id, lv);
        const uses = getLegendUses(lv);
        const xpGain = getUpgradeXpReward(lv);
        const cost = inspectedOwned ? getUpgradeCost(inspectedOwned) : null;
        const canUp = inspectedOwned ? canUpgradeLegend(inspectedOwned, profile.gold) : false;
        const powerScore = Math.round(stats.attack * 1.6 + stats.hp * 0.35);

        return (
          <div
            className="modal-backdrop apk-detail-backdrop"
            onClick={() => {
              playSfx('ui-close');
              setInspectedId(null);
            }}
          >
            <button
              type="button"
              className="apk-nav-arrow left"
              aria-label="Tinh Linh trước"
              onClick={(e) => {
                e.stopPropagation();
                stepInspect(-1);
              }}
            >
              ‹
            </button>

            <div className={`apk-hero-detail-card tier-${tier.toLowerCase()}`} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="apk-detail-close"
                aria-label="Đóng"
                onClick={() => {
                  playSfx('ui-close');
                  setInspectedId(null);
                }}
              >
                <img src="./assets/ui/btn-close.png" width={34} height={34} alt="" draggable={false} />
              </button>

              <div className={`apk-hero-splash-banner tier-${tier.toLowerCase()}`}>
                {previewSkill && SPINE_SKILL_CODE[inspectedDef.id] ? (
                  <SpineCanvas
                    basePath={`./assets/spine/skills/${inspectedDef.id}/${SPINE_SKILL_CODE[inspectedDef.id]}`}
                    animation="skill"
                    loop={false}
                    size={190}
                    onComplete={() => setPreviewSkill(false)}
                  />
                ) : (
                  <LegendSprite legendId={inspectedDef.id} variant="splash" size={196} className="bob-anim apk-splash-art" />
                )}
                <div className={`apk-rarity-stamp tier-${tier.toLowerCase()}`}>{tier}</div>
              </div>

              <div className="apk-hero-stats-ribbon">
                <span className="apk-hp-pill">❤ {stats.hp * 20}</span>
                <strong className="apk-hero-name-title">{inspectedDef.name}</strong>
                <span className="apk-power-pill">★ {powerScore}</span>
              </div>

              <div className="apk-detail-tabs">
                <button
                  type="button"
                  className={detailTab === 'skill' ? 'active' : ''}
                  onClick={() => {
                    playSfx('ui-click');
                    setDetailTab('skill');
                  }}
                >
                  Kỹ năng
                </button>
                <button
                  type="button"
                  className={detailTab === 'awaken' ? 'active' : ''}
                  onClick={() => {
                    playSfx('ui-click');
                    setDetailTab('awaken');
                  }}
                >
                  Giác Tỉnh
                </button>
              </div>

              <div className="apk-detail-skill-body">
                <div className="apk-detail-left-col">
                  <div className="apk-detail-circle-head">
                    <LegendSprite legendId={inspectedDef.id} variant="head" size={56} />
                    {inspectedDef.role !== 'Passive' && (
                      <span className="apk-detail-mana">{inspectedDef.manaCost}</span>
                    )}
                  </div>
                  <span className="apk-detail-role-tag">{ROLE_VI[inspectedDef.role]}</span>

                  <button
                    type="button"
                    className="apk-demo-btn"
                    onClick={() => {
                      playSfx('skill-cast');
                      setPreviewSkill(true);
                    }}
                  >
                    <span className="apk-demo-play">▶</span>
                    <small>Trình diễn kỹ năng</small>
                  </button>
                </div>

                <div className="apk-detail-right-col">
                  {detailTab === 'skill' ? (
                    <>
                      <p className="apk-skill-desc-text">{inspectedDef.skillDesc}</p>
                      <small className="apk-skill-meta-line">
                        Số lượt dùng: {uses} • Sát thương cơ bản: {stats.attack}
                      </small>
                    </>
                  ) : (
                    <p className="apk-skill-desc-text">
                      {inspectedDef.awakenDesc}
                    </p>
                  )}

                  {inspectedOwned && (
                    <div className="quick-assign-row" style={{ marginTop: 10 }}>
                      {[0, 1, 2, 3, 4].map((slot) => {
                        const req = getSlotUnlockTrophies(slot);
                        const slotLocked = profile.trophies < req;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={slotLocked}
                            className={`btn-slot dark ${profile.lineup[slot] === inspectedDef.id ? 'active' : ''}`}
                            onClick={() => {
                              const current = profile.lineup[slot];
                              onAssignSlot(slot, current === inspectedDef.id ? null : inspectedDef.id);
                            }}
                          >
                            {slotLocked ? `🔒${req}` : `Ô ${slot + 1}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="apk-detail-bottom-mint">
                {inspectedOwned ? (
                  <>
                    <div className="apk-detail-lv-badge">
                      Lv.{lv} {cost ? `(${inspectedOwned.shards}/${cost.shardsNeeded})` : ''}
                    </div>
                    {lv >= 15 ? (
                      <span className="apk-max-lv-text">Tinh Linh này đã full cấp</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!canUp}
                        onClick={() => onUpgradeLegend(inspectedDef.id)}
                      >
                        Nâng cấp ({cost?.shardsNeeded} Mảnh • {cost?.gold} Vàng • +{xpGain} XP)
                      </button>
                    )}
                  </>
                ) : (
                  <span className="apk-max-lv-text">Mở Hòm tại Shop hoặc Triệu hồi để sở hữu {inspectedDef.name}</span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="apk-nav-arrow right"
              aria-label="Tinh Linh tiếp theo"
              onClick={(e) => {
                e.stopPropagation();
                stepInspect(1);
              }}
            >
              ›
            </button>
          </div>
        );
      })()}

      {/* Màn hình Cây Thiên Phú giống hệt 3 ảnh người dùng gửi */}
      {talentOpen && (
        <div className="apk-talent-fullscreen" onClick={() => setTalentOpen(false)}>
          <div className="apk-talent-canvas" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="apk-talent-close"
              onClick={() => {
                playSfx('ui-close');
                setTalentOpen(false);
              }}
            >
              <img src="./assets/ui/btn-close.png" width={36} height={36} alt="Đóng" draggable={false} />
            </button>

            <div className="apk-talent-tree-trunk">
              {TALENT_TREE_ROWS.map((row, rIdx) => (
                <div key={rIdx} className="apk-talent-row">
                  {row.map((node) => {
                    const nodeLv = talentLevels[node.id] ?? 0;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        className={`apk-talent-node color-${node.color} ${nodeLv > 0 ? 'unlocked' : ''}`}
                        onClick={() => {
                          if (availTalentPts <= 0 || nodeLv >= node.max) {
                            playSfx('ui-close');
                            return;
                          }
                          playSfx('ui-upgrade');
                          onUpdateProfile?.((prev) => ({
                            ...prev,
                            talentLevels: {
                              ...(prev.talentLevels ?? { root: 1 }),
                              [node.id]: (prev.talentLevels?.[node.id] ?? 0) + 1,
                            },
                          }));
                        }}
                      >
                        <span className="apk-talent-orb">{node.name.split(' ')[0]}</span>
                        <small>{nodeLv}/{node.max}</small>
                      </button>
                    );
                  })}
                </div>
              ))}

              <div className="apk-talent-row root">
                <button
                  type="button"
                  className="apk-talent-node root unlocked"
                  onClick={() => {
                    if (availTalentPts <= 0) return;
                    playSfx('ui-upgrade');
                    onUpdateProfile?.((prev) => ({
                      ...prev,
                      talentLevels: {
                        ...(prev.talentLevels ?? { root: 1 }),
                        root: Math.min(5, (prev.talentLevels?.root ?? 1) + 1),
                      },
                    }));
                  }}
                >
                  <span className="apk-talent-orb">⚔</span>
                  <small>{talentLevels.root ?? 1}/5</small>
                </button>
              </div>
            </div>

            <div className="apk-talent-footer-info">
              <div className="apk-talent-butterfly-big">
                <img src="./assets/ui/butterfly-ring.png" width={72} height={72} alt="" draggable={false} />
                <strong>{profile.playerLevel}</strong>
              </div>
              <p>Điểm Thiên Phú dùng được: {availTalentPts}/{Math.max(5, profile.playerLevel * 4)}</p>
              <button
                type="button"
                className="apk-talent-reset-btn"
                title="Đặt lại Thiên Phú"
                onClick={() => {
                  playSfx('ui-click');
                  onUpdateProfile?.((prev) => ({ ...prev, talentLevels: { root: 1 } }));
                }}
              >
                ↻
              </button>
            </div>

            <div className="apk-talent-presets">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`apk-preset-tab ${talentPreset === p ? 'active' : ''}`}
                  onClick={() => {
                    playSfx('ui-click');
                    onUpdateProfile?.((prev) => ({ ...prev, talentPreset: p }));
                  }}
                >
                  Thiên phú{p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
