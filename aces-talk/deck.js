/* ACES interactive talk — deck engine + data widgets */
(function () {
  'use strict';
  var DATA = window.ACES_DASHBOARD_DATA || {};

  /* ---------------- model metadata ---------------- */
  var MODEL_NAMES = {
    'claude-fable-5-1': 'Claude Fable 5.1',
    'claude-fable-5': 'Claude Fable 5',
    'claude-opus-4-1-20250805': 'Claude Opus 4.1',
    'claude-opus-4-20250514': 'Claude Opus 4',
    'claude-opus-4-5-20251101': 'Claude Opus 4.5',
    'claude-opus-4-8': 'Claude Opus 4.8',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
    'gemini-2.0-flash-001': 'Gemini 2.0 Flash',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-3-flash-preview': 'Gemini 3 Flash',
    'gemini-3-pro-preview': 'Gemini 3 Pro',
    'gpt-4.1-2025-04-14': 'GPT-4.1',
    'gpt-4o-2024-11-20': 'GPT-4o',
    'gpt-5': 'GPT-5',
    'gpt-5.1': 'GPT-5.1',
    'gpt-5.2': 'GPT-5.2',
    'gpt-5.5': 'GPT-5.5',
    'gpt-5.6-sol': 'GPT-5.6 Sol',
    'gpt-6-astra': 'GPT-6 Astra'
  };
  var RELEASE = {
    'gpt-6-astra': '2026-09-03', 'claude-fable-5-1': '2026-09-01',
    'gpt-4o-2024-11-20': '2024-05-13', 'gpt-4.1-2025-04-14': '2025-04-14',
    'gpt-5': '2025-08-07', 'gpt-5.1': '2025-11-12', 'gpt-5.2': '2025-12-11',
    'gpt-5.5': '2026-04-23', 'gpt-5.6-sol': '2026-07-09',
    'claude-sonnet-4-20250514': '2025-05-22', 'claude-opus-4-20250514': '2025-05-22',
    'claude-opus-4-1-20250805': '2025-08-05', 'claude-sonnet-4-5-20250929': '2025-09-29',
    'claude-opus-4-5-20251101': '2025-11-24', 'claude-opus-4-8': '2026-05-28',
    'claude-fable-5': '2026-07-01',
    'gemini-2.0-flash-001': '2025-02-05', 'gemini-2.5-flash': '2025-06-17',
    'gemini-2.5-pro': '2025-06-17', 'gemini-3-flash-preview': '2025-12-17',
    'gemini-3-pro-preview': '2025-11-18'
  };
  var PROVIDERS = ['OpenAI', 'Anthropic', 'Google'];
  var FLAGSHIPS = ['gpt-6-astra', 'claude-fable-5-1', 'gemini-3-pro-preview'];
  var PROVIDER_COLOR = { OpenAI: '#1a1a1a', Anthropic: '#ff7f0e', Google: '#1a73e8' };

  function baseModel(m) { return String(m || '').replace(/__reasoning_.+$/, ''); }
  function reasoningOf(m) {
    var hit = String(m || '').match(/__reasoning_(.+)$/);
    return hit ? hit[1] : '';
  }
  function providerOf(m) {
    var base = baseModel(m);
    if (/^gpt/.test(base)) return 'OpenAI';
    if (/^claude/.test(base)) return 'Anthropic';
    return 'Google';
  }
  function nameOf(m) {
    var base = baseModel(m);
    return (MODEL_NAMES[base] || base) + (reasoningOf(m) === 'high' ? '*' : '');
  }
  function stars(p) {
    if (p == null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function uniq(arr) { return Array.from(new Set(arr)); }
  function sortModels(models) {
    return models.sort(function (a, b) {
      var pa = PROVIDERS.indexOf(providerOf(a)), pb = PROVIDERS.indexOf(providerOf(b));
      if (pa !== pb) return pa - pb;
      var ba = baseModel(a), bb = baseModel(b);
      if ((RELEASE[ba] || '9') !== (RELEASE[bb] || '9')) return (RELEASE[ba] || '9') < (RELEASE[bb] || '9') ? -1 : 1;
      return nameOf(a).localeCompare(nameOf(b));
    });
  }
  function preferredModelKeys(rows) {
    var byBase = {};
    rows.forEach(function (row) {
      var key = row.modelKey || row.model;
      var base = baseModel(key);
      var current = byBase[base];
      if (!current || reasoningOf(key) === 'high' || (reasoningOf(current) === 'low' && reasoningOf(key) !== 'low')) byBase[base] = key;
    });
    return sortModels(Object.keys(byBase).map(function (base) { return byBase[base]; }));
  }
  function preferredKey(models, base) {
    return models.find(function (m) { return baseModel(m) === base && reasoningOf(m) === 'high'; }) ||
      models.find(function (m) { return baseModel(m) === base; });
  }
  function flagshipKeys(models) {
    return FLAGSHIPS.map(function (base) { return preferredKey(models, base); }).filter(Boolean);
  }

  function modelsFor(experiment) {
    return preferredModelKeys((DATA.coverage || []).filter(function (c) { return c.experiment === experiment; }));
  }

  /* ---------------- chip helpers ---------------- */
  function chipRow(models, selected, onToggle, single) {
    var wrap = document.createElement('div');
    wrap.className = 'chip-row';
    models.forEach(function (m) {
      var b = document.createElement('button');
      var prov = providerOf(m).toLowerCase();
      b.className = 'chip provider-' + prov + (selected.indexOf(m) >= 0 ? ' active' : '');
      b.textContent = nameOf(m);
      b.setAttribute('aria-pressed', String(selected.indexOf(m) >= 0));
      b.title = reasoningOf(m) === 'high' ? nameOf(m) + ' uses high reasoning' : nameOf(m);
      b.addEventListener('click', function () { onToggle(m); });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function optionRow(options, labels, current, onPick) {
    var wrap = document.createElement('div');
    wrap.className = 'chip-row';
    options.forEach(function (o, i) {
      var b = document.createElement('button');
      b.className = 'chip' + (o === current ? ' active' : '');
      b.textContent = labels[i] || o;
      b.setAttribute('aria-pressed', String(o === current));
      b.addEventListener('click', function () { onPick(o); });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function controlLine(label, node) {
    var line = document.createElement('div');
    line.className = 'control-line';
    var lab = document.createElement('span');
    lab.className = 'control-label';
    lab.textContent = label;
    line.appendChild(lab);
    line.appendChild(node);
    return line;
  }
  function modelChipsGrouped(container, allModels, state, maxSel, rerender) {
    PROVIDERS.forEach(function (prov) {
      var ms = allModels.filter(function (m) { return providerOf(m) === prov; });
      if (!ms.length) return;
      var line = controlLine(prov.toUpperCase(), chipRow(ms, state.models, function (m) {
        var i = state.models.indexOf(m);
        if (i >= 0) { if (state.models.length > 1) state.models.splice(i, 1); }
        else {
          state.models.push(m);
          while (state.models.length > maxSel) state.models.shift();
        }
        rerender();
      }));
      line.classList.add('model-provider-line');
      line.querySelector('.control-label').classList.add('prov-' + prov.toLowerCase());
      container.appendChild(line);
    });
  }

  /* ============ TIMELINE (dashboard-style: one row per model) ============ */
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function fmtDate(d) {
    var p = d.split('-');
    return MONTHS[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) + ', ' + p[0];
  }
  function initTimeline(el) {
    var models = uniq((DATA.coverage || []).map(function (c) { return c.model; }))
      .filter(function (m) { return RELEASE[m]; })
      .sort(function (a, b) { return RELEASE[a] < RELEASE[b] ? -1 : 1; });
    var t0 = new Date('2024-04-01').getTime(), t1 = new Date('2026-11-01').getTime();
    function pct(d) { return ((new Date(d).getTime() - t0) / (t1 - t0) * 100).toFixed(2); }
    var MARK = { OpenAI: 'sq', Anthropic: 'ci', Google: 'tr' };
    var html = '<div class="tlm"><div class="tlm-axis">';
    ['2024-07-01', '2025-01-01', '2025-07-01', '2026-01-01', '2026-07-01', '2026-10-01'].forEach(function (d) {
      var lbl = MONTHS[parseInt(d.slice(5, 7), 10) - 1].slice(0, 3) + ' ' + d.slice(0, 4);
      html += '<span style="left:' + pct(d) + '%">' + lbl + '</span>';
    });
    html += '</div>';
    models.forEach(function (m) {
      var prov = providerOf(m);
      var flag = FLAGSHIPS.indexOf(m) >= 0;
      html += '<div class="tlm-row"><div class="tlm-label">' +
        '<strong style="color:' + PROVIDER_COLOR[prov] + '">' + esc(nameOf(m)) + '</strong>' +
        '<span>' + prov + ' · ' + fmtDate(RELEASE[m]) + '</span></div>' +
        '<div class="tlm-track"><span class="tlm-mark ' + MARK[prov] + (flag ? ' flag' : '') + '" title="' + esc(nameOf(m)) + ': ' + fmtDate(RELEASE[m]) + '" style="left:' + pct(RELEASE[m]) + '%"></span></div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  /* ================= MARKET SHARE ================= */
  var CAT_LABELS = {
    fitness_watch: 'Fitness watch', iphone_16_pro_cover: 'iPhone 16 Pro cover',
    mousepad: 'Mousepad', office_lamp: 'Office lamp', stapler: 'Stapler',
    toilet_paper: 'Toilet paper', toothpaste: 'Toothpaste', washing_machine: 'Washing machine'
  };
  function initMarketShare(el) {
    var products = (DATA.products || []).filter(function (p) { return p.experiment === 'market_share'; });
    var allModels = preferredModelKeys(products.filter(function (p) { return /^def-/.test(p.prompt); }));
    var state = {
      models: flagshipKeys(allModels),
      modality: 'ui',
      category: 'fitness_watch'
    };
    if (!state.models.length) state.models = allModels.slice(-3);

    var controls = document.createElement('div'); controls.className = 'controls compact-chips';
    var chart = document.createElement('div');
    el.appendChild(controls); el.appendChild(chart);

    function render() {
      var pool = products.filter(function (p) { return p.modality === state.modality && p.prompt === (state.modality === 'ui' ? 'def-ui' : 'def-hl'); });
      controls.innerHTML = '';
      controls.appendChild(controlLine('Interface', optionRow(['ui', 'headless'], ['UI (screenshot)', 'Headless (JSON)'], state.modality, function (value) { state.modality = value; render(); })));
      var cats = ((DATA.categories || {}).market_share || uniq(pool.map(function (p) { return p.category; }))).slice();
      var catLine = controlLine('Category', optionRow(cats, cats.map(function (c) { return CAT_LABELS[c] || c; }), state.category, function (c) { state.category = c; render(); }));
      catLine.classList.add('category-control');
      controls.appendChild(catLine);
      modelChipsGrouped(controls, allModels, state, 3, render);

      /* Build the catalog independently from selected models so zero-share products stay visible. */
      var bySku = {};
      products.filter(function (p) { return p.category === state.category; }).forEach(function (p) {
        var r = bySku[p.sku] = bySku[p.sku] || { name: p.shortName || (p.title || '').slice(0, 40), img: p.imageUrl || '',
          price: p.price, rating: p.rating, reviews: p.ratingCount, shares: {} };
        if (!r.img && p.imageUrl) r.img = p.imageUrl;
      });
      pool.filter(function (p) { return p.category === state.category && state.models.indexOf(p.modelKey || p.model) >= 0; }).forEach(function (p) {
        var key = p.modelKey || p.model;
        var r = bySku[p.sku] = bySku[p.sku] || { name: p.shortName || (p.title || '').slice(0, 40), img: p.imageUrl || '',
          price: p.price, rating: p.rating, reviews: p.ratingCount, shares: {} };
        r.shares[key] = p.share || 0;
      });
      var list = Object.keys(bySku).map(function (k) { return bySku[k]; });
      list.sort(function (a, b) {
        var ma = Math.max.apply(null, state.models.map(function (m) { return a.shares[m] || 0; }));
        var mb = Math.max.apply(null, state.models.map(function (m) { return b.shares[m] || 0; }));
        return mb - ma;
      });
      var html = '<div>';
      list.slice(0, 8).forEach(function (r) {
        html += '<div class="ms-prod">' +
          '<div class="ms-image">' +
          (r.img ? '<img src="' + esc(r.img) + '" alt="' + esc(r.name) + '" loading="eager" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"/><span class="ms-image-fallback" hidden>' + esc(r.name.slice(0, 1)) + '</span>' : '<span class="ms-image-fallback">' + esc(r.name.slice(0, 1)) + '</span>') +
          '</div>' +
          '<div><div class="ms-pname" title="' + esc(r.name) + '">' + esc(r.name) + '</div>' +
          '<div class="ms-pmeta">$' + (r.price != null ? (+r.price).toFixed(2) : '—') + ' &nbsp;·&nbsp; ' +
          (r.rating != null ? (+r.rating).toFixed(1) + ' rating' : '') +
          (r.reviews != null ? ' &nbsp;·&nbsp; ' + Number(r.reviews).toLocaleString() + ' reviews' : '') + '</div></div>' +
          '<div class="ms-blines">';
        state.models.forEach(function (m) {
          var available = Number.isFinite(r.shares[m]);
          var v = available ? r.shares[m] : 0;
          var col = PROVIDER_COLOR[providerOf(m)];
          html += '<div class="ms-bline"><span class="mlabel" style="color:' + col + '">' + esc(nameOf(m)) + '</span>' +
            '<div class="ms-track"><div class="ms-fill" style="width:' + Math.max(0, Math.min(v * 100, 100)).toFixed(1) + '%;background:' + col + '"></div></div>' +
            '<span class="mval">' + (available ? (v * 100).toFixed(1) + '%' : 'n/a') + '</span></div>';
        });
        html += '</div></div>';
      });
      html += '</div><div class="table-note">* High reasoning. Default prompt; n/a = no data for this interface. New models: 100 trials per category.</div>';
      chart.innerHTML = html;
    }
    render();
  }


  /* ================= COEFFICIENT TABLE ================= */
  var TERM_LABELS_UI = [
    ['row_1_dummy', 'Row 1', 'pos'],
    ['col_1_dummy', 'Column 1', 'pos'],
    ['col_2_dummy', 'Column 2', 'pos'],
    ['col_3_dummy', 'Column 3', 'pos'],
    ['sponsored_tag', 'Sponsored Tag', 'tag'],
    ['overall_pick_tag', 'Overall Pick Tag', 'tag'],
    ['scarcity_tag', 'Scarcity Tag', 'tag'],
    ['log_price', 'Price (log)', 'attr'],
    ['rating', 'Rating', 'attr'],
    ['log_rating_count', 'Num. of Reviews (log)', 'attr']
  ];
  var TERM_LABELS_HL = [
    ['position_1_dummy', 'Position 1', 'pos'], ['position_2_dummy', 'Position 2', 'pos'],
    ['position_3_dummy', 'Position 3', 'pos'], ['position_4_dummy', 'Position 4', 'pos'],
    ['position_5_dummy', 'Position 5', 'pos'], ['position_6_dummy', 'Position 6', 'pos'],
    ['position_7_dummy', 'Position 7', 'pos'],
    ['sponsored_tag', 'Sponsored Tag', 'tag'],
    ['overall_pick_tag', 'Overall Pick Tag', 'tag'],
    ['scarcity_tag', 'Scarcity Tag', 'tag'],
    ['log_price', 'Price (log)', 'attr'],
    ['rating', 'Rating', 'attr'],
    ['log_rating_count', 'Num. of Reviews (log)', 'attr']
  ];
  var PROMPTS = {
    ui: [['def-ui', 'Default'], ['ip-ui', 'Ignore position'], ['ip-pp-ui', 'Ignore pos + promo']],
    headless: [['def-hl', 'Default'], ['ip-hl', 'Ignore position']]
  };
  var COEF_STEP_INFO = [
    null,
    { group: 'pos', text: '<strong>Heterogeneous position effect across models.</strong> Traditional monetization levers like product ranking do not apply uniformly.' },
    { group: 'tag', text: '<strong>Promotion effects depend on the model and prompt.</strong> Overall Pick, Sponsored, and Scarcity tags need not have the same effect or statistical significance.' },
    { group: 'attr', text: '<strong>Price, ratings, and review counts carry different weights.</strong> Estimated sensitivities vary across models, prompts, and interfaces.' }
  ];

  function initCoefTable(el) {
    var coefs = DATA.coefficients || [];
    var startStep = parseInt(el.getAttribute('data-coef-start') || '0', 10) || 0;
    var state = { models: FLAGSHIPS.slice(), modality: 'ui', prompt: 'def-ui', step: startStep };
    var allModels = preferredModelKeys(coefs);
    state.models = flagshipKeys(allModels);

    var controls = document.createElement('div'); controls.className = 'controls compact-chips coef-controls';
    var tableWrap = document.createElement('div');
    var below = document.createElement('div');
    el.appendChild(controls); el.appendChild(tableWrap); el.appendChild(below);

    function lookup(model, term) {
      var hit = null;
      coefs.some(function (c) {
        if ((c.modelKey || c.model) === model && c.modality === state.modality && c.prompt === state.prompt && c.term === term) { hit = c; return true; }
        return false;
      });
      return hit;
    }
    function heatCards() {
      var positions = (DATA.positions || []).filter(function (p) {
        return p.category === '__all__' && p.modality === state.modality && p.prompt === state.prompt;
      });
      var html = '<div class="heat-row">';
      state.models.forEach(function (m) {
        var mine = positions.filter(function (p) { return (p.modelKey || p.model) === m; });
        var byPos = {};
        mine.forEach(function (p) { byPos[p.position] = (byPos[p.position] != null) ? (byPos[p.position] + p.share) / 2 : p.share; });
        var n = state.modality === 'ui' ? 8 : 8;
        var vals = []; var max = 0.001;
        for (var i = 1; i <= n; i++) { vals.push(byPos[i] || 0); max = Math.max(max, byPos[i] || 0); }
        if (!mine.length) return;
        html += '<figure class="heat-card" style="margin:0"><div class="heat-grid' + (state.modality === 'headless' ? ' headless' : '') + '">';
        vals.forEach(function (v) {
          var t = v / max;
          var bg = 'rgba(3,79,70,' + (0.06 + 0.85 * t).toFixed(2) + ')';
          var fg = t > 0.55 ? '#fffef6' : '#1a1a1a';
          html += '<span class="heat-cell" style="background:' + bg + ';color:' + fg + '">' + (v * 100).toFixed(1) + '%</span>';
        });
        html += '</div><figcaption>' + esc(nameOf(m)) + '</figcaption></figure>';
      });
      html += '</div><div class="table-note" style="margin-top:3px">Position &ldquo;market shares&rdquo; for an identical product.</div>';
      return html;
    }
    function render() {
      controls.innerHTML = '';
      var setup = document.createElement('div');
      setup.style.cssText = 'display:flex;gap:20px;flex-wrap:wrap';
      setup.appendChild(optionRow(['ui', 'headless'], ['UI (screenshot)', 'Headless (JSON)'], state.modality, function (v) {
        state.modality = v;
        state.prompt = PROMPTS[v][0][0];
        render();
      }));
      setup.appendChild(optionRow(PROMPTS[state.modality].map(function (p) { return p[0]; }), PROMPTS[state.modality].map(function (p) { return p[1]; }), state.prompt, function (v) { state.prompt = v; render(); }));
      controls.appendChild(controlLine('Setup', setup));
      modelChipsGrouped(controls, allModels, state, 3, render);

      var terms = state.modality === 'ui' ? TERM_LABELS_UI : TERM_LABELS_HL;
      var info = COEF_STEP_INFO[Math.min(state.step, COEF_STEP_INFO.length - 1)];
      var html = '<div class="coef-wrap"><table class="coef"><thead><tr><th></th>';
      state.models.forEach(function (m) {
        html += '<th style="color:' + PROVIDER_COLOR[providerOf(m)] + '">' + esc(nameOf(m)) + '</th>';
      });
      html += '</tr></thead><tbody>';
      terms.forEach(function (t) {
        var cls = '';
        if (info && info.group) cls = (t[2] === info.group) ? 'glow' : 'dim';
        html += '<tr class="' + cls + '"><th>' + t[1] + '</th>';
        state.models.forEach(function (m) {
          var c = lookup(m, t[0]);
          if (!c) { html += '<td><span class="se">—</span></td>'; return; }
          html += '<td><span class="est">' + c.estimate.toFixed(3) + stars(c.pValue) +
            ' <span class="se">(' + c.stdError.toFixed(3) + ')</span></span></td>';
        });
        html += '</tr>';
      });
      html += '</tbody><tfoot>';
      [['nChoiceSetsFit', 'Choice sets fitted'], ['nCategoriesFit', 'Categories fitted']].forEach(function (stat) {
        html += '<tr><th>' + stat[1] + '</th>';
        state.models.forEach(function (m) {
          var fit = lookup(m, 'log_price');
          html += '<td>' + (fit && Number.isFinite(fit[stat[0]]) ? Number(fit[stat[0]]).toLocaleString() : 'n/a') + '</td>';
        });
        html += '</tr>';
      });
      html += '</tfoot></table></div>' +
        '<div class="table-note">Conditional logit with product fixed effects. Standard errors in parentheses. Coefficient stars: <em>*p&nbsp;&lt;&nbsp;0.05, **p&nbsp;&lt;&nbsp;0.01, ***p&nbsp;&lt;&nbsp;0.001</em>. Model-name * = high reasoning.</div>';
      if (state.modality === 'ui' && state.models.some(function (m) { return baseModel(m) === 'gpt-6-astra'; })) {
        if (lookup(preferredKey(state.models, 'gpt-6-astra'), 'log_price')) {
          html += '<div class="table-note">GPT-6 Astra: 700 of 800 sets inform the UI fit; office-lamp choices are invariant after product filtering.</div>';
        }
      }
      tableWrap.innerHTML = html;

      var bhtml = '';
      if (info) {
        bhtml += '<div class="coef-finding-row">' +
          '<div class="finding-callout coef-finding-callout"><span class="coef-finding-copy">' + info.text + '</span></div>' +
          '</div>';
      }
      below.innerHTML = bhtml;
    }
    el.closest('.slide').addEventListener('stepchange', function (e) {
      state.step = startStep + e.detail.step; render();
    });
    render();
  }

  /* ================= POSITION RADARS ================= */
  function initPositionRadar(el) {
    var coefs = DATA.coefficients || [];
    var allModels = preferredModelKeys(coefs);
    var state = { models: flagshipKeys(allModels), modality: 'ui', prompt: 'def-ui' };

    PROVIDERS.forEach(function (prov) {
      if (state.models.some(function (m) { return providerOf(m) === prov; })) return;
      var fallback = allModels.find(function (m) { return providerOf(m) === prov; });
      if (fallback) state.models.push(fallback);
    });

    var controls = document.createElement('div');
    controls.className = 'controls compact-chips coef-controls radar-controls';
    var charts = document.createElement('div');
    var takeaway = document.createElement('div');
    takeaway.className = 'finding-callout radar-takeaway';
    el.appendChild(controls); el.appendChild(charts); el.appendChild(takeaway);

    function coefficientMap(model) {
      var map = {};
      coefs.forEach(function (row) {
        if ((row.modelKey || row.model) === model && row.modality === state.modality && row.prompt === state.prompt) {
          map[row.term] = row.estimate;
        }
      });
      return map;
    }

    function estimate(map, term) {
      return Number.isFinite(map[term]) ? map[term] : null;
    }

    function positionUtilities(model) {
      var map = coefficientMap(model);
      var values = [];
      for (var index = 0; index < 8; index++) {
        if (state.modality === 'headless') {
          values.push(index === 7 ? 0 : estimate(map, 'position_' + (index + 1) + '_dummy'));
          continue;
        }
        var row = Math.floor(index / 4) + 1;
        var col = (index % 4) + 1;
        var parts = [];
        if (row === 1) parts.push(estimate(map, 'row_1_dummy'));
        if (col <= 3) parts.push(estimate(map, 'col_' + col + '_dummy'));
        if (parts.some(function (v) { return v == null; })) values.push(null);
        else values.push(parts.reduce(function (sum, v) { return sum + v; }, 0));
      }
      return values;
    }

    function probabilities(model) {
      var utilities = positionUtilities(model);
      if (utilities.some(function (v) { return v == null || !Number.isFinite(v); })) {
        return utilities.map(function () { return null; });
      }
      var max = Math.max.apply(null, utilities);
      var exp = utilities.map(function (v) { return Math.exp(v - max); });
      var total = exp.reduce(function (sum, v) { return sum + v; }, 0);
      return exp.map(function (v) { return v / total; });
    }

    function axisLabel(index) {
      if (state.modality === 'headless') return 'P' + (index + 1);
      return 'R' + (Math.floor(index / 4) + 1) + 'C' + ((index % 4) + 1);
    }

    function angle(index) { return -Math.PI / 2 + (index * 2 * Math.PI) / 8; }
    function point(center, radius, a, scale) {
      return [
        Number((center + Math.cos(a) * radius * scale).toFixed(2)),
        Number((center + Math.sin(a) * radius * scale).toFixed(2))
      ];
    }
    function pointText(center, radius, a, scale) {
      var p = point(center, radius, a, scale);
      return p[0] + ',' + p[1];
    }
    function textAnchor(a) {
      var x = Math.cos(a);
      return x > 0.32 ? 'start' : (x < -0.32 ? 'end' : 'middle');
    }
    function radiusScale(deviation, maxAbs) {
      return Math.max(0.06, Math.min(0.96, 0.5 + (deviation / maxAbs) * 0.44));
    }

    function radarCard(model, maxAbs) {
      var provider = providerOf(model);
      var providerKey = provider.toLowerCase();
      var values = probabilities(model);
      var available = values.some(function (v) { return v != null && Number.isFinite(v); });
      var size = 360, center = 180, radius = 112, labelRadius = 151;
      var baseline = 1 / 8;
      var axes = [];
      for (var i = 0; i < 8; i++) axes.push(angle(i));

      var rings = [-1, -0.5, 0, 0.5, 1].map(function (multiplier) {
        var pts = axes.map(function (a) { return pointText(center, radius, a, radiusScale(multiplier * maxAbs, maxAbs)); }).join(' ');
        return '<polygon class="pos-radar-ring' + (multiplier === 0 ? ' baseline' : '') + '" points="' + pts + '"></polygon>';
      }).join('');

      var axisMarkup = axes.map(function (a, index) {
        var end = point(center, radius, a, 0.97);
        var label = point(center, labelRadius, a, 1);
        return '<line class="pos-radar-axis" x1="' + center + '" y1="' + center + '" x2="' + end[0] + '" y2="' + end[1] + '"></line>' +
          '<text class="pos-radar-axis-label" x="' + label[0] + '" y="' + label[1] + '" text-anchor="' + textAnchor(a) + '">' + esc(axisLabel(index)) + '</text>';
      }).join('');

      var series = '';
      if (available) {
        var points = values.map(function (value, index) {
          return point(center, radius, angle(index), radiusScale(value - baseline, maxAbs));
        });
        var pointString = points.map(function (p) { return p.join(','); }).join(' ');
        var dots = points.map(function (p, index) {
          return '<circle class="pos-radar-dot provider-' + providerKey + '" cx="' + p[0] + '" cy="' + p[1] + '" r="5">' +
            '<title>' + esc(nameOf(model)) + ' - ' + esc(axisLabel(index)) + ': ' + (values[index] * 100).toFixed(1) + '%</title></circle>';
        }).join('');
        series = '<polygon class="pos-radar-area provider-' + providerKey + '" points="' + pointString + '"></polygon>' +
          '<polyline class="pos-radar-line provider-' + providerKey + '" points="' + pointString + ' ' + points[0].join(',') + '"></polyline>' + dots;
      }

      return '<section class="pos-radar-card provider-' + providerKey + '">' +
        '<div class="pos-radar-heading"><span>' + (provider === 'Google' ? 'GEMINI' : provider.toUpperCase()) + '</span><strong>' + esc(nameOf(model)) + '</strong></div>' +
        '<svg class="pos-radar-svg" viewBox="0 0 360 360" role="img" aria-label="' + esc(nameOf(model)) + (available ? ' position effect' : ': no fitted data') + '">' +
          '<g>' + rings + axisMarkup + series + '</g>' +
          '<text class="pos-radar-baseline-label" x="180" y="352" text-anchor="middle">12.5% BASELINE</text>' +
          (!available ? '<text class="pos-radar-baseline-label" x="180" y="190" text-anchor="middle">n/a</text>' : '') + '</svg>' +
        '</section>';
    }

    function render() {
      controls.innerHTML = '';
      var setup = document.createElement('div');
      setup.className = 'radar-setup-options';
      setup.appendChild(optionRow(['ui', 'headless'], ['UI (screenshot)', 'Headless (JSON)'], state.modality, function (value) {
        state.modality = value;
        state.prompt = PROMPTS[value][0][0];
        render();
      }));
      var promptOptions = PROMPTS[state.modality];
      setup.appendChild(optionRow(promptOptions.map(function (p) { return p[0]; }), promptOptions.map(function (p) { return p[1]; }), state.prompt, function (value) {
        state.prompt = value; render();
      }));
      controls.appendChild(controlLine('SETUP', setup));

      PROVIDERS.forEach(function (provider) {
        var providerModels = allModels.filter(function (m) { return providerOf(m) === provider; });
        var line = controlLine(provider.toUpperCase(), chipRow(providerModels, state.models, function (model) {
          state.models = state.models.filter(function (selected) { return providerOf(selected) !== provider; });
          state.models.push(model);
          render();
        }, true));
        line.classList.add('model-provider-line');
        line.querySelector('.control-label').classList.add('prov-' + provider.toLowerCase());
        controls.appendChild(line);
      });

      var selected = PROVIDERS.map(function (provider) {
        return state.models.find(function (model) { return providerOf(model) === provider; });
      }).filter(Boolean);
      var deviations = [];
      selected.forEach(function (m) {
        probabilities(m).forEach(function (v) { if (v != null) deviations.push(Math.abs(v - 0.125)); });
      });
      var maxAbs = Math.max.apply(null, [0.125].concat(deviations));
      charts.innerHTML = '<div class="position-radar-grid">' + selected.map(function (m) { return radarCard(m, maxAbs); }).join('') + '</div>' +
        '<div class="table-note">Pooled MNL position probabilities for identical products; shared radial scale. Dashed ring = 12.5%. * High reasoning; n/a = no fitted data.</div>';
      takeaway.innerHTML = '<strong>Position is not a uniform treatment.</strong> ' +
        (state.modality === 'ui' ? 'The same 2 x 4 page' : 'The same ordered JSON list') + ' produces different choice patterns across models.';
    }

    render();
  }

  /* ================= DECK ENGINE ================= */
  document.querySelectorAll('.simulator-slide .frame[data-frame="2"]').forEach(function (frame) {
    frame.remove();
  });

  var stage = document.getElementById('stage');
  var deckSections = Array.prototype.slice.call(stage.querySelectorAll(':scope > .slide'));
  deckSections
    .map(function (slide, index) { return { slide: slide, index: index }; })
    .sort(function (a, b) {
      var ao = parseInt(a.slide.getAttribute('data-deck-order'), 10);
      var bo = parseInt(b.slide.getAttribute('data-deck-order'), 10);
      ao = Number.isFinite(ao) ? ao : 1000 + a.index;
      bo = Number.isFinite(bo) ? bo : 1000 + b.index;
      return ao - bo;
    })
    .forEach(function (item) { stage.appendChild(item.slide); });

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var cur = 0, curStep = 0;
  var counter = document.getElementById('counter');
  var progress = document.querySelector('#progress i');

  function maxStepOf(slide) {
    var m = 0;
    slide.querySelectorAll('[data-step]').forEach(function (n) {
      m = Math.max(m, parseInt(n.getAttribute('data-step'), 10) || 0);
    });
    slide.querySelectorAll('.frame').forEach(function (n) {
      m = Math.max(m, parseInt(n.getAttribute('data-frame'), 10) || 0);
    });
    var ds = parseInt(slide.getAttribute('data-steps') || '0', 10);
    return Math.max(m, ds);
  }
  function applyStep(slide, step) {
    slide.querySelectorAll('[data-step]').forEach(function (n) {
      n.classList.toggle('on', (parseInt(n.getAttribute('data-step'), 10) || 0) <= step);
    });
    var frames = slide.querySelectorAll('.frame');
    if (frames.length) {
      var best = 0;
      frames.forEach(function (f) {
        var k = parseInt(f.getAttribute('data-frame'), 10) || 0;
        if (k <= step) best = Math.max(best, k);
      });
      frames.forEach(function (f) {
        f.classList.toggle('on', (parseInt(f.getAttribute('data-frame'), 10) || 0) === best);
      });
    }
    slide.dispatchEvent(new CustomEvent('stepchange', { detail: { step: step } }));
  }
  function show(n, step, backwards) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    var old = slides[cur];
    if (n !== cur) {
      old.classList.remove('active');
      old.classList.toggle('leaving-back', !!backwards);
      old.querySelectorAll('video').forEach(function (v) {
        v.pause();
        v.currentTime = 0;
      });
    }
    cur = n;
    var s = slides[cur];
    s.classList.remove('leaving-back');
    s.classList.toggle('from-back', !!backwards);
    void s.offsetWidth; /* reflow so transform start state applies */
    s.classList.add('active');
    s.classList.remove('from-back');
    s.querySelectorAll('video[data-autoplay]').forEach(function (v) {
      v.currentTime = 0;
      var playPromise = v.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
    });
    curStep = (step != null) ? step : 0;
    applyStep(s, curStep);
    update();
  }
  function next() {
    var m = maxStepOf(slides[cur]);
    if (curStep < m) { curStep++; applyStep(slides[cur], curStep); update(); }
    else if (cur < slides.length - 1) show(cur + 1, 0, false);
  }
  function prev() {
    if (curStep > 0) { curStep--; applyStep(slides[cur], curStep); update(); }
    else if (cur > 0) show(cur - 1, maxStepOf(slides[cur - 1]), true);
  }
  function update() {
    if (counter) counter.textContent = (cur + 1) + ' / ' + slides.length;
    if (progress) progress.style.width = ((cur) / (slides.length - 1) * 100) + '%';
  }
  var nBtn = document.getElementById('next'), pBtn = document.getElementById('prev');
  if (nBtn) nBtn.addEventListener('click', next);
  if (pBtn) pBtn.addEventListener('click', prev);
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'VIDEO' || e.target.tagName === 'BUTTON') { }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { show(0, 0); }
    else if (e.key === 'End') { show(slides.length - 1, 0); }
  });
  function fit() {
    var s = Math.min(window.innerWidth / 1024, window.innerHeight / 768) * 0.97;
    document.getElementById('stage').style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();

  /* mount widgets */
  document.querySelectorAll('[data-widget]').forEach(function (el) {
    var kind = el.getAttribute('data-widget');
    try {
      if (kind === 'timeline') initTimeline(el);
      else if (kind === 'market-share') initMarketShare(el);
      else if (kind === 'coef-table') initCoefTable(el);
      else if (kind === 'position-radar') initPositionRadar(el);
    } catch (err) {
      el.innerHTML = '<div class="table-note">Widget failed: ' + esc(err.message) + '</div>';
    }
  });

  slides[0].classList.add('active');
  applyStep(slides[0], 0);
  update();
})();
