import { useState } from 'react';
import { LEGENDS, getLegendDef, getTeamPower } from '../game/legends.ts';
import { isAudioMuted, playSfx, toggleAudioMuted } from '../game/sound.ts';
import type { SummonPull } from '../game/storage.ts';
import type { PlayerProfile } from '../game/types.ts';
import { LegendSprite } from './LegendSprite.tsx';

export type ApkModalKind =
  | null
  | 'playerInfo'
  | 'rank'
  | 'social'
  | 'summon'
  | 'privilege'
  | 'activity'
  | 'treasure'
  | 'newcomer'
  | 'exchangeOrbs'
  | 'notice'
  | 'mail'
  | 'knowledge'
  | 'settings';

interface ApkModalsProps {
  modal: ApkModalKind;
  profile: PlayerProfile;
  onClose: () => void;
  onSwitchModal: (next: ApkModalKind) => void;
  onUpdateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
  onSummon: (count: 1 | 9, currency: 'gold' | 'diamonds') => SummonPull[] | null;
}

const BADGE_CATALOG = [
  { id: 'b_active', name: 'Huy hiệu sôi nổi', icon: '🪶', level: 3 },
  { id: 'b_cup', name: 'Huy hiệu giải đấu lớn', icon: '🐱', level: 1 },
  { id: 'b_adv', name: 'Huy hiệu mạo hiểm', icon: '🐲', level: 5 },
  { id: 'b_strange', name: 'Huy hiệu kỳ lạ', icon: '🛡️', level: 3 },
  { id: 'b_streak', name: 'Huy hiệu thắng liên tiếp', icon: '🔥', level: 5 },
  { id: 'b_duel', name: 'Huy Hiệu huyễn đấu', icon: '⚔️', level: 5 },
] as const;

const RANK_PLAYERS = [
  { name: 'Bot_Master', guild: 'VN Legends', cups: 13500, lv: 104, hero: 'c134', frame: 8 },
  { name: 'LittleFox', guild: 'VN Legends', cups: 12400, lv: 100, hero: 'c108', frame: 5 },
  { name: 'PuzzleKing', guild: 'Sky Guild', cups: 11200, lv: 97, hero: 'c148', frame: 3 },
] as const;

const TREASURE_CELLS = [
  { label: 'Skin Đảo', icon: './assets/ui/item/icon_ssr_select_spirit01.png' },
  { label: '2 Thẻ SR', icon: './assets/ui/item/icon_sr_card01.png' },
  { label: '500 Vàng', icon: './assets/ui/item/icon_golds01.png' },
  { label: '1 Thẻ UR', icon: './assets/ui/item/icon_ssr_card01.png' },
  { label: '1000 Vàng', icon: './assets/ui/item/icon_golds01.png' },
  { label: '5 Thẻ R', icon: './assets/ui/item/icon_r_card01.png' },
  { label: '50 💎', icon: './assets/ui/item/icon_diamonds01.png' },
  { label: '1 Hòm', icon: './assets/ui/item/icon_box5.png' },
  { label: '10 Thẻ N', icon: './assets/ui/item/icon_n_card01.png' },
  { label: 'Thẻ Chọn', icon: './assets/ui/item/icon_ssr_select_card01.png' },
  { label: '100 💎', icon: './assets/ui/item/icon_diamonds01.png' },
  { label: '500 Quả', icon: './assets/ui/item/icon_food01.png' },
] as const;

const DAILY_LOGIN_14 = [
  { day: 1, reward: '500 Vàng', icon: './assets/ui/item/icon_golds01.png', diamonds: 0, gold: 500 },
  { day: 2, reward: '1 Tinh Hoa', icon: './assets/ui/item/icon_ssr_select_spirit01.png', diamonds: 30, gold: 0 },
  { day: 3, reward: '50 💎', icon: './assets/ui/item/icon_diamonds01.png', diamonds: 50, gold: 0 },
  { day: 4, reward: '1000 Vàng', icon: './assets/ui/item/icon_golds01.png', diamonds: 0, gold: 1000 },
  { day: 5, reward: '3 Dâu', icon: './assets/ui/item/tf0001.png', diamonds: 20, gold: 200 },
  { day: 6, reward: '100 💎', icon: './assets/ui/item/icon_diamonds01.png', diamonds: 100, gold: 0 },
  { day: 7, reward: '2 Tinh Hoa', icon: './assets/ui/item/icon_ssr_select_spirit01.png', diamonds: 60, gold: 0 },
] as const;

