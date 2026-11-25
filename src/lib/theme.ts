// The look of the public site that the owner can change from the admin panel: three base colours,
// two typefaces, the shape of buttons and cards, and the logo. Everything else is derived in CSS.

export type FontChoice = { id: string; name: string; stack: string };

// Title fonts are all condensed display faces, so headings keep fitting whichever one is chosen.
export const TITLE_FONTS: FontChoice[] = [
  { id: "barlow", name: "Barlow Condensed", stack: '"Barlow Condensed", Impact, "Arial Narrow", sans-serif' },
  { id: "bebas", name: "Bebas Neue", stack: '"Bebas Neue", Impact, "Arial Narrow", sans-serif' },
  { id: "oswald", name: "Oswald", stack: '"Oswald", Impact, "Arial Narrow", sans-serif' },
  { id: "anton", name: "Anton", stack: '"Anton", Impact, "Arial Narrow", sans-serif' },
  { id: "fjalla", name: "Fjalla One", stack: '"Fjalla One", Impact, "Arial Narrow", sans-serif' },
];

export const BODY_FONTS: FontChoice[] = [
  { id: "dm", name: "DM Sans", stack: '"DM Sans", Arial, sans-serif' },
  { id: "inter", name: "Inter", stack: '"Inter", Arial, sans-serif' },
  { id: "manrope", name: "Manrope", stack: '"Manrope", Arial, sans-serif' },
  { id: "lora", name: "Lora (con serifa)", stack: '"Lora", Georgia, serif' },
];

export const CORNERS = [
  { id: "square", name: "Rectas", button: "0px", card: "0px" },
  { id: "soft", name: "Suaves", button: "8px", card: "10px" },
  { id: "round", name: "Redondas", button: "999px", card: "18px" },
];

export type Theme = {
  accent: string;
  dark: string;
  light: string;
  titleFont: string;
  bodyFont: string;
  corners: string;
  /** Address of an uploaded logo image; empty keeps the scissors emblem. */
  logo: string;
  /** Whether the brand name is written next to the logo. */
  logoText: boolean;
};

export const DEFAULT_THEME: Theme = { accent: "#cfa16b", dark: "#181915", light: "#f3f1ea", titleFont: "barlow", bodyFont: "dm", corners: "square", logo: "", logoText: true };

const HEX = /^#[0-9a-f]{6}$/;
const LOGO = /^\/api\/images\/\d+$/;

/** Turns whatever is stored (or sent by the panel) into a complete, safe theme. Anything invalid falls back to the original. */
export function resolveTheme(saved: unknown): Theme {
  const source = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const color = (value: unknown, fallback: string) => (typeof value === "string" && HEX.test(value.toLowerCase()) ? value.toLowerCase() : fallback);
  const choice = (value: unknown, options: { id: string }[], fallback: string) => (typeof value === "string" && options.some((option) => option.id === value) ? value : fallback);
  const logo = typeof source.logo === "string" && LOGO.test(source.logo) ? source.logo : "";
  return {
    accent: color(source.accent, DEFAULT_THEME.accent),
    dark: color(source.dark, DEFAULT_THEME.dark),
    light: color(source.light, DEFAULT_THEME.light),
    titleFont: choice(source.titleFont, TITLE_FONTS, DEFAULT_THEME.titleFont),
    bodyFont: choice(source.bodyFont, BODY_FONTS, DEFAULT_THEME.bodyFont),
    corners: choice(source.corners, CORNERS, DEFAULT_THEME.corners),
    logo,
    logoText: logo ? source.logoText !== false : true,
  };
}

const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, from 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function fromHsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const part = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, "0");
  return `#${part(0)}${part(8)}${part(4)}`;
}

/** The darker accent used for small text and lines on light backgrounds: same hue, deep enough to read. */
function deepAccent(accent: string, light: string) {
  if (accent === DEFAULT_THEME.accent && light === DEFAULT_THEME.light) return "#a47749";
  const [r, g, b] = channels(accent);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  l *= 0.755;
  let deep = fromHsl((h + 360) % 360, s * 0.753, l);
  while (contrast(deep, light) < 3 && l > 0.08) {
    l -= 0.04;
    deep = fromHsl((h + 360) % 360, s * 0.753, l);
  }
  return deep;
}

/** The CSS variables that carry the theme. Every value comes from a validated colour or a fixed list. */
export function themeVars(theme: Theme): Record<string, string> {
  const corners = CORNERS.find((option) => option.id === theme.corners) ?? CORNERS[0];
  return {
    "--gold": theme.accent,
    "--gold-deep": deepAccent(theme.accent, theme.light),
    "--dark": theme.dark,
    "--paper": theme.light,
    "--font-title": (TITLE_FONTS.find((font) => font.id === theme.titleFont) ?? TITLE_FONTS[0]).stack,
    "--font-body": (BODY_FONTS.find((font) => font.id === theme.bodyFont) ?? BODY_FONTS[0]).stack,
    "--radius-button": corners.button,
    "--radius-card": corners.card,
  };
}

export function themeCss(theme: Theme) {
  return `:root{${Object.entries(themeVars(theme)).map(([name, value]) => `${name}:${value}`).join(";")}}`;
}
