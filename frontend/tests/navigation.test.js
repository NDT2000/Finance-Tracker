import test from 'node:test';
import assert from 'node:assert/strict';
import { navigation, redirects, homePath, findPage } from '../src/navigation.js';

const pages = navigation.flatMap(({ items }) => items);

test('every navigation group has at least one page', () => {
    for (const { group, items } of navigation) assert.ok(items.length > 0, `${group} is empty`);
});

test('page paths and labels are unique', () => {
    assert.equal(new Set(pages.map(p => p.to)).size, pages.length);
    assert.equal(new Set(pages.map(p => p.label)).size, pages.length);
});

test('the home page and every redirect target are real pages', () => {
    const paths = new Set(pages.map(p => p.to));
    assert.ok(paths.has(homePath));
    for (const [from, to] of redirects) {
        assert.ok(paths.has(to), `${from} redirects to missing ${to}`);
        assert.ok(!paths.has(from), `${from} is both a page and a redirect`);
    }
});

test('Bank Accounts is a Manage page', () => {
    assert.deepEqual(findPage('/accounts'), { group: 'Manage', item: { to: '/accounts', label: 'Bank Accounts', icon: 'accounts' } });
});

test('findPage matches a page and its sub-paths but not look-alike paths', () => {
    assert.equal(findPage('/planning').item.label, 'Financial Planning');
    assert.equal(findPage('/imports/42').group, 'Data Management');
    assert.equal(findPage('/importsx'), null);
    assert.equal(findPage('/login'), null);
});
