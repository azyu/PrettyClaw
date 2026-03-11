"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type RefObject } from "react";
import type { CharacterConfig, SpriteOverlayPart, SpriteRect } from "@/types";

const BLINK_MIN_DELAY_MS = 2400;
const BLINK_MAX_DELAY_MS = 5600;
const BLINK_FRAME_MS = 75;
const BLINK_SINGLE_FRAME_MS = 120;
const MOUTH_FRAME_MS = 120;
const SHOW_SPRITE_OVERLAYS = false;

interface CharacterSpriteProps {
  character: CharacterConfig;
  isStreaming: boolean;
  availableSize?: RenderedSize;
}

interface RenderedSize {
  width: number;
  height: number;
}

function getMaxSpriteDimension(availableSize: RenderedSize | undefined, scale: number) {
  if (!availableSize) {
    return Math.floor(820 / scale);
  }

  const stageAspectRatio = availableSize.height / Math.max(availableSize.width, 1);
  const widthUsage = stageAspectRatio > 1 ? 0.84 : 0.72;
  const heightUsage = stageAspectRatio > 1 ? 0.72 : 0.88;

  return Math.max(
    0,
    Math.floor(
      Math.min(
        availableSize.width * widthUsage,
        availableSize.height * heightUsage,
        820,
      ) / scale,
    ),
  );
}

function getScaledRectStyle(rect: SpriteRect, sourceWidth: number, sourceHeight: number, renderedSize: RenderedSize) {
  return {
    left: `${(rect.x / sourceWidth) * renderedSize.width}px`,
    top: `${(rect.y / sourceHeight) * renderedSize.height}px`,
    width: `${(rect.width / sourceWidth) * renderedSize.width}px`,
    height: `${(rect.height / sourceHeight) * renderedSize.height}px`,
  };
}

function getBlinkSequence(frames: string[]): string[] {
  if (frames.length <= 1) {
    return frames;
  }

  return [...frames, ...frames.slice(0, -1).reverse()];
}

function getRandomDelay() {
  return Math.floor(Math.random() * (BLINK_MAX_DELAY_MS - BLINK_MIN_DELAY_MS + 1)) + BLINK_MIN_DELAY_MS;
}

function useRenderedSpriteSize(ref: RefObject<HTMLImageElement | null>, key: string) {
  const [size, setSize] = useState<RenderedSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      setSize({ width: 0, height: 0 });
      return;
    }

    const update = () => {
      setSize({
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, key]);

  return { size, setSize };
}

function useBlinkFrame(eyes?: SpriteOverlayPart) {
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    setFrame(null);

    if (!eyes || eyes.frames.length === 0) {
      return;
    }

    let blinkTimeoutId: number | undefined;
    let frameIntervalId: number | undefined;

    const clearTimers = () => {
      if (blinkTimeoutId !== undefined) {
        window.clearTimeout(blinkTimeoutId);
      }
      if (frameIntervalId !== undefined) {
        window.clearInterval(frameIntervalId);
      }
    };

    const scheduleBlink = () => {
      blinkTimeoutId = window.setTimeout(() => {
        const sequence = getBlinkSequence(eyes.frames);

        if (sequence.length === 1) {
          setFrame(sequence[0]);
          blinkTimeoutId = window.setTimeout(() => {
            setFrame(null);
            scheduleBlink();
          }, BLINK_SINGLE_FRAME_MS);
          return;
        }

        let index = 0;
        setFrame(sequence[index]);
        frameIntervalId = window.setInterval(() => {
          index += 1;
          if (index >= sequence.length) {
            if (frameIntervalId !== undefined) {
              window.clearInterval(frameIntervalId);
            }
            setFrame(null);
            scheduleBlink();
            return;
          }

          setFrame(sequence[index]);
        }, BLINK_FRAME_MS);
      }, getRandomDelay());
    };

    scheduleBlink();

    return () => {
      clearTimers();
    };
  }, [eyes]);

  return frame;
}

function useMouthFrame(mouth: SpriteOverlayPart | undefined, isStreaming: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);

    if (!mouth || mouth.frames.length <= 1 || !isStreaming) {
      return;
    }

    let currentIndex = 0;
    const intervalId = window.setInterval(() => {
      currentIndex = currentIndex >= mouth.frames.length - 1 ? 1 : currentIndex + 1;
      setIndex(currentIndex);
    }, MOUTH_FRAME_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isStreaming, mouth]);

  return mouth?.frames[index] ?? null;
}

function OverlayPart({
  part,
  frame,
  sourceWidth,
  sourceHeight,
  renderedSize,
}: {
  part: SpriteOverlayPart;
  frame: string | null;
  sourceWidth: number;
  sourceHeight: number;
  renderedSize: RenderedSize;
}) {
  if (!frame || renderedSize.width === 0 || renderedSize.height === 0) {
    return null;
  }

  return (
    <img
      src={frame}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute select-none"
      draggable={false}
      style={getScaledRectStyle(part.rect, sourceWidth, sourceHeight, renderedSize)}
    />
  );
}

export function CharacterSprite({ character, isStreaming, availableSize }: CharacterSpriteProps) {
  const spriteRef = useRef<HTMLImageElement>(null);
  const { size, setSize } = useRenderedSpriteSize(spriteRef, character.id);
  const eyeFrame = useBlinkFrame(SHOW_SPRITE_OVERLAYS ? character.spriteMeta?.eyes : undefined);
  const mouthFrame = useMouthFrame(
    SHOW_SPRITE_OVERLAYS ? character.spriteMeta?.mouth : undefined,
    isStreaming,
  );
  const scale = character.spriteScale ?? 1;
  const maxSpriteDimension = `${getMaxSpriteDimension(availableSize, scale)}px`;

  return (
    <div
      className="relative"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "bottom center",
      }}
    >
      <img
        ref={spriteRef}
        src={character.sprite}
        alt={character.displayName}
        className="block max-w-none"
        style={{
          width: "auto",
          height: "auto",
          maxWidth: maxSpriteDimension,
          maxHeight: maxSpriteDimension,
          filter: `drop-shadow(0 0 25px ${character.theme.accent}25)`,
        }}
        onLoad={(event) => {
          setSize({
            width: event.currentTarget.offsetWidth,
            height: event.currentTarget.offsetHeight,
          });
        }}
      />
      {SHOW_SPRITE_OVERLAYS && character.spriteMeta && (
        <>
          {character.spriteMeta.eyes && (
            <OverlayPart
              part={character.spriteMeta.eyes}
              frame={eyeFrame}
              sourceWidth={character.spriteMeta.sourceWidth}
              sourceHeight={character.spriteMeta.sourceHeight}
              renderedSize={size}
            />
          )}
          {character.spriteMeta.mouth && (
            <OverlayPart
              part={character.spriteMeta.mouth}
              frame={mouthFrame}
              sourceWidth={character.spriteMeta.sourceWidth}
              sourceHeight={character.spriteMeta.sourceHeight}
              renderedSize={size}
            />
          )}
        </>
      )}
    </div>
  );
}
