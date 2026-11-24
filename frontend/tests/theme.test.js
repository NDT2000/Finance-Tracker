import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolveTheme, chartPalette, THEME_KEY } from '../src/theme.js';
import { ratio } from './helpers/wcag.js';

test('a saved choice wins; otherwise the system setting decides', () => {
    assert.equal(resolveTheme(null, false), 'light');
    assert.equal(resolveTheme(null, true), 'dark');
    assert.equal(resolveTheme('dark', false), 'dark');
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('purple', true), 'dark');
});

// public/theme-init.js runs before React (as a file, because the CSP blocks inline scripts) and
// must pick the same theme as resolveTheme, or the page would flash when React takes over.
function runInit({ stored, prefersDark, storageThrows = false }) {
    const html = { dataset: {} };
    const context = {
        localStorage: { getItem: key => { if (storageThrows) throw new Error('blocked'); return key === THEME_KEY ? stored : null; } },
        matchMedia: () => ({ matches: prefersDark }),
        document: { documentElement: html },
    };
    vm.runInNewContext(readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8'), context);
    return html.dataset.theme;
}

test('the first-paint script agrees with resolveTheme', () => {
    for (const stored of [null, 'light', 'dark', 'bogus']) {
        for (const prefersDark of [false, true]) {
            assert.equal(runInit({ stored, prefersDark }), resolveTheme(stored, prefersDark), `${stored}/${prefersDark}`);
        }
    }
    assert.equal(runInit({ storageThrows: true, prefersDark: true }), 'dark');
});

const SURFACE = { light: '#FFFFFF', dark: '#1E293B' };

test('both chart palettes have the same colours, and series stand out from the card (3:1)', () => {
    assert.deepEqual(Object.keys(chartPalette('dark')), Object.keys(chartPalette('light')));
    for (const theme of ['light', 'dark']) {
        const palette = chartPalette(theme);
        // slate marks "Other", which is always labelled with its value in the legend
        for (const name of ['royalBlue', 'emerald', 'teal', 'purple', 'amber', 'danger']) {
            assert.ok(ratio(palette[name], SURFACE[theme]) >= 3, `${theme} ${name}: ${ratio(palette[name], SURFACE[theme]).toFixed(2)}`);
        }
        assert.ok(ratio(palette.axisText, SURFACE[theme]) >= 4.5, `${theme} axis text`);
    }
});
