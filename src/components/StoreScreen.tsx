import { useState } from 'react';
import { getLegendDef } from '../game/legends.ts';
import { playSfx } from '../game/sound.ts';
import type { SummonPull } from '../game/storage.ts';
import type { PlayerProfile } from '../game/types.ts';
import { CurrencyIcon } from './GameArt.tsx';
import { LegendSprite } from './LegendSprite.tsx';
import { SpineCanvas } from './SpineCanvas.tsx';

type ShopTab = 'daily' | 'privilege' | 'resource';

interface StoreScreenProps {
  profile: PlayerProfile;
  onSummon: (count: 1 | 9, currency: 'gold' | 'diamonds') => SummonPull[] | null;
  onExchangeOrbsForGold: () => void;
  onOpenWheel: () => void;
  onGrantBonus?: (reward: { gold?: number; diamonds?: number; manaOrbs?: number; label: string }) => void;
  onOpenPrivilege?: () => void;
}

const ROLE_ICON = {
  Active: './assets/ui/skill-active.png',
  Limited: './assets/ui/skill-limited.png',
  Passive: './assets/ui/skill-passive.png',
} as const;

const GEM_PACKS = [
  { id: 'g1', amount: 160, price: '$1.99', icon: './assets/ui/shop_icon/icon_resitem04.png' },
  { id: 'g2', amount: 500, price: '$4.99', icon: './assets/ui/shop_icon/icon_resitem05.png' },
  { id: 'g3', amount: 1200, price: '$9.99', icon: './assets/ui/shop_icon/icon_resitem06.png' },
  { id: 'g4', amount: 2500, price: '$19.99', icon: './assets/ui/shop_icon/icon_resitem07.png' },
  { id: 'g5', amount: 6500, price: '$49.99', icon: './assets/ui/shop_icon/icon_resitem08.png' },
  { id: 'g6', amount: 14000, price: '$99.99', icon: './assets/ui/shop_icon/icon_resitem09.png' },
] as const;

