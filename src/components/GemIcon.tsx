import type { GemColor, SpecialKind } from '../game/types.ts';

interface GemIconProps {
  color: GemColor;
  special?: SpecialKind;
  size?: number;
}

const SPECIAL_SUFFIX: Record<SpecialKind, string> = {
  none: '',
  'line-h': '-h',
  'line-v': '-v',
  bomb: '-boom',
  nova: '-nova',
};

export function GemIcon({ color, special = 'none', size = 40 }: GemIconProps) {
  const src = `./assets/gems/${color}${SPECIAL_SUFFIX[special]}.png`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`${color} gem`}
      draggable={false}
      className={`gem-svg ${special !== 'none' ? `gem-special-${special}` : ''}`}
    />
  );
}
