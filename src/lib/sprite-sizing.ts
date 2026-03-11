interface RenderedSize {
  width: number;
  height: number;
}

const DEFAULT_MAX_SPRITE_DIMENSION = 820;
const SPRITE_HEIGHT_USAGE = 0.88;

export function getMaxSpriteDimension(availableSize: RenderedSize | undefined, scale: number) {
  if (!availableSize) {
    return Math.floor(DEFAULT_MAX_SPRITE_DIMENSION / scale);
  }

  return Math.max(
    0,
    Math.floor(Math.min(availableSize.height * SPRITE_HEIGHT_USAGE, DEFAULT_MAX_SPRITE_DIMENSION) / scale),
  );
}
