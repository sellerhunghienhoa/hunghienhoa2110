import { getLegendCardPaths, getLegendDef } from '../game/legends.ts';
import { SPINE_HERO_CODE, SPINE_HERO_FOLDER, SpineCanvas } from './SpineCanvas.tsx';

interface LegendSpriteProps {
  legendId: string;
  size?: number;
  flipped?: boolean;
  shielded?: boolean;
  variant?: 'unit' | 'card' | 'head' | 'splash';
  animation?: 'stand' | 'run' | 'win' | 'lost';
  animated?: boolean;
  className?: string;
}

export function LegendSprite({
  legendId,
  size = 68,
  flipped = false,
  shielded = false,
  variant = 'unit',
  animation = 'stand',
  animated = true,
  className = '',
}: LegendSpriteProps) {
  const def = getLegendDef(legendId);
  const paths = getLegendCardPaths(legendId);
  const src =
    legendId === 'wheel-leaf'
      ? `./assets/legends/wheel-leaf-${variant === 'splash' ? 'card' : variant}.png`
      : variant === 'unit'
        ? paths.splash
        : paths[variant];

  const spineCode = variant === 'unit' && animated ? SPINE_HERO_CODE[legendId] : undefined;
  const spineFolder = SPINE_HERO_FOLDER[legendId] ?? legendId;

  const visual = spineCode ? (
    <SpineCanvas
      basePath={`./assets/spine/legends/${spineFolder}/${spineCode}`}
      animation={animation}
      loop
      flipped={flipped}
      size={size}
      fallbackSrc={src}
      fallbackAlt={def.name}
      className={`legend-svg variant-${variant} ${className}`}
    />
  ) : (
    <img
      src={src}
      width={size}
      height={size}
      alt={def.name}
      draggable={false}
      className={`legend-svg variant-${variant} ${variant === 'unit' ? 'bob-anim' : ''} ${className}`}
      style={flipped ? { transform: 'scaleX(-1)' } : undefined}
    />
  );

  if (!shielded) {
    return visual;
  }

  return (
    <span
      className={`legend-sprite-wrap shielded ${className}`}
      style={{ width: size, height: size }}
    >
      {visual}
      <img
        src="./assets/ui/shield.png"
        alt=""
        draggable={false}
        className="legend-shield-badge"
      />
    </span>
  );
}
