// Light/dark theme. The colours themselves are CSS tokens in theme.css (switched by data-theme on
// <html>); this file decides which theme applies and holds the chart colours Recharts needs as values.
// public/theme-init.js applies the same choice before React starts, so the page never flashes.

export const THEME_KEY = 'theme';

// A saved choice wins; without one, follow the system setting.
export function resolveTheme(stored, prefersDark) {
    return stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
}

// Chart palette (docs/design-system.md section 17). Dark values are lighter tints of the same hues so
// series keep 3:1 against Navy Slate cards; red stays reserved for negatives and failures.
const PALETTES = {
    light: {
        royalBlue: '#1E3A8A', emerald: '#059669', teal: '#0D9488', purple: '#7C3AED', amber: '#D97706',
        slate: '#94A3B8', danger: '#DC2626', grid: '#E2E8F0', axisText: '#64748B', hover: '#F1F5F9',
    },
    dark: {
        royalBlue: '#60A5FA', emerald: '#34D399', teal: '#2DD4BF', purple: '#A78BFA', amber: '#FBBF24',
        slate: '#64748B', danger: '#F87171', grid: '#334155', axisText: '#94A3B8', hover: '#334155',
    },
};

export const chartPalette = theme => PALETTES[theme] ?? PALETTES.light;

// --- Browser side: current theme as a tiny store that React subscribes to (see useTheme.js) ---

const listeners = new Set();
const systemDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

function readStored() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

export function currentTheme() {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.dataset.theme || resolveTheme(readStored(), systemDark());
}

export function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    // Storage can be blocked (private windows); the choice then lasts until the page reloads
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* not saved */ }
    listeners.forEach(listener => listener());
}

export function subscribeTheme(listener) {
    listeners.add(listener);
    // Follow system changes only while the user hasn't chosen a theme
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystem = () => {
        if (readStored()) return;
        document.documentElement.dataset.theme = resolveTheme(null, media.matches);
        listener();
    };
    media?.addEventListener('change', onSystem);
    return () => {
        listeners.delete(listener);
        media?.removeEventListener('change', onSystem);
    };
}
