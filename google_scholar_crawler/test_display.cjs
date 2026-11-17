const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');

const profile = 'UmPI1h0AAAAJ';
const key = profile + ':abc';
const now = new Date().toISOString();
const old = '2026-01-01T00:00:00Z';
const template = readFileSync(join(__dirname, '../_includes/fetch_google_scholar_stats.html'), 'utf8');
const script = template.replace(/<\/?script>/g, '').replace(/{{ site.google_scholar_id \| jsonify }}/, JSON.stringify(profile))
  .replace(/{% if site.google_scholar_stats_use_cdn %}[\s\S]*?{% else %}/, '').replace(/{% endif %}/, '');

function payload(n, stamp, crossref) {
  return {schema_version: 2, source: 'google_scholar', scholar_id: profile,
    checked_at: now, citedby: null, updated: null,
    publications: {[key]: {author_pub_id: key, num_citations: n, updated: stamp, crossref}}};
}

async function render(data) {
  const paper = {dataset: {scholarId: key}, textContent: 'Citations unavailable'};
  const total = {textContent: 'Citations unavailable'};
  vm.runInNewContext(script, {
    fetch: async () => ({ok: true, json: async () => data}),
    document: {querySelectorAll: () => [paper], getElementById: () => total}
  });
  await new Promise(resolve => setImmediate(resolve));
  return [paper.textContent, total.textContent];
}

test('Scholar wins, including an explicit zero or cached count', async () => {
  const other = {num_citations: 18, updated: now};
  assert.equal((await render(payload(0, now, other)))[0], 'Google Scholar: 0 (' + now.slice(0, 10) + ')');
  const stale = payload(7, old, other);
  assert.equal((await render(stale))[0], 'Google Scholar: 7 (cached, 2026-01-01)');
  stale.checked_at = old; // A successful but abandoned feed.
  assert.equal((await render(stale))[0], 'Google Scholar: 7 (cached, 2026-01-01)');
});

test('fallback is dated, clearly labeled and never used for the profile', async () => {
  const result = await render(payload(null, null, {num_citations: 0, updated: old}));
  assert.deepEqual(result, ['Crossref (fallback): 0 (cached, 2026-01-01)', 'Google Scholar citations unavailable']);
  assert.equal((await render(payload(null, null, {num_citations: 4, updated: now})))[0],
    'Crossref (fallback): 4 (' + now.slice(0, 10) + ')');
});

test('wrong profile, malformed observations and transport failures show no number', async () => {
  for (const data of [{...payload(8, now), scholar_id: 'other'}, payload(-1, now),
                      payload(false, now), payload(3, 'not a date'), null]) {
    assert.match((await render(data))[0], /unavailable/);
  }
});

test('old live-branch format remains readable but is explicitly cached', async () => {
  const data = {scholar_id: profile, source: 'AUTHOR_PROFILE_PAGE', citedby: 48, updated: old,
    publications: {[key]: {author_pub_id: key, source: 'AUTHOR_PUBLICATION_ENTRY', num_citations: 1}}};
  assert.deepEqual(await render(data), ['Google Scholar: 1 (cached, 2026-01-01)', 'Google Scholar: 48 (cached, 2026-01-01)']);
  data.publications[key].num_citations = 0;
  assert.match((await render(data))[0], /unavailable/);
});
