import React from "react";
// @ts-ignore - framework-free JS helper
import { parseThemeCss } from "../../lib/theme-tokens.js";

type Tokens = Record<string, string>;

let currentTheme = "paper";
const listeners = new Set<() => void>();
const tokenCache: Record<string, Tokens> = {};
const pending: Record<string, boolean> = {};

function notify() {
  listeners.forEach((l) => l());
}

export function setTheme(slug: string) {
  const next = slug || "paper";
  if (next === currentTheme) return;
  currentTheme = next;
  notify();
}

function ensureTokens(slug: string) {
  if (tokenCache[slug] || pending[slug] || typeof fetch === "undefined") return;
  pending[slug] = true;
  fetch(`/assets/css/themes/${slug}.css`)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
    .then((css) => {
      tokenCache[slug] = parseThemeCss(css);
      notify();
    })
    .catch(() => {
      /* offline / missing theme css — leave uncached; fields keep neutral fallback */
    })
    .finally(() => {
      pending[slug] = false;
    });
}

// Returns the parsed tokens for the active theme, or null until first load.
export function useThemeTokens(): Tokens | null {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  const theme = currentTheme;
  React.useEffect(() => {
    ensureTokens(theme);
  }, [theme]);
  return tokenCache[theme] ?? null;
}
