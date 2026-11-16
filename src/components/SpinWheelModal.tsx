import { useState } from 'react';
import { playSfx } from '../game/sound.ts';
import { WHEEL_SLICES } from '../game/storage.ts';
import type { PlayerProfile } from '../game/types.ts';
import { LegendSprite } from './LegendSprite.tsx';

interface SpinWheelModalProps {
  profile: PlayerProfile;
  onSpin: () => { sliceIndex: number; summary: string } | null;
  onClose: () => void;
  onOpenPrivilege?: () => void;
}

const SLICE_ART: readonly string[] = [
  './assets/ui/item/icon_food01.png',
  './assets/ui/item/icon_r_card01.png',
  './assets/ui/item/icon_diamonds01.png',
  './assets/ui/item/icon_food01.png',
  './assets/ui/item/icon_golds01.png',
  './assets/ui/item/icon_sr_card01.png',
  './assets/ui/item/icon_ssr_select_spirit01.png',
  './assets/ui/item/tf0001.png',
];

const SLICE_LABELS: readonly string[] = [
  '300',
  '1 Mảnh',
  '100',
  '600',
  '500',
  'Thẻ SR',
  'Tinh Hoa',
  '3 Dâu',
];

export function SpinWheelModal({
  profile,
  onSpin,
  onClose,
  onOpenPrivilege,
}: SpinWheelModalProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultText, setResultText] = useState('');
  const [showRules, setShowRules] = useState(false);

  const sliceAngle = 360 / WHEEL_SLICES.length;

  const handleSpin = () => {
    if (spinning) return;
    const outcome = onSpin();
    if (!outcome) {
      playSfx('ui-close');
      setResultText('Không đủ Vàng (cần 180 Vàng hoặc lượt miễn phí)!');
      return;
    }

    setSpinning(true);
    setResultText('');
    const targetSliceCenter = outcome.sliceIndex * sliceAngle + sliceAngle / 2;
    const nextRot = rotation + 360 * 4 + (360 - (rotation % 360)) + (360 - targetSliceCenter);
    setRotation(nextRot);

    window.setTimeout(() => {
      setSpinning(false);
      playSfx('ui-wheel-win');
      setResultText(`Nhận được: ${outcome.summary}`);
    }, 2400);
  };

  const canAfford = profile.freeSpins > 0 || profile.gold >= 180;

  return (
    <div className="wheel-fullscreen-overlay" onClick={() => !spinning && onClose()}>
      <div className="wheel-stage" onClick={(e) => e.stopPropagation()}>
        <div className="wheel-top-actions">
          <button
            type="button"
            className="wheel-rule-btn"
            onClick={() => {
              playSfx('ui-popup');
              setShowRules(true);
            }}
          >
            Quy tắc
          </button>
          <button
            type="button"
            className="wheel-close-btn inline"
            aria-label="Đóng"
            disabled={spinning}
            onClick={onClose}
          >
            <img src="./assets/ui/btn-close.png" width={34} height={34} alt="Đóng" draggable={false} />
          </button>
        </div>

        <div className="wheel-hero-cluster">
          <div className="wheel-guardian-header">
            <img src="./assets/ui/wheel/img_daily_turntale_flower03.png" width={34} height={34} alt="" draggable={false} className="wf-left" />
            <LegendSprite legendId="wheel-leaf" size={124} className="bob-anim" />
            <img src="./assets/ui/wheel/img_daily_turntale_flower03.png" width={34} height={34} alt="" draggable={false} className="wf-right" />
          </div>

          <div className="wheel-wrap">
            <img src="./assets/ui/wheel-rim.png" alt="" draggable={false} className="wheel-rim-img" />
            <div
              className="wheel-disc"
              style={{
                backgroundImage: 'url(./assets/ui/wheel-disc.png)',
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {WHEEL_SLICES.map((slice, idx) => {
                const angle = idx * sliceAngle + sliceAngle / 2;
                return (
                  <div
                    key={slice.id}
                    className="wheel-label"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <img src={SLICE_ART[idx] ?? './assets/ui/item/icon_food01.png'} width={24} height={24} alt="" draggable={false} />
                    <span>{SLICE_LABELS[idx] ?? slice.label}</span>
                  </div>
                );
              })}
            </div>
            <img
              src="./assets/ui/wheel/img_daily_turntale_arrow.png"
              alt=""
              draggable={false}
              className="wheel-center-arrow"
            />
          </div>
        </div>

        {resultText && <div className="wheel-result">{resultText}</div>}

        <div className="wheel-controls-col">
          <button
            type="button"
            className="apk-wheel-spin-btn"
            disabled={spinning || !canAfford}
            onClick={handleSpin}
          >
            <img src="./assets/ui/item/icon_spin0001.png" width={30} height={30} alt="" draggable={false} />
            <div className="apk-wheel-spin-text">
              <strong>{spinning ? 'Đang quay...' : 'Chuyển động'}</strong>
              <small>{profile.freeSpins > 0 ? `${profile.freeSpins} miễn phí` : '180 Vàng'}</small>
            </div>
          </button>

          <div className="apk-wheel-ad-footer">
            <span>Mở khoá thẻ tháng bỏ quảng cáo</span>
            <button
              type="button"
              className="apk-unlock-mini-btn"
              onClick={() => {
                playSfx('ui-click');
                onClose();
                onOpenPrivilege?.();
              }}
            >
              Tiến đến mở khoá
            </button>
          </div>
        </div>

        {showRules && (
          <div className="modal-backdrop" onClick={() => setShowRules(false)}>
            <div className="modal-card apk-green-modal" onClick={(e) => e.stopPropagation()}>
              <div className="apk-green-head">
                <h3>Cách quay</h3>
                <button type="button" className="apk-x-btn" onClick={() => setShowRules(false)}>
                  ✕
                </button>
              </div>
              <div className="apk-modal-body-light">
                <p><strong>1. Bạn có 3 Vòng quay may mắn miễn phí hàng ngày</strong></p>
                <p><strong>2. Cơ hội nhận được Thưởng:</strong></p>
                <ul className="apk-rate-list">
                  <li>Tinh Hoa Sinh Mệnh ×1: 5%</li>
                  <li>Kim Cương ×100: 8%</li>
                  <li>Thẻ Sử Thi Ngẫu Nhiên: 8%</li>
                  <li>Trạng Thái Kích Đấu 30 phút: 10%</li>
                  <li>Hoa Quả ×1000: 8%</li>
                  <li>Hoa Quả ×600: 15%</li>
                  <li>Hoa Quả ×300: 16%</li>
                  <li>Vàng ×500 / Trái Dâu ×3: 30%</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
