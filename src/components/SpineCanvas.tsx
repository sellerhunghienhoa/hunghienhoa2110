import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js-legacy';
import { TextureAtlas } from '@pixi-spine/base';
import {
  AtlasAttachmentLoader,
  SkeletonBinary,
  Spine,
  type SkeletonData,
} from '@pixi-spine/runtime-3.8';

export const SPINE_HERO_CODE: Record<string, string> = {
  solfox: 'c10901',
  frostkit: 'c10601',
  emberdrake: 'c14501',
  leafcoon: 'c14201',
  petalwisps: 'c12201',
  duskhorn: 'c10701',
  galewing: 'c10501',
  verdawyrm: 'c10301',
  mistfox: 'c15301',
  'wheel-leaf': 'c11501',
  c101: 'c10101',
  c102: 'c10201',
  c115: 'c11501',
};

export const SPINE_HERO_FOLDER: Record<string, string> = {
  c101: 'starter-a',
  c102: 'starter-b',
  c115: 'wheel-leaf',
};

export const SPINE_SKILL_CODE: Record<string, string> = {
  solfox: 's10901',
  frostkit: 's10601',
  emberdrake: 's14501',
  leafcoon: 's14201',
  petalwisps: 's12201',
  duskhorn: 's10701',
  galewing: 's10501',
  verdawyrm: 's10301',
  mistfox: 's15301',
  'wheel-leaf': 's11501',
  c101: 's10901',
  c102: 's10601',
  c115: 's11501',
};

const skeletonCache = new Map<string, Promise<SkeletonData>>();

