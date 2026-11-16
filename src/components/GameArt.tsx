import type { DecorCatalogItem } from '../game/legends.ts';

const CURRENCY_SPRITE: Record<'orb' | 'gold' | 'diamond' | 'butterfly' | 'power', string> = {
  orb: './assets/ui/orb.png',
  gold: './assets/ui/gold.png',
  diamond: './assets/ui/diamond.png',
  butterfly: './assets/ui/butterfly.png',
  power: './assets/ui/power.png',
};

const NAV_SPRITE: Record<'store' | 'legend' | 'match' | 'tournament' | 'island', [string, string]> = {
  store: ['./assets/ui/pnl_main/icon_shopbtn01.png', './assets/ui/pnl_main/icon_shopbtn02.png'],
  legend: ['./assets/ui/pnl_main/icon_cardbtn01.png', './assets/ui/pnl_main/icon_cardbtn02.png'],
  match: ['./assets/ui/pnl_main/icon_fightbtn01.png', './assets/ui/pnl_main/icon_fightbtn02.png'],
  tournament: ['./assets/ui/pnl_main/icon_grandprixbtn01.png', './assets/ui/pnl_main/icon_grandprixbtn02.png'],
  island: ['./assets/ui/pnl_main/icon_homebtn01.png', './assets/ui/pnl_main/icon_homebtn02.png'],
};

const WHEEL_SPRITE: Record<'orbs' | 'diamonds' | 'gold' | 'shards', string> = {
  orbs: './assets/ui/orb.png',
  diamonds: './assets/ui/diamond.png',
  gold: './assets/ui/gold.png',
  shards: './assets/ui/chest-rare.png',
};

const BUILDING_IDS = new Set([
  'ferris',
  'carousel',
  'spire',
  'fountain',
  'bakery',
  'statue',
  'shrine',
  'mine',
  'grove',
]);

export function CurrencyIcon({
  kind,
  size = 18,
}: {
  kind: 'orb' | 'gold' | 'diamond' | 'butterfly' | 'power' | 'paw';
  size?: number;
}) {
  if (kind === 'paw') {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <ellipse cx="14" cy="18" rx="6.5" ry="5" fill="#f472b6" stroke="#fff" strokeWidth="1.4" />
        <circle cx="7.5" cy="11" r="2.6" fill="#f472b6" stroke="#fff" strokeWidth="1.2" />
        <circle cx="12" cy="8.2" r="2.6" fill="#f472b6" stroke="#fff" strokeWidth="1.2" />
        <circle cx="16.8" cy="8.2" r="2.6" fill="#f472b6" stroke="#fff" strokeWidth="1.2" />
        <circle cx="20.5" cy="11" r="2.6" fill="#f472b6" stroke="#fff" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <img
      src={CURRENCY_SPRITE[kind]}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="ui-sprite-icon"
    />
  );
}

export function NavTabIcon({
  tab,
  active = false,
  size = 30,
}: {
  tab: 'store' | 'legend' | 'match' | 'tournament' | 'island';
  active?: boolean;
  size?: number;
}) {
  const src = NAV_SPRITE[tab][active ? 1 : 0];
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="ui-sprite-icon"
    />
  );
}

export function DecorBuildingSvg({
  decorId,
  size = 54,
}: {
  decorId: DecorCatalogItem['id'] | 'shrine' | 'mine' | 'grove';
  size?: number;
}) {
  const key = BUILDING_IDS.has(decorId) ? decorId : 'ferris';
  return (
    <img
      src={`./assets/buildings/${key}.png`}
      width={size}
      height={size}
      alt={key}
      draggable={false}
      className="ui-sprite-icon building-sprite"
    />
  );
}

export function WheelPrizeIcon({
  kind,
  size = 22,
}: {
  kind: 'orbs' | 'diamonds' | 'gold' | 'shards';
  size?: number;
}) {
  return (
    <img
      src={WHEEL_SPRITE[kind]}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className="ui-sprite-icon"
    />
  );
}
