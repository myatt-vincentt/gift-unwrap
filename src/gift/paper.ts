// The wrapping papers: each is a seamless pattern painted in code, with a
// ribbon colour that goes with it. Every new box takes the next paper.
import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

export type Paper = {
  name: string;
  /** The paper's base colour and its pattern colours. */
  base: string;
  ink: string[];
  pattern: "dots" | "stars" | "stripes" | "flakes" | "confetti";
  /** The ribbon and bow. */
  ribbon: string;
};

export const PAPERS: readonly Paper[] = [
  {
    name: "berry",
    base: "#d93a4a",
    ink: ["#fff4ec"],
    pattern: "dots",
    ribbon: "#f0ad1e",
  },
  {
    name: "pine",
    base: "#2f8f5b",
    ink: ["#f6cf5a"],
    pattern: "stars",
    ribbon: "#e2453f",
  },
  {
    name: "candy",
    base: "#fff4ef",
    ink: ["#e5404f"],
    pattern: "stripes",
    ribbon: "#2f9d63",
  },
  {
    name: "frost",
    base: "#3d7fd9",
    ink: ["#ffffff"],
    pattern: "flakes",
    ribbon: "#f4f1ff",
  },
  {
    name: "sugar",
    base: "#f58fb4",
    ink: ["#ffffff", "#ffd45c", "#7fd6ff"],
    pattern: "confetti",
    ribbon: "#ffffff",
  },
];

const SIZE = 512;

/** A tiny repeatable random, so every paper looks the same each time. */
const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

/** Draws `draw` at (x, y) and its copies across the edges, so the tile is seamless. */
const wrapDraw = (
  x: number,
  y: number,
  r: number,
  draw: (x: number, y: number) => void,
) => {
  const shifts = [-SIZE, 0, SIZE];
  shifts.forEach((ox) =>
    shifts.forEach((oy) => {
      const px = x + ox;
      const py = y + oy;
      if (px + r >= 0 && px - r <= SIZE && py + r >= 0 && py - r <= SIZE)
        draw(px, py);
    }),
  );
};

const star = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  turn: number,
) => {
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = turn + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
};

const flake = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  turn: number,
) => {
  c.save();
  c.translate(x, y);
  c.rotate(turn);
  Object.assign(c, { lineCap: "round", lineWidth: r * 0.16 });
  for (let i = 0; i < 6; i += 1) {
    c.rotate(Math.PI / 3);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -r);
    c.moveTo(0, -r * 0.55);
    c.lineTo(r * 0.28, -r * 0.8);
    c.moveTo(0, -r * 0.55);
    c.lineTo(-r * 0.28, -r * 0.8);
    c.stroke();
  }
  c.restore();
};

const paint = (c: CanvasRenderingContext2D, p: Paper) => {
  Object.assign(c, { fillStyle: p.base });
  c.fillRect(0, 0, SIZE, SIZE);
  const rnd = rand(p.name.length * 977 + p.base.charCodeAt(1));
  const [ink0] = p.ink;
  Object.assign(c, { fillStyle: ink0, strokeStyle: ink0 });
  switch (p.pattern) {
    case "dots": {
      // Two offset grids of round dots.
      const step = SIZE / 4;
      for (let i = 0; i < 4; i += 1)
        for (let j = 0; j < 4; j += 1)
          [
            [0, 0],
            [0.5, 0.5],
          ].forEach(([ox, oy]) =>
            wrapDraw((i + ox) * step, (j + oy) * step, 22, (x, y) => {
              c.beginPath();
              c.arc(x, y, 20, 0, Math.PI * 2);
              c.fill();
            }),
          );
      break;
    }
    case "stars": {
      const step = SIZE / 4;
      for (let i = 0; i < 4; i += 1)
        for (let j = 0; j < 4; j += 1) {
          const big = (i + j) % 2 === 0;
          const x = (i + (j % 2) * 0.5) * step;
          const y = j * step;
          const r = big ? 30 : 16;
          const turn = rnd() * 0.6;
          wrapDraw(x, y, r, (px, py) => star(c, px, py, r, turn));
        }
      break;
    }
    case "stripes": {
      // Diagonal candy stripes: 4 periods across the tile, so it wraps.
      const period = SIZE / 4;
      c.save();
      for (let k = -8; k < 8; k += 1) {
        c.beginPath();
        const x0 = k * period;
        c.moveTo(x0, 0);
        c.lineTo(x0 + period * 0.45, 0);
        c.lineTo(x0 + period * 0.45 + SIZE, SIZE);
        c.lineTo(x0 + SIZE, SIZE);
        c.closePath();
        c.fill();
      }
      c.restore();
      break;
    }
    case "flakes": {
      const step = SIZE / 3;
      for (let i = 0; i < 3; i += 1)
        for (let j = 0; j < 3; j += 1) {
          const x = (i + (j % 2) * 0.5) * step + (rnd() - 0.5) * 20;
          const y = (j + 0.5) * step + (rnd() - 0.5) * 20;
          const r = 30 + rnd() * 12;
          const turn = rnd();
          wrapDraw(x, y, r, (px, py) => flake(c, px, py, r, turn));
          // A small dot between flakes.
          wrapDraw(x + step / 2, y + step / 2, 8, (px, py) => {
            c.beginPath();
            c.arc(px, py, 6, 0, Math.PI * 2);
            c.fill();
          });
        }
      break;
    }
    case "confetti": {
      for (let n = 0; n < 70; n += 1) {
        const x = rnd() * SIZE;
        const y = rnd() * SIZE;
        const ink = p.ink[n % p.ink.length];
        const turn = rnd() * Math.PI;
        const round = n % 3 === 0;
        wrapDraw(x, y, 20, (px, py) => {
          c.save();
          Object.assign(c, { fillStyle: ink });
          c.translate(px, py);
          c.rotate(turn);
          if (round) {
            c.beginPath();
            c.arc(0, 0, 8, 0, Math.PI * 2);
            c.fill();
          } else {
            c.beginPath();
            c.roundRect(-14, -5, 28, 10, 5);
            c.fill();
          }
          c.restore();
        });
      }
      break;
    }
    default:
      break;
  }
};

const cache = new Map<string, Texture>();

/** The paper's pattern as a repeating texture (made once per paper). */
export const paperTexture = (p: Paper): Texture => {
  const hit = cache.get(p.name);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const c = canvas.getContext("2d")!;
  paint(c, p);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  cache.set(p.name, tex);
  return tex;
};
