import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hero, features, closing } from '../src/pages/landing/landingContent.js';

const publicDir = fileURLToPath(new URL('../public', import.meta.url));

test('hero uses the headline and supporting text from the design spec', () => {
    assert.equal(hero.title, 'Take control of your money. Build a better future.');
    assert.equal(hero.text, 'Track income and expenses, understand spending patterns, forecast your monthly expenses and explore your financial future — all in one place.');
});

test('only the five available features are highlighted, in spec order', () => {
    assert.deepEqual(features.map(f => f.id), ['tracking', 'budgets', 'forecasts', 'imports', 'planning']);
});

test('every screenshot exists and has alt text', () => {
    for (const image of [hero.image, ...features.map(f => f.image).filter(Boolean)]) {
        assert.ok(existsSync(`${publicDir}${image.src}`), `missing ${image.src}`);
        assert.ok(image.alt.length > 20, `alt text too short for ${image.src}`);
        assert.ok(image.width > 0 && image.height > 0);
    }
});

test('no unavailable features or invented claims', () => {
    const copy = JSON.stringify({ hero, features, closing });
    const banned = [/\bAI\b/, /\bchat/i, /assistant/i, /\bRAG\b/, /agent/i, /testimonial/i, /customers?\b/i,
        /trusted by/i, /bank[- ]level/i, /certif/i, /guarantee/i, /\d+\s*%/, /\d+[kKmM]\+/, /\bsave \$/i, /live bank/i];
    for (const pattern of banned) assert.doesNotMatch(copy, pattern);
});
