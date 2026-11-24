// WCAG 2.2 AA contrast for every foreground/background token pair the UI uses, in both themes.
// Reads src/theme.css directly, so changing a colour token is checked automatically.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ratio } from './helpers/wcag.js';

// Comments removed first: some mention token names, which would confuse the parser
const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function declarations(selector) {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) return {};
    const block = css.slice(start, css.indexOf('}', start));
    return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

// Every plain ":root {" block, in order (palette, then semantic tokens)
const rootBlocks = [];
for (let i = css.indexOf(':root {'); i >= 0; i = css.indexOf(':root {', i + 1)) {
    const block = css.slice(i, css.indexOf('}', i));
    rootBlocks.push(Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, n, v]) => [n, v.trim()])));
}
const themes = {
    light: Object.assign({}, ...rootBlocks),
    dark: Object.assign({}, ...rootBlocks, declarations(":root[data-theme='dark']")),
};

function resolve(tokens, name, seen = new Set()) {
    const value = tokens[name];
    assert.ok(value, `token --${name} is not defined`);
    const ref = value.match(/^var\(--([\w-]+)\)$/);
    if (!ref) return value;
    assert.ok(!seen.has(name), `circular token --${name}`);
    seen.add(name);
    return resolve(tokens, ref[1], seen);
}

// [foreground, background, minimum]. 4.5 = normal text, 3 = focus rings, borders and fills (1.4.11).
const PAIRS = [
    // Body copy and headings
    ['color-text', 'color-bg', 4.5], ['color-text', 'color-surface', 4.5],
    ['color-heading', 'color-bg', 4.5], ['color-heading', 'color-surface', 4.5],
    ['color-text-muted', 'color-bg', 4.5], ['color-text-muted', 'color-surface', 4.5],
    // Links, ghost buttons and primary buttons
    ['color-action-text', 'color-surface', 4.5], ['color-action-text', 'color-bg', 4.5],
    ['color-action', 'color-surface', 3], ['color-action', 'color-bg', 3],
    ['color-on-action', 'color-action', 4.5], ['color-on-action', 'color-action-hover', 4.5],
    ['color-on-danger', 'color-danger-fg', 4.5],
    // Money and validation text on cards
    ['color-positive', 'color-surface', 4.5], ['color-danger-fg', 'color-surface', 4.5],
    // Status badges and banners
    ['color-success-fg', 'color-success-bg', 4.5], ['color-danger-strong', 'color-danger-bg', 4.5],
    ['color-warning-fg', 'color-warning-bg', 4.5], ['color-info-fg', 'color-info-bg', 4.5],
    ['color-ai-fg', 'color-ai-bg', 4.5], ['color-pending-fg', 'color-pending-bg', 4.5],
    // Navy sidebar and featured cards
    ['color-text-on-dark', 'color-sidebar', 4.5], ['color-text-muted-on-dark', 'color-sidebar', 4.5],
    ['color-text-on-dark', 'color-surface-featured', 4.5], ['color-text-muted-on-dark', 'color-surface-featured', 4.5],
    ['color-positive-on-dark', 'color-surface-featured', 4.5], ['color-danger-on-dark', 'color-surface-featured', 4.5],
    // Non-text: focus rings, form-field edges, amber bars
    ['color-focus', 'color-surface', 3], ['color-focus', 'color-bg', 3], ['color-focus-on-dark', 'color-sidebar', 3],
    ['color-control-border', 'color-surface', 3], ['color-warning-fill', 'color-surface', 3],
];

for (const [theme, tokens] of Object.entries(themes)) {
    test(`${theme} theme meets WCAG AA contrast`, () => {
        const failures = PAIRS
            .map(([fg, bg, min]) => ({ fg, bg, min, value: ratio(resolve(tokens, fg), resolve(tokens, bg)) }))
            .filter(p => p.value < p.min)
            .map(p => `--${p.fg} on --${p.bg}: ${p.value.toFixed(2)} < ${p.min}`);
        assert.deepEqual(failures, []);
    });
}

test('contrast maths matches known values', () => {
    assert.equal(ratio('#000000', '#FFFFFF').toFixed(1), '21.0');
    assert.equal(ratio('#64748B', '#FFFFFF').toFixed(2), '4.76');
});