export function StoreScreen({
  profile,
  onSummon,
  onExchangeOrbsForGold,
  onOpenWheel,
  onGrantBonus,
  onOpenPrivilege,
}: StoreScreenProps) {
  const [shopTab, setShopTab] = useState<ShopTab>('daily');
  const [recentPulls, setRecentPulls] = useState<SummonPull[] | null>(null);
  const [notice, setNotice] = useState<string>('');

  const handlePull = (count: 1 | 9, currency: 'gold' | 'diamonds') => {
    const pulls = onSummon(count, currency);
    if (!pulls) {
      playSfx('ui-close');
      setNotice(`Không đủ ${currency === 'gold' ? 'Vàng' : 'Kim Cương'}!`);
      return;
    }
    playSfx('ui-summon-btn');
    setNotice('');
    setRecentPulls(pulls);
  };

  return (
    <section className="screen store-screen apk-store-screen">
      <div className="store-awning-hero">
        <div className="store-canopy-stage">
          <img
            src="./assets/ui/shop/btn_door01.png"
            alt=""
            draggable={false}
            className="shop-portal-door"
          />
          <div className="shop-keeper-spine">
            <LegendSprite legendId="mistfox" size={88} animation="stand" />
          </div>
          <div className="store-awning-title">
            <h2>Cửa Hàng Tinh Linh</h2>
          </div>
        </div>
      </div>

      {/* 3 Tab chuẩn APK: Nổi bật hàng ngày | Shop Đặc Quyền | Shop Tài Nguyên */}
      <div className="apk-shop-tabs">
        {(
          [
            { id: 'daily', label: 'Nổi bật hàng ngày' },
            { id: 'privilege', label: 'Shop Đặc Quyền' },
            { id: 'resource', label: 'Shop Tài Nguyên' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`apk-shop-tab ${shopTab === item.id ? 'active' : ''}`}
            onClick={() => {
              playSfx('ui-click');
              setShopTab(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && <div className="toast-error">{notice}</div>}

      <div className="store-shelves-wrap">
        {shopTab === 'daily' && (
          <>
            <div className="shelf-card featured">
              <div className="pack-head-row">
                <SpineCanvas
                  basePath="./assets/spine/fx/storebox05/icon_storebox05"
                  animation="stand"
                  size={56}
                  fallbackSrc="./assets/ui/chest-legend.png"
                  className="pack-art-icon"
                />
                <div>
                  <span className="shelf-tag gold">TRIỆU HỒI 3×3</span>
                  <h3>Hòm Tinh Linh ×9</h3>
                </div>
              </div>
              <p>Triệu hồi 9 Tinh Linh ngẫu nhiên kèm tỷ lệ mở khoá Thẻ Sử Thi / Mythic.</p>
              <div className="pack-buttons">
                <button
                  type="button"
                  className="btn-primary icon-btn"
                  disabled={profile.diamonds < 180}
                  onClick={() => handlePull(9, 'diamonds')}
                >
                  <CurrencyIcon kind="diamond" size={14} /> 180
                </button>
                <button
                  type="button"
                  className="btn-secondary icon-btn"
                  disabled={profile.gold < 1200}
                  onClick={() => handlePull(9, 'gold')}
                >
                  <CurrencyIcon kind="gold" size={14} /> 1.200
                </button>
              </div>
              <img src="./assets/ui/shop/img_shelf02.png" alt="" draggable={false} className="shelf-plank-bar" />
            </div>

            <div className="shelf-pair-row">
              <div className="shelf-card compact">
                <div className="pack-head-row">
                  <SpineCanvas
                    basePath="./assets/spine/fx/storebox03/icon_storebox03"
                    animation="stand"
                    size={46}
                    fallbackSrc="./assets/ui/chest-rare.png"
                    className="pack-art-icon"
                  />
                  <h3>Triệu hồi ×1</h3>
                </div>
                <div className="pack-buttons">
                  <button
                    type="button"
                    className="btn-primary icon-btn"
                    disabled={profile.diamonds < 25}
                    onClick={() => handlePull(1, 'diamonds')}
                  >
                    <CurrencyIcon kind="diamond" size={13} /> 25
                  </button>
                  <button
                    type="button"
                    className="btn-secondary icon-btn"
                    disabled={profile.gold < 160}
                    onClick={() => handlePull(1, 'gold')}
                  >
                    <CurrencyIcon kind="gold" size={13} /> 160
                  </button>
                </div>
              </div>

              <div className="shelf-card compact">
                <div className="pack-head-row">
                  <img src="./assets/ui/wheel-badge.png" width={36} height={36} alt="" draggable={false} className="pack-art-icon" />
                  <h3>Vòng Quay</h3>
                </div>
                <button type="button" className="btn-primary spin-glossy-btn" onClick={onOpenWheel}>
                  {profile.freeSpins > 0 ? `Quay (${profile.freeSpins})` : 'Mở Quay'}
                </button>
              </div>
            </div>

            <div className="shelf-card compact">
              <div className="pack-head-row">
                <img src="./assets/ui/item/icon_food01.png" width={34} height={34} alt="" draggable={false} />
                <div>
                  <h3>Đổi Hoa Quả Xanh lấy Vàng</h3>
                  <p style={{ margin: 0 }}>200 Quả Xanh → +350 Vàng</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary icon-btn"
                  disabled={profile.manaOrbs < 200}
                  onClick={onExchangeOrbsForGold}
                >
                  Đổi ngay
                </button>
              </div>
            </div>
          </>
        )}

        {shopTab === 'privilege' && (
          <>
            <div className="apk-priv-shelf-card">
              <div className="apk-priv-refresh-row">
                <span className="apk-priv-banner-pill">COMMON · Quà Hàng Ngày</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    playSfx('ui-chest');
                    onGrantBonus?.({ gold: 250, label: 'Nhận +250 Vàng làm mới shop!' });
                    setNotice('Đã nhận quà làm mới +250 Vàng!');
                  }}
                >
                  Refresh đạo cụ
                </button>
              </div>
            </div>

            <div className="apk-month-card-box">
              <div className="apk-month-badge-top">Thẻ Tháng giá trị · x3000 💎</div>
              <div className="apk-month-body">
                <img
                  src="./assets/ui/war_grade/img_monthcardreward01.png"
                  width={90}
                  height={90}
                  alt=""
                  draggable={false}
                />
                <div className="apk-month-perks">
                  <strong>Nhận hàng ngày:</strong>
                  <div className="apk-month-icons">
                    <span><img src="./assets/ui/item/icon_diamonds01.png" width={20} height={20} alt="" /> 100</span>
                    <span><img src="./assets/ui/item/icon_food01.png" width={20} height={20} alt="" /> 1500</span>
                  </div>
                  <small>• Bỏ quảng cáo quay thưởng</small>
                  <small>• Hạn giờ bỏ quảng cáo</small>
                </div>
              </div>
              <button
                type="button"
                className="apk-price-blue-btn"
                onClick={() => {
                  playSfx('ui-diamond');
                  onGrantBonus?.({ diamonds: 300, manaOrbs: 1500, label: 'Thẻ Tháng' });
                  setNotice('Đã kích hoạt Thẻ Tháng test: +300 Kim Cương & +1500 Quả!');
                }}
              >
                $4.99 (Nhận thử miễn phí)
              </button>
            </div>
          </>
        )}

        {shopTab === 'resource' && (
          <>
            <div className="apk-lifetime-box" onClick={onOpenPrivilege}>
              <img src="./assets/ui/war_grade/img_wargradebuy01.png" width={78} height={78} alt="" draggable={false} />
              <div>
                <strong>✦ Lệnh Chiến Trọn Đời ✦</strong>
                <p>Mở khoá một lần, tận hưởng mãi mãi · Thưởng lớn mỗi Giải Đấu</p>
                <span className="apk-lifetime-tag">Hiệu lực cả đời</span>
              </div>
            </div>

            <div className="apk-gem-packs-grid">
              {GEM_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="apk-gem-pack-card"
                  onClick={() => {
                    playSfx('ui-diamond');
                    onGrantBonus?.({ diamonds: pack.amount, label: `Gói ${pack.amount} Kim Cương` });
                    setNotice(`Đã nhận +${pack.amount} Kim Cương (${pack.price})!`);
                  }}
                >
                  <img src={pack.icon} width={58} height={58} alt="" draggable={false} />
                  <span className="apk-pack-amt">💎 {pack.amount}</span>
                  <span className="apk-pack-price">{pack.price}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {recentPulls && (
        <div
          className="summon-fullscreen-overlay"
          onClick={() => {
            playSfx('ui-close');
            setRecentPulls(null);
          }}
        >
          <div className="summon-showcase" onClick={(e) => e.stopPropagation()}>
            <div className="collect-grid">
              {recentPulls.map((pull, idx) => {
                const def = getLegendDef(pull.legendId);
                const isSpotlight = idx === 4 && recentPulls.length === 9;
                return (
                  <div
                    key={`${pull.legendId}-${idx}`}
                    className={`collect-slot ${isSpotlight ? 'spotlight' : ''}`}
                  >
                    {isSpotlight && (
                      <img
                        src="./assets/ui/sunburst-gold.png"
                        alt=""
                        draggable={false}
                        className="sunburst-behind-img"
                      />
                    )}
                    <div className={`collect-card-flush ${isSpotlight ? 'spotlight-card' : ''}`}>
                      {pull.isNew && <span className="new-pill">MỚI</span>}
                      <span className="card-cost-badge small">
                        <img src={ROLE_ICON[def.role]} width={24} height={24} alt="" draggable={false} />
                        {def.role !== 'Passive' && <b>{def.manaCost}</b>}
                      </span>
                      <LegendSprite legendId={def.id} variant="card" size={isSpotlight ? 104 : 92} />
                      <div className="collect-bottom-overlay">
                        <span className="collect-lv">Lv.{pull.newLevel}</span>
                        <img
                          src="./assets/ui/upgrade-arrow.png"
                          width={16}
                          height={16}
                          alt=""
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="wood-arch-banner">
              <img src="./assets/ui/vine-top.png" alt="" draggable={false} className="arch-vine-img" />
              <h3>Nhận Tinh Linh Mới</h3>
              <button
                type="button"
                className="btn-primary spin-glossy-btn"
                onClick={() => {
                  playSfx('ui-chest');
                  setRecentPulls(null);
                }}
              >
                Nhận Tất Cả
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
