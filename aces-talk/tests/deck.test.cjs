const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Element {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.events = {};
    this.style = {};
    this.classList = { add() {} };
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] || null; }
  addEventListener(name, handler) { this.events[name] = handler; }
  appendChild(child) { this.children.push(child); }
  closest() { return this; }
  querySelector(selector) {
    return descendants(this).find(e => (e.className || '').split(' ').includes(selector.slice(1)));
  }
}
function descendants(el) { return el.children.flatMap(child => [child, ...descendants(child)]); }
function click(el, label) {
  const button = descendants(el).find(e => e.textContent === label && e.events.click);
  assert.ok(button, `Missing button: ${label}`);
  button.events.click();
}
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {}, document: { createElement: () => new Element() } });
vm.runInContext(fs.readFileSync(path.join(root, 'data/summary.js'), 'utf8'), context);
// Exercise widget rendering without the presentation navigation or a browser.
const widgetCode = fs.readFileSync(path.join(root, 'deck.js'), 'utf8').split('/* ================= DECK ENGINE')[0];
vm.runInContext(widgetCode + 'globalThis.api = {initTimeline, initMarketShare, initCoefTable, initPositionRadar};})();', context);
const { api, window: { ACES_DASHBOARD_DATA: data } } = context;
const newModels = ['gpt-6-astra', 'claude-fable-5-1'];
for (const model of newModels) {
  const runs = data.coverage.filter(r => r.model === model);
  assert.equal(runs.length, 6);
  assert.ok(runs.every(r => r.reasoning === 'high' && r.choiceSets === 800 && r.selected === 800 && r.categories.length === 8));
  for (const mode of ['ui', 'headless']) {
    const products = data.products.filter(r => r.model === model && r.experiment === 'market_share' && r.modality === mode);
    assert.equal(products.length, 64);
    for (const category of new Set(products.map(r => r.category))) {
      const rows = products.filter(r => r.category === category);
      assert.equal(rows.length, 8);
      assert.ok(Math.abs(rows.reduce((sum, r) => sum + r.share, 0) - 1) < 1e-10);
    }
  }
}
const timeline = new Element();
api.initTimeline(timeline);
assert.match(timeline.innerHTML, /GPT-6 Astra/);
assert.match(timeline.innerHTML, /Claude Fable 5.1/);
assert.match(timeline.innerHTML, /September 3, 2026/);
assert.match(timeline.innerHTML, /September 1, 2026/);
for (const match of timeline.innerHTML.matchAll(/left:([\d.]+)%/g)) {
  assert.ok(Number(match[1]) >= 0 && Number(match[1]) <= 100);
}

const market = new Element();
api.initMarketShare(market);
for (const mode of ['UI (screenshot)', 'Headless (JSON)']) {
  click(market, mode);
  const html = market.children[1].innerHTML;
  assert.equal((html.match(/class="ms-prod"/g) || []).length, 8);
  assert.match(html, /GPT-6 Astra\*/);
  assert.match(html, /Claude Fable 5.1\*/);
  assert.match(html, /0.0%/);
  assert.match(html, /High reasoning/);
  assert.match(html, mode === 'UI (screenshot)' ? /57.0%/ : /65.0%/);
  if (mode === 'Headless (JSON)') assert.match(html, /class="mval">n\/a/);
}

for (const mode of ['UI (screenshot)', 'Headless (JSON)']) {
  const table = new Element();
  table.setAttribute('data-coef-start', '1');
  api.initCoefTable(table);
  click(table, mode);
  for (const prompt of ['Default', 'Ignore position']) {
    click(table, prompt);
    const html = table.children[1].innerHTML;
    const modality = mode === 'UI (screenshot)' ? 'ui' : 'headless';
    const variant = (prompt === 'Default' ? 'def-' : 'ip-') + (modality === 'ui' ? 'ui' : 'hl');
    for (const model of newModels) {
      const rows = data.coefficients.filter(r => r.model === model && r.modality === modality && r.prompt === variant);
      assert.equal(rows.length, modality === 'ui' ? 10 : 13);
      for (const row of rows) {
        assert.ok(html.includes(row.estimate.toFixed(3)), `${model}/${variant}/${row.term}`);
        assert.ok(html.includes('(' + row.stdError.toFixed(3) + ')'));
      }
    }
    assert.match(html, /Choice sets fitted/);
    if (modality === 'ui') assert.match(html, /700 of 800/);
    else assert.doesNotMatch(html, /700 of 800/);
  }

  const radar = new Element();
  api.initPositionRadar(radar);
  click(radar, mode);
  for (const prompt of ['Default', 'Ignore position']) {
    click(radar, prompt);
    const html = radar.children[1].innerHTML;
    assert.equal((html.match(/class="pos-radar-svg"/g) || []).length, 3);
    assert.match(html, /GPT-6 Astra\*/);
    assert.match(html, /Claude Fable 5.1\*/);
    assert.match(html, /12.5% BASELINE/);
    assert.doesNotMatch(html, /NaN|undefined/);
    for (const model of newModels) {
      const label = model === 'gpt-6-astra' ? 'GPT-6 Astra*' : 'Claude Fable 5.1*';
      const values = [...html.matchAll(/<title>([^<]+): ([\d.]+)%<\/title>/g)]
        .filter(m => m[1].startsWith(label)).map(m => Number(m[2]));
      assert.equal(values.length, 8);
      assert.ok(Math.abs(values.reduce((a, b) => a + b, 0) - 100) <= 0.41);
    }
  }
}

const unavailable = new Element();
api.initPositionRadar(unavailable);
click(unavailable, 'Ignore pos + promo');
assert.equal((unavailable.children[1].innerHTML.match(/class="pos-radar-svg"/g) || []).length, 3);
assert.match(unavailable.children[1].innerHTML, /no fitted data/);
assert.doesNotMatch(unavailable.children[1].innerHTML, /pos-radar-line provider-openai/);
console.log('Talk checks passed: 12 new run slices, all products, both interfaces/prompts, coefficients, timelines, and missing-data states.');
