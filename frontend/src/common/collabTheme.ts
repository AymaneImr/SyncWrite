export type CollaboratorTheme = {
  ring: string;
  dot: string;
  text: string;
  soft: string;
  cursor: string;
  labelBg: string;
};

const BASE_SATURATION = 65;
const BASE_LIGHTNESS = 55;
const DARKER_LIGHTNESS = 45;
const SOFT_ALPHA = 0.18;
const GOLDEN_ANGLE = 137;

function hashUserId(userId: number | string): number {
  const value = String(userId);
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function toHue(hash: number): number {
  return (hash * GOLDEN_ANGLE) % 360;
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function hsla(hue: number, saturation: number, lightness: number, alpha: number): string {
  return `hsl(${hue} ${saturation}% ${lightness}% / ${alpha})`;
}

export function getCollaboratorTheme(userId: number | string): CollaboratorTheme {
  const hue = toHue(hashUserId(userId));
  const base = hsl(hue, BASE_SATURATION, BASE_LIGHTNESS);
  const darker = hsl(hue, BASE_SATURATION, DARKER_LIGHTNESS);
  const soft = hsla(hue, BASE_SATURATION, BASE_LIGHTNESS, SOFT_ALPHA);

  return {
    ring: base,
    dot: darker,
    text: darker,
    soft,
    cursor: base,
    labelBg: darker,
  };
}