let sharedRenderer: PIXI.IRenderer | null = null;
function getSharedRenderer(): PIXI.IRenderer | null {
  if (sharedRenderer) return sharedRenderer;
  try {
    sharedRenderer = PIXI.autoDetectRenderer({
      width: 280,
      height: 280,
      backgroundAlpha: 0,
      antialias: true,
      clearBeforeRender: true,
      preserveDrawingBuffer: true,
    });
    // Offscreen shared renderer only blits Spine frames; disable Pixi EventSystem pointer hooks
    (sharedRenderer as unknown as { events?: { destroy?: () => void } }).events?.destroy?.();
    return sharedRenderer;
  } catch {
    return null;
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load Spine texture: ${url}`));
    img.src = url;
  });
}

async function fetchSkeletonData(basePath: string): Promise<SkeletonData> {
  const dir = basePath.slice(0, basePath.lastIndexOf('/'));
  const [atlasText, skelBuf] = await Promise.all([
    fetch(`${basePath}.atlas`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }),
    fetch(`${basePath}.skel`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    }),
  ]);

  // Preload all referenced PNG pages before building TextureAtlas synchronously
  const pageNames = Array.from(
    new Set(
      atlasText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.endsWith('.png')),
    ),
  );
  const pageTextures = new Map<string, PIXI.BaseTexture>();
  await Promise.all(
    pageNames.map(async (pageName) => {
      const img = await loadImageElement(`${dir}/${pageName}`);
      const baseTex = new PIXI.BaseTexture(img);
      pageTextures.set(pageName, baseTex);
    }),
  );

  const atlas = new TextureAtlas(atlasText, (line, cb) => {
    cb((pageTextures.get(line) ?? pageTextures.values().next().value!) as unknown as Parameters<typeof cb>[0]);
  });
  const loader = new AtlasAttachmentLoader(atlas);
  const parser = new SkeletonBinary(loader);
  return parser.readSkeletonData(new Uint8Array(skelBuf));
}

function getSkeletonData(basePath: string): Promise<SkeletonData> {
  let cached = skeletonCache.get(basePath);
  if (!cached) {
    cached = fetchSkeletonData(basePath).catch((err) => {
      skeletonCache.delete(basePath);
      throw err;
    });
    skeletonCache.set(basePath, cached);
  }
  return cached;
}

interface SpineCanvasProps {
  /** Path without extension, e.g. `./assets/spine/legends/solfox/c10901` */
  basePath: string;
  animation?: string;
  loop?: boolean;
  flipped?: boolean;
  size?: number;
  fitPadding?: number;
  fallbackSrc?: string;
  fallbackAlt?: string;
  className?: string;
  onComplete?: () => void;
}

export function SpineCanvas({
  basePath,
  animation = 'stand',
  loop = true,
  flipped = false,
  size = 76,
  fitPadding = 0.84,
  fallbackSrc,
  fallbackAlt = '',
  className = '',
  onComplete,
}: SpineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spineRef = useRef<Spine | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [ready, setReady] = useState(false);

  // Build & animate Spine instance on single shared renderer, blitted into lightweight 2D canvas
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let stage: PIXI.Container | null = null;
    let spine: Spine | null = null;

    setReady(false);

    getSkeletonData(basePath)
      .then((skeletonData) => {
        if (cancelled) return;
        const renderer = getSharedRenderer();
        const target = canvasRef.current;
        if (!renderer || !target) return;

        stage = new PIXI.Container();
        spine = new Spine(skeletonData as unknown as ConstructorParameters<typeof Spine>[0]);
        spineRef.current = spine;
        spine.autoUpdate = false;

        const animToPlay =
          spine.state.hasAnimation(animation)
            ? animation
            : spine.state.hasAnimation('stand')
              ? 'stand'
              : skeletonData.animations[0]?.name;

        if (animToPlay) {
          spine.state.setAnimation(0, animToPlay, loop);
          spine.update(0.016);
        }

        spine.state.addListener({
          complete: () => {
            if (!loop) onCompleteRef.current?.();
          },
        });

        // Compute normalized scale to fit target canvas cleanly
        const bounds = spine.getLocalBounds();
        const bw = Math.max(bounds.width || skeletonData.width || 120, 40);
        const bh = Math.max(bounds.height || skeletonData.height || 120, 40);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pxSize = Math.round(size * dpr);
        target.width = pxSize;
        target.height = pxSize;

        const scale = Math.min((pxSize * fitPadding) / bw, (pxSize * fitPadding) / bh);
        const cx = bounds.x + bw / 2;
        const bottom = bounds.y + bh;

        spine.scale.set(flipped ? -scale : scale, scale);
        spine.position.set(
          pxSize / 2 - (flipped ? -cx * scale : cx * scale),
          pxSize * 0.92 - bottom * scale,
        );
        stage.addChild(spine as unknown as PIXI.DisplayObject);

        const ctx2d = target.getContext('2d');
        if (!ctx2d) return;

        let lastTime = performance.now();
        let markedReady = false;
        const tick = (now: number) => {
          if (cancelled || !spine || !stage) return;
          const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
          lastTime = now;

          spine.update(dt);
          if (renderer.width !== pxSize || renderer.height !== pxSize) {
            renderer.resize(pxSize, pxSize);
          }
          renderer.render(stage);
          ctx2d.clearRect(0, 0, pxSize, pxSize);
          ctx2d.drawImage(renderer.view as unknown as CanvasImageSource, 0, 0, pxSize, pxSize);
          if (!markedReady) {
            markedReady = true;
            setReady(true);
          }

          rafId = window.requestAnimationFrame(tick);
        };
        rafId = window.requestAnimationFrame(tick);
      })
      .catch(() => {
        // Fallback PNG stays visible cleanly when Spine fails/unavailable
      });

    return () => {
      cancelled = true;
      spineRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (stage) stage.destroy({ children: true });
    };
  }, [basePath, size, fitPadding, flipped]);

  // Switch animation live when animation prop changes without rebuilding SkeletonData
  useEffect(() => {
    const spine = spineRef.current;
    if (!spine) return;
    const animName = spine.state.hasAnimation(animation)
      ? animation
      : spine.state.hasAnimation('stand')
        ? 'stand'
        : spine.skeleton.data.animations[0]?.name;
    if (animName && spine.state.getCurrent(0)?.animation?.name !== animName) {
      spine.state.setAnimation(0, animName, loop);
    }
  }, [animation, loop]);

  return (
    <span
      className={`spine-canvas-box ${ready ? 'loaded' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {fallbackSrc && !ready && (
        <img
          src={fallbackSrc}
          width={size}
          height={size}
          alt={fallbackAlt}
          draggable={false}
          className="spine-fallback-img"
          style={flipped ? { transform: 'scaleX(-1)' } : undefined}
        />
      )}
      <canvas
        ref={canvasRef}
        className="spine-canvas-el"
        style={{ width: size, height: size, opacity: ready ? 1 : 0 }}
      />
    </span>
  );
}