export function ApkModals({
  modal,
  profile,
  onClose,
  onSwitchModal,
  onUpdateProfile,
  onSummon,
}: ApkModalsProps) {
  const [infoTab, setInfoTab] = useState<'common' | 'stats' | 'wall'>('common');
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState(profile.playerName ?? 'TestVIP999');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarTab, setAvatarTab] = useState<'avatar' | 'frame'>('avatar');
  const [badgeDetail, setBadgeDetail] = useState<(typeof BADGE_CATALOG)[number] | null>(null);

  const [rankTab, setRankTab] = useState<'player' | 'guild'>('player');
  const [rankScope, setRankScope] = useState<'world' | 'local'>('world');

  const [socialTab, setSocialTab] = useState<'world' | 'guild' | 'friends'>('world');
  const [chatMsg, setChatMsg] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ who: string; text: string }>>([
    { who: 'Bot_Master', text: 'Server test offline sẵn sàng!' },
    { who: 'LittleFox', text: 'Ai lập phòng 2P giao lưu không?' },
  ]);

  const [privTab, setPrivTab] = useState<'pass' | 'month'>('pass');
  const [actGroup, setActGroup] = useState<'limited' | 'daily'>('daily');
  const [actLimitedTab, setActLimitedTab] = useState<'squad' | 'medal' | 'green'>('green');
  const [actDailyTab, setActDailyTab] = useState<'login' | 'signin' | 'chapter' | 'ad'>('login');

  const [summonRulesOpen, setSummonRulesOpen] = useState(false);
  const [summonPulls, setSummonPulls] = useState<SummonPull[] | null>(null);
  const [newcomerPack, setNewcomerPack] = useState<'deer' | 'thunder'>('deer');
  const [treasureHits, setTreasureHits] = useState(0);
  const [treasureActiveIdx, setTreasureActiveIdx] = useState<number | null>(null);
  const [treasureIntroOpen, setTreasureIntroOpen] = useState(false);
  const [treasureSkip, setTreasureSkip] = useState(false);
  const [orbPackCount, setOrbPackCount] = useState(1);
  const [toast, setToast] = useState('');

  if (!modal) return null;

  const avatarId = profile.avatarId ?? 'c101';
  const avatarFrame = profile.avatarFrame ?? 1;
  const flags = profile.claimFlags ?? {};
  const starPower = profile.decorScore + getTeamPower(profile);
  const ownedCount = Object.keys(profile.owned).length;

  const claimRewardOnce = (
    flagKey: string,
    rewards: { gold?: number; diamonds?: number; manaOrbs?: number },
    msg: string,
  ) => {
    if (flags[flagKey]) {
      playSfx('ui-close');
      setToast('Bạn đã nhận phần thưởng này rồi!');
      return;
    }
    playSfx('ui-chest');
    onUpdateProfile((prev) => ({
      ...prev,
      gold: prev.gold + (rewards.gold ?? 0),
      diamonds: prev.diamonds + (rewards.diamonds ?? 0),
      manaOrbs: prev.manaOrbs + (rewards.manaOrbs ?? 0),
      claimFlags: { ...(prev.claimFlags ?? {}), [flagKey]: true },
    }));
    setToast(msg);
  };

  return (
    <div className="modal-backdrop apk-modal-backdrop" onClick={onClose}>
      <div className="apk-modal-shell" onClick={(e) => e.stopPropagation()}>
        {toast && <div className="apk-float-toast">{toast}</div>}

        {/* 1. THÔNG TIN NGƯỜI CHƠI */}
        {modal === 'playerInfo' && (
          <div className="apk-green-modal wide">
            <div className="apk-green-head">
              <h3>Thông tin người chơi</h3>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            <div className="apk-pinfo-top">
              <button
                type="button"
                className="apk-pinfo-avatar-btn"
                onClick={() => {
                  playSfx('ui-popup');
                  setAvatarOpen(true);
                }}
              >
                <LegendSprite legendId={avatarId} variant="head" size={56} />
                <img
                  src={`./assets/ui/frame/img_headframe${String(avatarFrame).padStart(2, '0')}.png`}
                  alt=""
                  draggable={false}
                  className="apk-pinfo-frame"
                />
              </button>

              <div className="apk-pinfo-meta">
                <div className="apk-pinfo-row">
                  <span className="apk-lv-wing">🦋 {profile.playerLevel}</span>
                  <strong>{profile.playerName ?? 'TestVIP999'}</strong>
                  <button
                    type="button"
                    className="apk-mini-edit-btn"
                    onClick={() => {
                      setNameInput(profile.playerName ?? 'TestVIP999');
                      setEditNameOpen(true);
                    }}
                    title="Đổi tên"
                  >
                    ✎
                  </button>
                </div>
                <div className="apk-pinfo-row sub">
                  <span>🏆 {profile.trophies}</span>
                  <span>⭐ {starPower}</span>
                  <span>🆔 10001</span>
                </div>
                <div className="apk-pinfo-row sub">
                  <span>🔥 VN Legends</span>
                </div>
              </div>
            </div>

            <div className="apk-pinfo-tabs">
              {(
                [
                  { id: 'common', label: 'Thường thấy' },
                  { id: 'stats', label: 'Thống kê' },
                  { id: 'wall', label: 'Tường huy hiệu' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={infoTab === t.id ? 'active' : ''}
                  onClick={() => {
                    playSfx('ui-click');
                    setInfoTab(t.id);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {infoTab === 'common' && (
              <div className="apk-pinfo-body">
                <div className="apk-sec-divider">✦ Đội xuất chiến ✦</div>
                <div className="apk-lineup-heads-row">
                  {profile.lineup.map((id, i) => {
                    const ow = id ? profile.owned[id] : null;
                    return (
                      <div key={i} className="apk-head-lv-item">
                        {id ? (
                          <>
                            <LegendSprite legendId={id} variant="head" size={44} />
                            <b>Lv.{ow?.level ?? 1}</b>
                          </>
                        ) : (
                          <div className="apk-empty-head">?</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="apk-sec-divider">✦ Huy chương giải đấu ✦</div>
                <div className="apk-badges-grid">
                  {BADGE_CATALOG.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className="apk-badge-slot"
                      onClick={() => {
                        playSfx('ui-popup');
                        setBadgeDetail(b);
                      }}
                    >
                      <span className="apk-badge-ico">{b.icon}</span>
                      <small>{'♦'.repeat(b.level)}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {infoTab === 'stats' && (
              <div className="apk-stats-rows">
                <div><span>Số lần thắng</span><strong>{profile.winsTotal ?? 8}</strong></div>
                <div><span>Tổng số sao</span><strong>{starPower}</strong></div>
                <div><span>Lịch sử cúp cao nhất</span><strong>{Math.max(profile.trophies, 12000)}</strong></div>
                <div><span>Tinh Linh được tìm thấy</span><strong>{ownedCount}</strong></div>
                <div><span>Số lần trợ giúp LM</span><strong>{profile.winStreak ?? 3}</strong></div>
              </div>
            )}

            {infoTab === 'wall' && (
              <div className="apk-pinfo-body center">
                <div className="apk-sec-divider">✦ Hiển thị huy hiệu ✦</div>
                <div className="apk-wall-featured">🛡️ <small>♦♦♦♦♦</small></div>
                <div className="apk-sec-divider">✦ Tường huy hiệu ✦</div>
                <p className="apk-muted-hint">Nhấn vào từng huy chương ở tab Thường thấy để xem chi tiết.</p>
              </div>
            )}

            {editNameOpen && (
              <div className="modal-backdrop" onClick={() => setEditNameOpen(false)}>
                <div className="apk-green-modal small" onClick={(e) => e.stopPropagation()}>
                  <div className="apk-green-head">
                    <h3>Đổi tên</h3>
                    <button type="button" className="apk-x-btn" onClick={() => setEditNameOpen(false)}>✕</button>
                  </div>
                  <div className="apk-rename-body">
                    <input
                      type="text"
                      maxLength={16}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Vui lòng nhập một tên mới"
                      className="apk-rename-input"
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        const clean = nameInput.trim();
                        if (!clean) return;
                        playSfx('ui-upgrade');
                        onUpdateProfile((prev) => ({ ...prev, playerName: clean }));
                        setEditNameOpen(false);
                      }}
                    >
                      Miễn phí
                    </button>
                  </div>
                </div>
              </div>
            )}

            {avatarOpen && (
              <div className="modal-backdrop" onClick={() => setAvatarOpen(false)}>
                <div className="apk-green-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="apk-green-head">
                    <h3>Thay đổi hình đại diện</h3>
                    <button type="button" className="apk-x-btn" onClick={() => setAvatarOpen(false)}>✕</button>
                  </div>
                  <div className="apk-pinfo-tabs">
                    <button type="button" className={avatarTab === 'avatar' ? 'active' : ''} onClick={() => setAvatarTab('avatar')}>Avatar</button>
                    <button type="button" className={avatarTab === 'frame' ? 'active' : ''} onClick={() => setAvatarTab('frame')}>Khung avatar</button>
                  </div>
                  <div className="apk-avatar-picker-grid">
                    {avatarTab === 'avatar'
                      ? LEGENDS.slice(0, 12).map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            className={`apk-av-choice ${avatarId === l.id ? 'selected' : ''}`}
                            onClick={() => {
                              playSfx('ui-equip');
                              onUpdateProfile((prev) => ({ ...prev, avatarId: l.id }));
                            }}
                          >
                            <LegendSprite legendId={l.id} variant="head" size={50} />
                          </button>
                        ))
                      : Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`apk-av-choice ${avatarFrame === num ? 'selected' : ''}`}
                            onClick={() => {
                              playSfx('ui-equip');
                              onUpdateProfile((prev) => ({ ...prev, avatarFrame: num }));
                            }}
                          >
                            <img
                              src={`./assets/ui/frame/img_headframe${String(num).padStart(2, '0')}.png`}
                              width={50}
                              height={50}
                              alt=""
                              draggable={false}
                            />
                          </button>
                        ))}
                  </div>
                </div>
              </div>
            )}

            {badgeDetail && (
              <div className="modal-backdrop" onClick={() => setBadgeDetail(null)}>
                <div className="apk-badge-dark-popup" onClick={(e) => e.stopPropagation()}>
                  <h3>{badgeDetail.name}</h3>
                  <div className="apk-badge-big-ico">{badgeDetail.icon}</div>
                  <p>{'🔶'.repeat(badgeDetail.level)}</p>
                  <button type="button" className="btn-primary" onClick={() => setBadgeDetail(null)}>
                    Xác nhận
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. BẢNG XẾP HẠNG (BXH) */}
        {modal === 'rank' && (
          <div className="apk-rank-fullscreen">
            <button type="button" className="apk-close-corner" onClick={onClose}>✕</button>

            <div className="apk-rank-podium">
              {rankTab === 'player' ? (
                <>
                  <div className="podium-spot p2">
                    <LegendSprite legendId="c108" variant="unit" size={62} />
                    <small>🥈 12400 · LittleFox</small>
                  </div>
                  <div className="podium-spot p1">
                    <LegendSprite legendId="c134" variant="unit" size={76} />
                    <small>👑 13500 · Bot_Master</small>
                  </div>
                  <div className="podium-spot p3">
                    <LegendSprite legendId={avatarId} variant="unit" size={62} />
                    <small>🥉 {profile.trophies} · {profile.playerName ?? 'Bạn'}</small>
                  </div>
                </>
              ) : (
                <>
                  <div className="guild-flag p2"><span>Sky Guild</span><b>85000 🏆</b><small>28/30</small></div>
                  <div className="guild-flag p1"><span>VN Legends</span><b>99999 🏆</b><small>30/30</small></div>
                  <div className="guild-flag p3"><span>Chỗ trống</span><b>—</b></div>
                </>
              )}
            </div>

            <div className="apk-rank-tabs-main">
              <button type="button" className={rankTab === 'player' ? 'active' : ''} onClick={() => setRankTab('player')}>Người chơi</button>
              <button type="button" className={rankTab === 'guild' ? 'active' : ''} onClick={() => setRankTab('guild')}>Liên Minh</button>
            </div>
            <div className="apk-rank-tabs-sub">
              <button type="button" className={rankScope === 'world' ? 'active' : ''} onClick={() => setRankScope('world')}>Thế giới</button>
              <button type="button" className={rankScope === 'local' ? 'active' : ''} onClick={() => setRankScope('local')}>Địa phương</button>
            </div>

            <div className="apk-rank-list">
              {rankTab === 'player' ? (
                <>
                  {[
                    ...RANK_PLAYERS.slice(0, 2),
                    { name: profile.playerName ?? 'Bạn', guild: 'VN Legends', cups: profile.trophies, lv: profile.playerLevel, hero: avatarId, frame: avatarFrame },
                    RANK_PLAYERS[2],
                  ].map((row, idx) => (
                    <div key={row.name} className="apk-rank-row">
                      <span className="rank-num">{idx + 1}</span>
                      <LegendSprite legendId={row.hero} variant="head" size={34} />
                      <div className="rank-info">
                        <strong>🦋{row.lv} {row.name}</strong>
                        <small>{row.guild}</small>
                      </div>
                      <span className="rank-cups">🏆 {row.cups}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="apk-rank-row"><span className="rank-num">1</span><div className="rank-info"><strong>🔥 VN Legends</strong><small>30/30 thành viên</small></div><span className="rank-cups">🏆 99999</span></div>
                  <div className="apk-rank-row"><span className="rank-num">2</span><div className="rank-info"><strong>❄️ Sky Guild</strong><small>28/30 thành viên</small></div><span className="rank-cups">🏆 85000</span></div>
                </>
              )}
            </div>

            <div className="apk-rank-self-footer">
              <span>{rankTab === 'player' ? 'XH của tôi' : 'LM của tôi'}: #3</span>
              <strong>{profile.playerName ?? 'TestVIP999'} · 🏆 {profile.trophies}</strong>
            </div>
          </div>
        )}

        {/* 3. GIAO LƯU (TRÒ CHUYỆN / LIÊN MINH / BẠN BÈ) */}
        {modal === 'social' && (
          <div className="apk-green-modal tall">
            <div className="apk-green-head chat-tabs">
              <button type="button" className={socialTab === 'world' ? 'active' : ''} onClick={() => setSocialTab('world')}>Thế giới</button>
              <button type="button" className={socialTab === 'guild' ? 'active' : ''} onClick={() => setSocialTab('guild')}>Liên Minh</button>
              <button type="button" className={socialTab === 'friends' ? 'active' : ''} onClick={() => setSocialTab('friends')}>Bạn bè (0/100)</button>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            {socialTab === 'world' && (
              <div className="apk-chat-panel">
                <div className="apk-chat-feed">
                  {chatLog.map((m, i) => (
                    <div key={i} className="apk-chat-bubble">
                      <b>{m.who}:</b> <span>{m.text}</span>
                    </div>
                  ))}
                </div>
                <form
                  className="apk-chat-input-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatMsg.trim()) return;
                    playSfx('ui-click');
                    setChatLog((prev) => [...prev, { who: profile.playerName ?? 'Bạn', text: chatMsg.trim() }]);
                    setChatMsg('');
                  }}
                >
                  <input
                    type="text"
                    value={chatMsg}
                    onChange={(e) => setChatMsg(e.target.value)}
                    placeholder="Nhấn để nhập tin nhắn..."
                  />
                  <button type="submit" className="btn-primary">Gửi</button>
                </form>
              </div>
            )}

            {socialTab === 'guild' && (
              <div className="apk-empty-mascot-panel">
                <div className="apk-guild-top-banner">Tham gia liên minh, gặp gỡ bạn bè mới và nhận thể lực miễn phí!</div>
                <LegendSprite legendId="c142" variant="head" size={76} />
                <p>VN Legends đang mở tuyển thành viên mới</p>
                <button type="button" className="btn-primary" onClick={() => setToast('Đã gửi yêu cầu gia nhập VN Legends!')}>Tạo / Gia nhập LM</button>
              </div>
            )}

            {socialTab === 'friends' && (
              <div className="apk-empty-mascot-panel">
                <LegendSprite legendId="c142" variant="head" size={76} />
                <p>Nhanh đi tìm bạn nào</p>
                <div className="apk-btn-row">
                  <button type="button" className="btn-primary" onClick={() => setToast('Không có lời mời kết bạn nào.')}>Danh sách lời mời</button>
                  <button type="button" className="btn-secondary" onClick={() => setToast('Đã gửi lời mời tới Bot_Master!')}>Tìm bạn</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. TRIỆU HỒI TINH LINH */}
        {modal === 'summon' && (
          <div className="apk-summon-portal-modal">
            <div className="apk-summon-topbar">
              <button type="button" className="wheel-rule-btn" onClick={() => setSummonRulesOpen((v) => !v)}>Quy tắc</button>
              <span>💎 {profile.diamonds} · 🪙 {profile.gold}</span>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            <div className="apk-summon-center-orb">
              <img src="./assets/ui/summon/btn_summon01.png" width={120} height={120} alt="" draggable={false} className="bob-anim" />
              <p>Triệu hồi tích luỹ chắc chắn nhận Tinh Linh Truyền Thuyết!</p>
            </div>

            <div className="apk-summon-btn-pair">
              <button
                type="button"
                className="btn-primary"
                disabled={profile.diamonds < 25}
                onClick={() => {
                  const res = onSummon(1, 'diamonds');
                  if (res) {
                    playSfx('ui-summon-open');
                    setSummonPulls(res);
                  }
                }}
              >
                Triệu hồi ×1 (💎25)
              </button>
              <button
                type="button"
                className="apk-purple-btn"
                disabled={profile.diamonds < 180}
                onClick={() => {
                  const res = onSummon(9, 'diamonds');
                  if (res) {
                    playSfx('ui-summon-open');
                    setSummonPulls(res);
                  }
                }}
              >
                Triệu hồi ×9 (💎180)
              </button>
            </div>

            {summonRulesOpen && (
              <div className="apk-summon-rules-box">
                <p>① Dùng Kim Cương hoặc Vàng để triệu hồi Tinh Linh.</p>
                <p>② Triệu hồi 20 lần đảm bảo nhận Tinh Linh Truyền Thuyết!</p>
              </div>
            )}

            {summonPulls && (
              <div className="apk-summon-results-mini">
                {summonPulls.map((p, idx) => (
                  <div key={idx} className="apk-mini-pull-chip">
                    <LegendSprite legendId={p.legendId} variant="head" size={34} />
                    <small>{getLegendDef(p.legendId).name}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. ĐẶC QUYỀN (LỆNH CHIẾN TRỌN ĐỜI & THẺ THÁNG) */}
        {modal === 'privilege' && (
          <div className="apk-privilege-modal">
            <div className="apk-green-head">
              <button type="button" className={privTab === 'pass' ? 'active' : ''} onClick={() => setPrivTab('pass')}>Lệnh Chiến Trọn Đời</button>
              <button type="button" className={privTab === 'month' ? 'active' : ''} onClick={() => setPrivTab('month')}>Thẻ Tháng</button>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            {privTab === 'pass' ? (
              <div className="apk-pass-body">
                <div className="apk-pass-header">
                  <strong>⭐ Cấp Chiến Lệnh: 80</strong>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => claimRewardOnce('pass_quick', { gold: 1500, diamonds: 100 }, 'Nhận nhanh Lệnh Chiến: +1500 Vàng & +100 Kim Cương!')}
                  >
                    Nhận nhanh
                  </button>
                </div>
                <div className="apk-pass-rows">
                  {[
                    { lv: 1, free: '3 Thẻ N', prem: '1 Thẻ UR', key: 'p1', gold: 500 },
                    { lv: 2, free: '500 Vàng', prem: '1500 Vàng', key: 'p2', gold: 1500 },
                    { lv: 5, free: '1 Hòm Lam', prem: '1 Hòm Sử Thi', key: 'p3', gold: 800 },
                  ].map((r) => (
                    <div key={r.lv} className="apk-pass-row">
                      <span>{r.free}</span>
                      <b>Cấp {r.lv}</b>
                      <button type="button" className="btn-secondary" onClick={() => claimRewardOnce(r.key, { gold: r.gold }, `Nhận mốc Cấp ${r.lv}!`)}>
                        {flags[r.key] ? 'Đã nhận' : r.prem}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="apk-month-modal-body">
                <img src="./assets/ui/war_grade/img_monthcardreward01.png" width={110} height={110} alt="" draggable={false} />
                <p>Thông kê thưởng thẻ tháng: <strong>💎 ×3000</strong></p>
                <div className="apk-month-icons">
                  <span>💎 +100/ngày</span>
                  <span>🫐 +1500/ngày</span>
                  <span>🚫 Bỏ quảng cáo</span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => claimRewardOnce('month_trial', { diamonds: 300, manaOrbs: 1500 }, 'Kích hoạt Thẻ Tháng test: +300 Kim Cương & +1500 Quả!')}
                >
                  {flags.month_trial ? 'Đã kích hoạt' : '$4.99 (Nhận thử miễn phí)'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. HOẠT ĐỘNG (HẠN GIỜ & THƯỜNG NGÀY) */}
        {modal === 'activity' && (
          <div className="apk-activity-modal">
            <div className="apk-wood-tabs-top">
              <button type="button" className={actGroup === 'limited' ? 'active' : ''} onClick={() => setActGroup('limited')}>Hoạt động hạn giờ</button>
              <button type="button" className={actGroup === 'daily' ? 'active' : ''} onClick={() => setActGroup('daily')}>Hoạt động thường ngày</button>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            {actGroup === 'daily' ? (
              <>
                <div className="apk-sub-shelf-tabs">
                  <button type="button" className={actDailyTab === 'login' ? 'active' : ''} onClick={() => setActDailyTab('login')}>Đăng nhập hàng ngày</button>
                  <button type="button" className={actDailyTab === 'signin' ? 'active' : ''} onClick={() => setActDailyTab('signin')}>Thưởng Điểm Danh</button>
                  <button type="button" className={actDailyTab === 'chapter' ? 'active' : ''} onClick={() => setActDailyTab('chapter')}>Chương khởi hành</button>
                  <button type="button" className={actDailyTab === 'ad' ? 'active' : ''} onClick={() => setActDailyTab('ad')}>Quà tặng quảng cáo</button>
                </div>

                {actDailyTab === 'login' && (
                  <div className="apk-login-14-grid">
                    {DAILY_LOGIN_14.map((d) => (
                      <button
                        key={d.day}
                        type="button"
                        className={`apk-day-tile ${flags[`day_${d.day}`] ? 'claimed' : ''}`}
                        onClick={() => claimRewardOnce(`day_${d.day}`, { gold: d.gold, diamonds: d.diamonds }, `Nhận quà Ngày ${d.day}: ${d.reward}!`)}
                      >
                        <small>Ngày {d.day}</small>
                        <img src={d.icon} width={34} height={34} alt="" draggable={false} />
                        <span>{flags[`day_${d.day}`] ? '✓ Đã nhận' : d.reward}</span>
                      </button>
                    ))}
                  </div>
                )}

                {actDailyTab === 'signin' && (
                  <div className="apk-act-card-body">
                    <h4>🐾 Lộ trình Điểm Danh 7 Ngày</h4>
                    <p>Hoàn thành đủ 7 mốc để nhận <strong>1 Hòm Sử Thi Hoàng Kim</strong>!</p>
                    <button type="button" className="btn-primary" onClick={() => claimRewardOnce('signin_today', { diamonds: 50, manaOrbs: 200 }, 'Điểm danh thành công: +50 Kim Cương & +200 Quả!')}>
                      {flags.signin_today ? '✓ Hôm nay đã điểm danh' : 'Điểm danh hôm nay'}
                    </button>
                  </div>
                )}

                {actDailyTab === 'chapter' && (
                  <div className="apk-act-card-body">
                    <h4>📜 Chương 5 · Khởi Hành</h4>
                    <p>Phần thưởng mốc hiện tại: <strong>10 Tinh Hoa Sinh Mệnh</strong></p>
                    <button type="button" className="btn-primary" onClick={() => claimRewardOnce('chapter_5', { diamonds: 100, gold: 500 }, 'Nhận thưởng Chương 5: +100 💎 & +500 Vàng!')}>
                      {flags.chapter_5 ? '✓ Đã nhận Chương 5' : 'Nhận thưởng Chương 5'}
                    </button>
                  </div>
                )}

                {actDailyTab === 'ad' && (
                  <div className="apk-act-card-body">
                    <h4>📺 Xem quảng cáo nhận Hòm (7 Ngày)</h4>
                    <p>Mốc Ngày 1 → Ngày 7 tặng Kim Cương, Vé Vòng Quay và Hòm Sử Thi.</p>
                    <button type="button" className="btn-primary" onClick={() => claimRewardOnce('ad_gift_1', { diamonds: 50 }, 'Nhận quà quảng cáo: +50 Kim Cương!')}>
                      {flags.ad_gift_1 ? '✓ Đã nhận hôm nay' : 'Nhận quà ngay'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="apk-sub-shelf-tabs">
                  <button type="button" className={actLimitedTab === 'squad' ? 'active' : ''} onClick={() => setActLimitedTab('squad')}>Tiểu đội mạo hiểm</button>
                  <button type="button" className={actLimitedTab === 'medal' ? 'active' : ''} onClick={() => setActLimitedTab('medal')}>Huy Chương Xung Kích</button>
                  <button type="button" className={actLimitedTab === 'green' ? 'active' : ''} onClick={() => setActLimitedTab('green')}>Điên Cuồng Loại Bỏ</button>
                </div>

                <div className="apk-act-card-body">
                  {actLimitedTab === 'squad' && <p>Sự kiện Tiểu đội mạo hiểm đang diễn ra (còn 2 ngày 23:59) — chiến đấu để nhận Vé quay & Kim Cương.</p>}
                  {actLimitedTab === 'medal' && <p>Thông qua Giải Đấu nhận càng nhiều Huy Chương, xếp hạng BXH càng cao!</p>}
                  {actLimitedTab === 'green' && <p>Loại bỏ càng nhiều Mảnh Màu Lục trong trận đấu để tích điểm đổi thưởng xếp hạng!</p>}
                  <button type="button" className="btn-primary" onClick={() => onSwitchModal('rank')}>Mở BXH</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 7. BÍ CẢNH TẦM TUNG (KÈM XỨ SỞ THẦN TIÊN) */}
        {modal === 'treasure' && (
          <div className="apk-treasure-modal">
            <div className="apk-summon-topbar">
              <button type="button" className="wheel-rule-btn" onClick={() => setTreasureIntroOpen((v) => !v)}>Xứ sở thần tiên</button>
              <strong>🔨 Bí Cảnh Tầm Tung ({treasureHits} lần)</strong>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            {treasureIntroOpen ? (
              <div className="apk-treasure-intro">
                <h4>✨ Nhận Skin Chủ Đề Đảo Thần Tiên ✨</h4>
                <img src="./assets/bg/island-map.jpg" alt="" className="apk-intro-preview" />
                <button type="button" className="btn-primary" onClick={() => setTreasureIntroOpen(false)}>Lập tức đến</button>
              </div>
            ) : (
              <>
                <div className="apk-treasure-board">
                  {TREASURE_CELLS.map((cell, idx) => (
                    <div key={idx} className={`apk-treasure-cell ${treasureActiveIdx === idx ? 'lit' : ''}`}>
                      <img src={cell.icon} width={34} height={34} alt="" draggable={false} />
                      <small>{cell.label}</small>
                    </div>
                  ))}
                </div>

                <div className="apk-treasure-controls">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      const pick = Math.floor(Math.random() * TREASURE_CELLS.length);
                      setTreasureActiveIdx(pick);
                      setTreasureHits((h) => h + 1);
                      playSfx('ui-chest');
                      onUpdateProfile((p) => ({ ...p, diamonds: p.diamonds + 25, gold: p.gold + 150 }));
                      setToast(`Trúng: ${TREASURE_CELLS[pick].label} (+25💎 +150🪙)!`);
                    }}
                  >
                    🔨 Tìm bảo 1 lần
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const pick = Math.floor(Math.random() * TREASURE_CELLS.length);
                      setTreasureActiveIdx(pick);
                      setTreasureHits((h) => h + 5);
                      playSfx('ui-wheel-win');
                      onUpdateProfile((p) => ({ ...p, diamonds: p.diamonds + 120, gold: p.gold + 600 }));
                      setToast(`Tìm bảo ×5 trúng lớn: ${TREASURE_CELLS[pick].label} (+120💎 +600🪙)!`);
                    }}
                  >
                    🔨 Tìm bảo 5 lần
                  </button>
                  <label className="apk-skip-check">
                    <input type="checkbox" checked={treasureSkip} onChange={(e) => setTreasureSkip(e.target.checked)} />
                    <span>Skip</span>
                  </label>
                </div>

                <div className="apk-treasure-milestones">
                  {[10, 20, 40, 70, 100].map((m) => (
                    <span key={m} className={treasureHits >= m ? 'reached' : ''}>🔨 {m} lần</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 8. GÓI TÂN THỦ */}
        {modal === 'newcomer' && (
          <div className="apk-newcomer-modal">
            <div className="apk-summon-topbar">
              <div className="apk-pinfo-tabs" style={{ margin: 0 }}>
                <button type="button" className={newcomerPack === 'deer' ? 'active' : ''} onClick={() => setNewcomerPack('deer')}>Tiên Tri My Lộc</button>
                <button type="button" className={newcomerPack === 'thunder' ? 'active' : ''} onClick={() => setNewcomerPack('thunder')}>Lãnh Chủ Lôi Đình</button>
              </div>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            {newcomerPack === 'deer' ? (
              <div className="apk-newcomer-body">
                <LegendSprite legendId="c133" variant="splash" size={140} className="bob-anim" />
                <h3>Gói Tiên Tri My Lộc (3 Ngày)</h3>
                <div className="apk-3days-row">
                  <div className="apk-day-box"><span>Ngày 1</span><b>3 Thẻ + 1000🪙</b></div>
                  <div className="apk-day-box"><span>Ngày 2</span><b>3 Tinh Hoa + 1000🪙</b></div>
                  <div className="apk-day-box"><span>Ngày 3</span><b>3 Dâu + 1000🪙</b></div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => claimRewardOnce('newcomer_deer', { gold: 1000, diamonds: 100 }, 'Nhận Gói Tiên Tri My Lộc: +1000 Vàng & +100 Kim Cương!')}
                >
                  {flags.newcomer_deer ? 'Đã nhận' : 'Nhận'}
                </button>
              </div>
            ) : (
              <div className="apk-newcomer-body purple">
                <LegendSprite legendId="c146" variant="splash" size={140} className="bob-anim" />
                <h3>Trợ trận Lãnh Chủ Lôi Đình · MYTHIC</h3>
                <p>Mốc miễn phí tặng 1 Vé Vòng Quay + 3 Thẻ Thường & 1000 Vàng.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => claimRewardOnce('newcomer_thunder', { gold: 1000 }, 'Nhận quà Tân Thủ Lôi Đình: +1000 Vàng & +1 Vé quay!')}
                >
                  {flags.newcomer_thunder ? 'Đã nhận' : 'Miễn phí'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 9. MUA QUẢ XANH BẰNG KIM CƯƠNG (+10) */}
        {modal === 'exchangeOrbs' && (
          <div className="apk-green-modal small">
            <div className="apk-green-head">
              <h3>Đổi Hoa Quả Xanh</h3>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>
            <div className="apk-exchange-body">
              <img src="./assets/ui/item/icon_food01.png" width={72} height={72} alt="" draggable={false} />
              <strong>+{orbPackCount * 10} Hoa Quả Xanh</strong>
              <input
                type="range"
                min={1}
                max={20}
                value={orbPackCount}
                onChange={(e) => setOrbPackCount(Number(e.target.value))}
              />
              <button
                type="button"
                className="btn-primary"
                disabled={profile.diamonds < orbPackCount}
                onClick={() => {
                  playSfx('ui-upgrade');
                  onUpdateProfile((p) => ({
                    ...p,
                    diamonds: p.diamonds - orbPackCount,
                    manaOrbs: p.manaOrbs + orbPackCount * 10,
                  }));
                  setToast(`Đã đổi +${orbPackCount * 10} Quả Xanh!`);
                }}
              >
                💎 {orbPackCount}
              </button>
            </div>
          </div>
        )}

        {/* 10. MENU ITEM POPUPS (THÔNG BÁO / HÒM THƯ / KHO KIẾN THỨC / CÀI ĐẶT) */}
        {(modal === 'notice' || modal === 'mail' || modal === 'knowledge' || modal === 'settings') && (
          <div className="apk-green-modal">
            <div className="apk-green-head">
              <h3>
                {modal === 'notice'
                  ? 'Thông báo'
                  : modal === 'mail'
                    ? 'Hòm Thư'
                    : modal === 'knowledge'
                      ? 'Kho kiến thức'
                      : 'Cài đặt'}
              </h3>
              <button type="button" className="apk-x-btn" onClick={onClose}>✕</button>
            </div>

            {modal === 'notice' && (
              <div className="apk-empty-mascot-panel">
                <LegendSprite legendId="c142" variant="head" size={72} />
                <p>Tạm không có thông báo~</p>
              </div>
            )}

            {modal === 'mail' && (
              <div className="apk-empty-mascot-panel">
                <LegendSprite legendId="c142" variant="head" size={72} />
                <p>Quà chào mừng server test vẫn đang chờ nhận!</p>
                <button type="button" className="btn-primary" onClick={() => claimRewardOnce('welcome_mail', { diamonds: 100, gold: 500 }, 'Nhận thư chào mừng: +100💎 & +500🪙!')}>
                  {flags.welcome_mail ? 'Đã nhận quà thư' : 'Nhận quà Hòm Thư'}
                </button>
              </div>
            )}

            {modal === 'knowledge' && (
              <div className="apk-pinfo-body">
                <p>• Ghép 4 viên thẳng hàng tạo <strong>Tia Sét (xoá hàng/cột)</strong> + tặng thêm lượt.</p>
                <p>• Ghép chữ T / L tạo <strong>Bom Bí Ngô 3×3</strong> nổ lan.</p>
                <p>• Ghép 5 viên thẳng hàng tạo <strong>Quả Điện / Cầu Vồng</strong> quét toàn bộ 1 màu.</p>
                <p>• Tối đa <strong>8 điểm Ma Lực</strong> mỗi đội, 4 vòng tính tổng điểm để phân thắng bại!</p>
              </div>
            )}

            {modal === 'settings' && (
              <div className="apk-pinfo-body">
                <div className="apk-stats-rows">
                  <div>
                    <span>Nhạc nền &amp; Hiệu ứng âm thanh</span>
                    <button type="button" className="btn-primary" onClick={() => toggleAudioMuted()}>
                      {isAudioMuted() ? 'Đang Tắt · Bật lại' : 'Đang Bật · Tắt'}
                    </button>
                  </div>
                  <div>
                    <span>Phiên bản Client</span>
                    <strong>(S011_13) V2.1.43</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
