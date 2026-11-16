import { useEffect, useState } from 'react';
import { getTeamPower } from '../game/legends.ts';
import { isAudioMuted, playSfx, subscribeMute, toggleAudioMuted } from '../game/sound.ts';
import type { PlayerProfile } from '../game/types.ts';
import { CurrencyIcon } from './GameArt.tsx';
import { LegendSprite } from './LegendSprite.tsx';

export type MenuModalKind = 'notice' | 'mail' | 'knowledge' | 'settings';

interface TopBarProps {
  profile: PlayerProfile;
  mode?: 'lobby' | 'resources';
  onQuickStore?: () => void;
  onOpenExchangeOrbs?: () => void;
  onOpenPlayerInfo?: () => void;
  onOpenMenuModal?: (kind: MenuModalKind) => void;
}

function formatCompact(n: number): string {
  if (n >= 100_000_000) return String(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return String(n);
}

export function TopBar({
  profile,
  mode = 'resources',
  onQuickStore,
  onOpenExchangeOrbs,
  onOpenPlayerInfo,
  onOpenMenuModal,
}: TopBarProps) {
  const [muted, setMuted] = useState(isAudioMuted);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => subscribeMute(setMuted), []);

  const avatarId = profile.avatarId ?? 'c101';
  const frameNum = String(profile.avatarFrame ?? 1).padStart(2, '0');
  const teamStarScore = profile.decorScore + getTeamPower(profile);

  return (
    <header className={`top-bar apk-top-bar mode-${mode}`}>
      {mode === 'lobby' ? (
        <button
          type="button"
          className="apk-lobby-profile-btn"
          onClick={() => {
            playSfx('ui-popup');
            setMenuOpen(false);
            onOpenPlayerInfo?.();
          }}
          title="Thông tin người chơi"
        >
          <div className="apk-avatar-ring">
            <LegendSprite legendId={avatarId} variant="head" size={34} className="apk-avatar-head" />
            <img
              src={`./assets/ui/frame/img_headframe${frameNum}.png`}
              alt=""
              draggable={false}
              className="apk-avatar-frame-overlay"
            />
          </div>
          <div className="apk-lobby-stats-col">
            <span className="apk-stat-mini">
              <img src="./assets/ui/cup.png" width={14} height={14} alt="" draggable={false} />
              <b>{profile.trophies}</b>
            </span>
            <span className="apk-stat-mini">
              <img src="./assets/ui/star-gold.png" width={13} height={13} alt="" draggable={false} />
              <b>{teamStarScore}</b>
            </span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          className="currency-pill apk-cur-pill"
          onClick={onOpenExchangeOrbs ?? onQuickStore}
          title="Mua Quả Xanh"
        >
          <span className="cur-icon-wrap">
            <img src="./assets/ui/item/icon_food01.png" width={20} height={20} alt="" draggable={false} />
            <img src="./assets/ui/btn-plus.png" alt="" className="cur-plus-img" draggable={false} />
          </span>
          <span className="cur-val">{formatCompact(profile.manaOrbs)}</span>
        </button>
      )}

      <div className="currency-row apk-currency-row">
        <button type="button" className="currency-pill apk-cur-pill" onClick={onQuickStore} title="Vàng">
          <span className="cur-icon-wrap">
            <CurrencyIcon kind="gold" size={20} />
            <img src="./assets/ui/btn-plus.png" alt="" className="cur-plus-img" draggable={false} />
          </span>
          <span className="cur-val">{formatCompact(profile.gold)}</span>
        </button>

        <button type="button" className="currency-pill apk-cur-pill" onClick={onQuickStore} title="Kim Cương">
          <span className="cur-icon-wrap">
            <CurrencyIcon kind="diamond" size={20} />
            <img src="./assets/ui/btn-plus.png" alt="" className="cur-plus-img" draggable={false} />
          </span>
          <span className="cur-val">{formatCompact(profile.diamonds)}</span>
        </button>

        {mode === 'lobby' ? (
          <div className="apk-menu-anchor">
            <button
              type="button"
              className="apk-menu-btn"
              onClick={() => {
                playSfx('ui-click');
                setMenuOpen((v) => !v);
              }}
              aria-label="Menu"
            >
              <span className="apk-menu-bars" aria-hidden="true">≡</span>
              <span className="apk-red-dot" />
            </button>

            {menuOpen && (
              <div className="apk-menu-dropdown">
                <button
                  type="button"
                  className="apk-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenMenuModal?.('notice');
                  }}
                >
                  <img src="./assets/ui/menu/icon_announcement01.png" width={20} height={20} alt="" draggable={false} />
                  <span>Thông báo</span>
                </button>
                <button
                  type="button"
                  className="apk-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenMenuModal?.('mail');
                  }}
                >
                  <img src="./assets/ui/menu/icon_mail01.png" width={20} height={20} alt="" draggable={false} />
                  <span>Hòm Thư</span>
                </button>
                <button
                  type="button"
                  className="apk-menu-item has-dot"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenMenuModal?.('knowledge');
                  }}
                >
                  <img src="./assets/ui/menu/icon_knowledge01.png" width={20} height={20} alt="" draggable={false} />
                  <span>Kho kiến thức</span>
                </button>
                <button
                  type="button"
                  className="apk-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenMenuModal?.('settings');
                  }}
                >
                  <img src="./assets/ui/menu/icon_setting01.png" width={20} height={20} alt="" draggable={false} />
                  <span>Cài đặt</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={`sound-toggle-pill ${muted ? 'muted' : ''}`}
            onClick={() => toggleAudioMuted()}
            title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    </header>
  );
}
