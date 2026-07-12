const state = {
  experiment: "choice_behavior",
  selectedModels: [],
  modality: "",
  prompt: "",
  selectedPrompts: [],
  category: "",
};

const marketState = {
  experiment: "market_share",
  selectedModels: [],
  modality: "",
  prompt: "",
  category: "",
};

const coefficientState = {
  selectedModels: [],
  modality: "",
  selectedPrompts: [],
};

let DATA = null;
let MODEL_META = new Map();

const labels = {
  choice_behavior: "Choice Behavior",
  market_share: "Market Share",
  ui: "UI",
  headless: "Headless",
};

const promptLabel = {
  "def-ui": "Default UI",
  "ip-ui": "Ignore Position UI",
  "ip-pp-ui": "Price Sensitive UI",
  "def-hl": "Default Headless",
  "ip-hl": "Ignore Position Headless",
  "ip-pp-hl": "Price Sensitive Headless",
};

const els = {
  marketModelSelector: document.getElementById("marketModelSelector"),
  marketModality: document.getElementById("marketModality"),
  marketPrompt: document.getElementById("marketPrompt"),
  marketCategory: document.getElementById("marketCategory"),
  choiceModelSelector: document.getElementById("choiceModelSelector"),
  choiceModality: document.getElementById("choiceModality"),
  choicePrompt: document.getElementById("choicePrompt"),
  modelTimeline: document.getElementById("modelTimeline"),
  timelineSubtitle: document.getElementById("timelineSubtitle"),
  productShares: document.getElementById("productShares"),
  productShareSubtitle: document.getElementById("productShareSubtitle"),
  positionHeatmap: document.getElementById("positionHeatmap"),
  heatmapSubtitle: document.getElementById("heatmapSubtitle"),
  coefficientModelSelector: document.getElementById("coefficientModelSelector"),
  coefficientModality: document.getElementById("coefficientModality"),
  coefficientPromptSelector: document.getElementById("coefficientPromptSelector"),
  coefficientChart: document.getElementById("coefficientChart"),
  coefficientSubtitle: document.getElementById("coefficientSubtitle"),
};

const modelNames = {
  "claude-fable-5": "Claude Fable 5",
  "claude-opus-4-1-20250805": "Claude Opus 4.1",
  "claude-opus-4-20250514": "Claude Opus 4",
  "claude-opus-4-5-20251101": "Claude Opus 4.5",
  "claude-opus-4-8": "Claude Opus 4.8",
  "claude-sonnet-4-20250514": "Claude Sonnet 4",
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
  "gemini-2.0-flash-001": "Gemini 2.0 Flash",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-3-flash-preview": "Gemini 3 Flash Preview",
  "gemini-3-pro-preview": "Gemini 3 Pro Preview",
  "gpt-4.1-2025-04-14": "GPT-4.1",
  "gpt-4o-2024-11-20": "GPT-4o",
  "gpt-5": "GPT-5",
  "gpt-5.1": "GPT-5.1",
  "gpt-5.2": "GPT-5.2",
  "gpt-5.5": "GPT-5.5",
  "gpt-5.6-sol": "GPT-5.6 Sol",
};

const modelReleaseInfo = {
  "gpt-4o-2024-11-20": { date: "2024-05-13", provider: "OpenAI", source: "OpenAI" },
  "gpt-4.1-2025-04-14": { date: "2025-04-14", provider: "OpenAI", source: "OpenAI" },
  "gpt-5": { date: "2025-08-07", provider: "OpenAI", source: "AP / OpenAI launch coverage" },
  "gpt-5.1": { date: "2025-11-12", provider: "OpenAI", source: "OpenAI launch coverage" },
  "gpt-5.2": { date: "2025-12-11", provider: "OpenAI", source: "OpenAI" },
  "gpt-5.5": { date: "2026-04-23", provider: "OpenAI", source: "OpenAI launch coverage" },
  "gpt-5.6-sol": { date: "2026-07-09", provider: "OpenAI", source: "OpenAI launch coverage" },
  "claude-sonnet-4-20250514": { date: "2025-05-22", provider: "Anthropic" },
  "claude-opus-4-20250514": { date: "2025-05-22", provider: "Anthropic" },
  "claude-opus-4-1-20250805": { date: "2025-08-05", provider: "Anthropic" },
  "claude-sonnet-4-5-20250929": { date: "2025-09-29", provider: "Anthropic" },
  "claude-opus-4-5-20251101": { date: "2025-11-24", provider: "Anthropic" },
  "claude-opus-4-8": { date: "2026-05-28", provider: "Anthropic" },
  "claude-fable-5": { date: "2026-06-30", provider: "Anthropic" },
  "gemini-2.0-flash-001": { date: "2025-02-05", provider: "Google" },
  "gemini-2.5-pro": { date: "2025-03-25", provider: "Google" },
  "gemini-2.5-flash": { date: "2025-06-17", provider: "Google" },
  "gemini-3-pro-preview": { date: "2025-11-18", provider: "Google" },
  "gemini-3-flash-preview": { date: "2025-12-17", provider: "Google" },
};

const providerOrder = ["OpenAI", "Anthropic", "Google"];
const highReasoningModels = new Set(["gpt-5.5", "gpt-5.6-sol", "claude-opus-4-8", "claude-fable-5"]);
const hiddenPromptVariants = new Set(["ip-pp-ui", "ip-pp-hl"]);

function modelKeyFor(model, reasoning = "") {
  return `${model}__reasoning_${reasoning || "na"}`;
}

function normalizeDataModelKeys() {
  MODEL_META = new Map();
  ["coverage", "products", "positions", "features", "coefficients", "models"].forEach((collection) => {
    (DATA?.[collection] || []).forEach((row) => {
      row.modelKey = row.modelKey || modelKeyFor(row.model, row.reasoning);
      if (!MODEL_META.has(row.modelKey)) {
        MODEL_META.set(row.modelKey, {
          model: row.model,
          reasoning: row.reasoning || "",
          provider: row.provider || modelReleaseInfo[row.model]?.provider || "Unknown",
        });
      }
    });
  });
}

function baseModel(modelOrKey) {
  return MODEL_META.get(modelOrKey)?.model || String(modelOrKey || "").replace(/__reasoning_.+$/, "");
}

function reasoningFor(modelOrKey) {
  if (MODEL_META.has(modelOrKey)) return MODEL_META.get(modelOrKey).reasoning || "";
  const match = String(modelOrKey || "").match(/__reasoning_(.+)$/);
  return match ? (match[1] === "na" ? "" : match[1]) : "";
}

function isHighReasoning(modelOrKey) {
  const reasoning = reasoningFor(modelOrKey);
  if (reasoning) return reasoning === "high";
  return DATA?.coverage?.some((row) => row.model === modelOrKey && row.reasoning === "high") || false;
}

function displayModel(modelOrKey) {
  const model = baseModel(modelOrKey);
  const name = modelNames[model] || String(model || "").replaceAll("-", " ");
  return isHighReasoning(modelOrKey) && highReasoningModels.has(model) ? `${name}*` : name;
}

function highReasoningNote(models) {
  return models.some((model) => isHighReasoning(model)) ? " · * High reasoning" : "";
}

function displayCategory(category) {
  return String(category || "").replaceAll("_", " ");
}

function providerFor(model) {
  const base = baseModel(model);
  return modelReleaseInfo[base]?.provider || MODEL_META.get(model)?.provider || DATA?.coverage.find((d) => d.model === base)?.provider || "Unknown";
}

function providerKey(modelOrProvider) {
  const provider = modelReleaseInfo[modelOrProvider]?.provider || modelOrProvider || "unknown";
  return String(provider).toLowerCase();
}

function selectedModels() {
  return sortModelsByProviderRelease(state.selectedModels.filter(Boolean));
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function releaseTime(model) {
  return new Date(`${modelReleaseInfo[baseModel(model)]?.date || "2099-12-31"}T00:00:00Z`).getTime();
}

function timelineStartTime() {
  return new Date("2025-01-01T00:00:00Z").getTime();
}

function timelineEndTime() {
  return new Date("2026-07-31T00:00:00Z").getTime();
}

function releaseDateText(dateText) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${dateText}T00:00:00Z`));
}

function releaseDateLabel(row) {
  return row.dateLabel || releaseDateText(row.date);
}

function providerRank(provider) {
  const index = providerOrder.indexOf(provider);
  return index === -1 ? providerOrder.length : index;
}

function sortModelsByProviderRelease(models) {
  return [...models].sort((a, b) => {
    const providerDiff = providerRank(providerFor(a)) - providerRank(providerFor(b));
    return providerDiff || releaseTime(a) - releaseTime(b) || displayModel(a).localeCompare(displayModel(b));
  });
}

function pct(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function num(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function money(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function reviewCount(value) {
  if (value == null || Number.isNaN(value)) return "reviews n/a";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  return `${formatted} ${Number(value) === 1 ? "review" : "reviews"}`;
}

function shortProductName(row) {
  if (row?.shortName) return row.shortName;
  const sku = row?.sku || "";
  const suffix = String(sku).split("_").at(-1);
  if (/^\d+$/.test(suffix)) return `${displayCategory(row.category).replace(/\b\w/g, (c) => c.toUpperCase())} ${Number(suffix)}`;
  return String(row?.title || "Unknown product").split(/\s+/).slice(0, 4).join(" ");
}

function modelCoverage(experiment = state.experiment) {
  return DATA.coverage.filter((d) => d.experiment === experiment);
}

function defaultModelForScope(scope, models) {
  if (scope.experiment === "market_share") {
    return modelKeyForPreferred(models, "gpt-5.6-sol") || models[0] || "";
  }
  const preferred = ["gpt-5.6-sol", "gpt-5.5", "claude-opus-4-8", "claude-fable-5"];
  return preferred.map((model) => modelKeyForPreferred(models, model)).find(Boolean) || models[0] || "";
}

function modelKeyForPreferred(models, model) {
  return (
    models.find((key) => baseModel(key) === model && reasoningFor(key) === "high") ||
    models.find((key) => baseModel(key) === model) ||
    ""
  );
}

function defaultChoiceModels(models) {
  const preferred = [
    ["gpt-5.6-sol", "gpt-5.5", "gpt-5.1"],
    ["claude-fable-5", "claude-opus-4-8", "claude-opus-4-5-20251101"],
    ["gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
  ];
  const chosen = preferred
    .map((group) => group.map((model) => modelKeyForPreferred(models, model)).find(Boolean))
    .filter(Boolean);
  const selected = new Set(chosen);
  ["gemini-2.5-flash"].forEach((model) => {
    const key = modelKeyForPreferred(models, model);
    if (key) selected.add(key);
  });
  return sortModelsByProviderRelease([...selected]);
}

function promptOrderForModality(modality) {
  return modality === "headless" ? ["def-hl", "ip-hl", "ip-pp-hl"] : ["def-ui", "ip-ui", "ip-pp-ui"];
}

function sortPromptsForModality(prompts, modality) {
  const order = promptOrderForModality(modality);
  return [...prompts].filter((prompt) => !hiddenPromptVariants.has(prompt)).sort((a, b) => {
    const indexA = order.includes(a) ? order.indexOf(a) : order.length;
    const indexB = order.includes(b) ? order.indexOf(b) : order.length;
    return indexA - indexB || a.localeCompare(b);
  });
}

function selectedPromptsForScope(scope) {
  if (Array.isArray(scope.selectedPrompts)) return sortPromptsForModality(scope.selectedPrompts.filter(Boolean), scope.modality);
  return [scope.prompt].filter(Boolean);
}

function ensureScopeState(scope) {
  const available = modelCoverage(scope.experiment);
  const models = sortModelsByProviderRelease(uniq(available.map((d) => d.modelKey)));
  scope.selectedModels = scope.selectedModels.filter((model) => models.includes(model));
  if (!scope.selectedModels.length) {
    scope.selectedModels =
      scope.experiment === "choice_behavior"
        ? defaultChoiceModels(models)
        : [defaultModelForScope(scope, models)].filter(Boolean);
  }
  const relevantForModels = available.filter((d) => scope.selectedModels.includes(d.modelKey));
  const modalities = uniq(relevantForModels.map((d) => d.modality));
  if (!modalities.includes(scope.modality)) scope.modality = modalities.includes("ui") ? "ui" : modalities[0] || "";
  const prompts = sortPromptsForModality(uniq(relevantForModels.filter((d) => d.modality === scope.modality).map((d) => d.prompt)), scope.modality);
  if (Array.isArray(scope.selectedPrompts)) {
    scope.selectedPrompts = sortPromptsForModality(scope.selectedPrompts.filter((prompt) => prompts.includes(prompt)), scope.modality);
    if (!scope.selectedPrompts.length) {
      const defaults = promptOrderForModality(scope.modality).filter((prompt) => prompts.includes(prompt));
      scope.selectedPrompts = (defaults.length ? defaults : prompts).slice(0, 2);
    }
    scope.prompt = scope.selectedPrompts[0] || "";
  } else if (!prompts.includes(scope.prompt)) {
    const defaultPrompt = scope.modality === "headless" ? "def-hl" : "def-ui";
    scope.prompt = prompts.includes(defaultPrompt) ? defaultPrompt : prompts[0] || "";
  }
  const activePrompts = selectedPromptsForScope(scope);
  const categories = uniq(
    available
      .filter((d) => scope.selectedModels.includes(d.modelKey) && d.modality === scope.modality && activePrompts.includes(d.prompt))
      .flatMap((d) => d.categories),
  );
  const preferred = categories.includes("fitness_watch") ? "fitness_watch" : categories[0] || "";
  if (!categories.includes(scope.category)) scope.category = preferred;
}

function ensureState() {
  ensureScopeState(marketState);
  ensureScopeState(state);
  ensureCoefficientState();
}

function coefficientPromptOptions(modality) {
  const preferred = modality === "headless" ? ["def-hl", "ip-hl"] : ["def-ui", "ip-ui"];
  const available = new Set(DATA.coefficients.filter((row) => row.modality === modality).map((row) => row.prompt));
  return sortPromptsForModality(preferred.filter((prompt) => available.has(prompt)), modality);
}

function ensureCoefficientState() {
  const modalities = uniq(DATA.coefficients.map((row) => row.modality));
  if (!modalities.includes(coefficientState.modality)) coefficientState.modality = modalities.includes("ui") ? "ui" : modalities[0] || "";
  const prompts = coefficientPromptOptions(coefficientState.modality);
  coefficientState.selectedPrompts = coefficientState.selectedPrompts.filter((prompt) => prompts.includes(prompt));
  if (!coefficientState.selectedPrompts.length) coefficientState.selectedPrompts = prompts.slice(0, 2);

  const models = uniq(
    DATA.coefficients
      .filter((row) => row.modality === coefficientState.modality && coefficientState.selectedPrompts.includes(row.prompt))
      .map((row) => row.modelKey),
  );
  const sortedModels = sortModelsByProviderRelease(models);
  coefficientState.selectedModels = coefficientState.selectedModels.filter((model) => sortedModels.includes(model));
  if (!coefficientState.selectedModels.length) {
    coefficientState.selectedModels = [defaultModelForScope({ experiment: "choice_behavior" }, sortedModels)].filter(Boolean);
  }
}

function renderButtonGroup(container, values, selected, onSelect, formatter = (v) => v, options = {}) {
  container.innerHTML = "";
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    const isActive = Array.isArray(selected) ? selected.includes(value) : value === selected;
    button.className = `choice-chip${isActive ? " active" : ""}`;
    if (options.providerClass) button.classList.add(options.providerClass(value));
    button.textContent = formatter(value);
    button.title = value || formatter(value);
    button.addEventListener("click", () => onSelect(value));
    container.appendChild(button);
  });
}

function renderModelButtonGroup(container, models, selected, onSelect) {
  container.innerHTML = "";
  const grouped = new Map();
  sortModelsByProviderRelease(models).forEach((model) => {
    const provider = providerFor(model);
    if (!grouped.has(provider)) grouped.set(provider, []);
    grouped.get(provider).push(model);
  });
  const providers = [...providerOrder, ...[...grouped.keys()].filter((provider) => !providerOrder.includes(provider))];
  providers.forEach((provider) => {
    const providerModels = grouped.get(provider) || [];
    if (!providerModels.length) return;
    const row = document.createElement("div");
    row.className = "model-provider-row";
    const label = document.createElement("div");
    label.className = `model-provider-label provider-text-${providerKey(provider)}`;
    label.textContent = provider;
    const buttons = document.createElement("div");
    buttons.className = "model-provider-buttons";
    providerModels.forEach((model) => {
      const button = document.createElement("button");
      button.type = "button";
      const isActive = selected.includes(model);
      button.className = `choice-chip provider-${providerKey(provider)}${isActive ? " active" : ""}`;
      button.textContent = displayModel(model);
      button.title = model;
      button.addEventListener("click", () => onSelect(model));
      buttons.appendChild(button);
    });
    row.appendChild(label);
    row.appendChild(buttons);
    container.appendChild(row);
  });
}

function renderScopedControls(scope, targets) {
  const available = modelCoverage(scope.experiment);
  const models = sortModelsByProviderRelease(uniq(available.map((d) => d.modelKey)));
  const modelRows = available.filter((d) => scope.selectedModels.includes(d.modelKey));
  const modalities = uniq(modelRows.map((d) => d.modality));
  const prompts = sortPromptsForModality(uniq(modelRows.filter((d) => d.modality === scope.modality).map((d) => d.prompt)), scope.modality);
  const selectedPromptValues = selectedPromptsForScope(scope);
  const categories = targets.category
    ? uniq(
        modelRows
          .filter((d) => d.modality === scope.modality && selectedPromptValues.includes(d.prompt))
          .flatMap((d) => d.categories),
      )
    : [];
  renderModelButtonGroup(
    targets.models,
    models,
    scope.selectedModels,
    (value) => {
      const active = scope.selectedModels.includes(value);
      if (active && scope.selectedModels.length > 1) {
        scope.selectedModels = scope.selectedModels.filter((model) => model !== value);
      } else if (!active) {
        scope.selectedModels = [...scope.selectedModels, value];
      }
      ensureState();
      render();
    },
  );
  renderButtonGroup(
    targets.modality,
    modalities,
    scope.modality,
    (value) => {
      scope.modality = value;
      scope.prompt = "";
      if (Array.isArray(scope.selectedPrompts)) scope.selectedPrompts = [];
      scope.category = "";
      render();
    },
    (value) => labels[value] || value,
  );
  const isMultiPrompt = Array.isArray(scope.selectedPrompts);
  renderButtonGroup(
    targets.prompt,
    prompts,
    isMultiPrompt ? selectedPromptValues : scope.prompt,
    (value) => {
      if (isMultiPrompt) {
        const active = scope.selectedPrompts.includes(value);
        if (active && scope.selectedPrompts.length > 1) {
          scope.selectedPrompts = scope.selectedPrompts.filter((prompt) => prompt !== value);
        } else if (!active) {
          scope.selectedPrompts = sortPromptsForModality([...scope.selectedPrompts, value], scope.modality);
        }
        scope.prompt = scope.selectedPrompts[0] || "";
      } else {
        scope.prompt = value;
      }
      scope.category = "";
      render();
    },
    (value) => promptLabel[value] || value,
  );
  if (targets.category) {
    renderButtonGroup(
      targets.category,
      categories,
      scope.category,
      (value) => {
        scope.category = value;
        render();
      },
      displayCategory,
    );
  }
}

function renderControls() {
  renderScopedControls(marketState, {
    models: els.marketModelSelector,
    modality: els.marketModality,
    prompt: els.marketPrompt,
    category: els.marketCategory,
  });
  renderScopedControls(state, {
    models: els.choiceModelSelector,
    modality: els.choiceModality,
    prompt: els.choicePrompt,
  });
  renderCoefficientControls();
}

function renderCoefficientControls() {
  const modalities = uniq(DATA.coefficients.map((row) => row.modality));
  const prompts = coefficientPromptOptions(coefficientState.modality);
  const models = uniq(
    DATA.coefficients
      .filter((row) => row.modality === coefficientState.modality && coefficientState.selectedPrompts.includes(row.prompt))
      .map((row) => row.modelKey),
  );
  const sortedModels = sortModelsByProviderRelease(models);
  renderModelButtonGroup(
    els.coefficientModelSelector,
    sortedModels,
    coefficientState.selectedModels,
    (value) => {
      const active = coefficientState.selectedModels.includes(value);
      if (active && coefficientState.selectedModels.length > 1) {
        coefficientState.selectedModels = coefficientState.selectedModels.filter((model) => model !== value);
      } else if (!active) {
        coefficientState.selectedModels = [...coefficientState.selectedModels, value];
      }
      ensureState();
      render();
    },
  );
  renderButtonGroup(
    els.coefficientModality,
    modalities,
    coefficientState.modality,
    (value) => {
      coefficientState.modality = value;
      coefficientState.selectedPrompts = [];
      coefficientState.selectedModels = [];
      render();
    },
    (value) => labels[value] || value,
  );
  renderButtonGroup(
    els.coefficientPromptSelector,
    prompts,
    coefficientState.selectedPrompts,
    (value) => {
      const active = coefficientState.selectedPrompts.includes(value);
      if (active && coefficientState.selectedPrompts.length > 1) {
        coefficientState.selectedPrompts = coefficientState.selectedPrompts.filter((prompt) => prompt !== value);
      } else if (!active) {
        coefficientState.selectedPrompts = [...coefficientState.selectedPrompts, value].sort(
          (a, b) => prompts.indexOf(a) - prompts.indexOf(b),
        );
      }
      ensureState();
      render();
    },
    (value) => promptLabel[value] || value,
  );
}

function datePercent(dateText) {
  const value = new Date(`${dateText}T00:00:00Z`).getTime();
  return Math.min(100, Math.max(0, ((value - timelineStartTime()) / (timelineEndTime() - timelineStartTime())) * 100));
}

function formatMonth(dateText) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${dateText}T00:00:00Z`));
}

function renderModelTimeline() {
  const modelRows = sortModelsByProviderRelease(uniq(DATA.coverage.map((d) => d.model)))
    .filter((model) => model !== "gpt-4o-2024-11-20")
    .map((model) => {
      const provider = modelReleaseInfo[model]?.provider || DATA.coverage.find((d) => d.model === model)?.provider || "Unknown";
      const date = modelReleaseInfo[model]?.date || "2026-07-01";
      const dateLabel = modelReleaseInfo[model]?.dateLabel;
      return { model, provider, date, dateLabel };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date) || displayModel(a.model).localeCompare(displayModel(b.model)));
  els.timelineSubtitle.textContent = `${modelRows.length} models, January 2025 to July 2026; sorted from oldest to newest`;
  const ticks = [
    ["2025-01-01", "Jan 2025"],
    ["2025-03-01", "Mar 2025"],
    ["2025-05-01", "May 2025"],
    ["2025-07-01", "Jul 2025"],
    ["2025-09-01", "Sep 2025"],
    ["2025-11-01", "Nov 2025"],
    ["2026-01-01", "Jan 2026"],
    ["2026-03-01", "Mar 2026"],
    ["2026-05-01", "May 2026"],
    ["2026-07-01", "Jul 2026"],
  ];
  els.modelTimeline.innerHTML = `
    <div class="timeline-axis">
      ${ticks.map(([date, label]) => `<span style="left:${datePercent(date)}%">${label}</span>`).join("")}
    </div>
    <div class="timeline-stage">
      ${modelRows
        .map(
          (row) => `
            <div class="timeline-row">
              <div class="timeline-label">
                <strong class="provider-text-${providerKey(row.provider)}">${escapeHtml(displayModel(row.model))}</strong>
                <span>${escapeHtml(row.provider)} · ${escapeHtml(releaseDateLabel(row))}</span>
              </div>
              <div class="timeline-track">
                <i class="timeline-marker provider-${providerKey(row.provider)}" style="left:${datePercent(row.date)}%" title="${escapeHtml(displayModel(row.model))} · ${escapeHtml(row.provider)} · ${escapeHtml(releaseDateLabel(row))}"></i>
              </div>
            </div>`,
        )
        .join("")}
    </div>
    <div class="timeline-legend">
      <span><i class="legend-dot provider-openai"></i>OpenAI</span>
      <span><i class="legend-dot provider-anthropic"></i>Anthropic</span>
      <span><i class="legend-dot provider-google"></i>Google</span>
      <span class="reasoning-note"><strong>*</strong> High reasoning</span>
    </div>`;
}

function filteredProducts(model, scope = state) {
  const rows = DATA.products.filter(
    (d) =>
      d.experiment === scope.experiment &&
      d.modelKey === model &&
      d.modality === scope.modality &&
      d.prompt === scope.prompt &&
      d.category === scope.category,
  );
  return rows.sort((a, b) => {
    const skuA = String(a.sku || "");
    const skuB = String(b.sku || "");
    const numA = Number(skuA.split("_").at(-1));
    const numB = Number(skuB.split("_").at(-1));
    if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
    return shortProductName(a).localeCompare(shortProductName(b));
  }).slice(0, 8);
}

function renderProductShares() {
  const models = sortModelsByProviderRelease(marketState.selectedModels.filter(Boolean));
  const productRows = models.flatMap((model) => filteredProducts(model, marketState));
  const byKey = new Map();
  productRows.forEach((row) => {
    const key = row.sku || row.title;
    const existing = byKey.get(key) || {
      sku: row.sku,
      category: row.category,
      title: row.title,
      shortName: row.shortName,
      imageUrl: row.imageUrl,
      url: row.url,
      price: row.price,
      rating: row.rating,
      ratingCount: row.ratingCount,
      byModel: new Map(),
    };
    existing.byModel.set(row.modelKey, row);
    byKey.set(key, existing);
  });
  const rows = [...byKey.values()]
    .sort((a, b) => Math.max(...models.map((model) => b.byModel.get(model)?.share || 0)) - Math.max(...models.map((model) => a.byModel.get(model)?.share || 0)))
    .slice(0, 8);
  els.productShareSubtitle.textContent = `${labels[marketState.experiment]} · ${displayCategory(marketState.category)} · ${promptLabel[marketState.prompt] || marketState.prompt}${highReasoningNote(models)}`;
  if (!rows.length) {
    els.productShares.innerHTML = `<div class="empty-state">No product share data for this slice.</div>`;
    return;
  }
  els.productShares.innerHTML = rows
    .map((row) => {
      const image = row.imageUrl
        ? `<img class="product-image" src="${row.imageUrl}" alt="${escapeHtml(row.title)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" />`
        : "";
      const placeholderClass = row.imageUrl ? "image-placeholder" : "image-placeholder visible";
      return `
        <div class="product-row">
          <div>
            ${image}<div class="${placeholderClass}">${escapeHtml(row.title.slice(0, 1).toUpperCase())}</div>
          </div>
          <div>
            <div class="product-title" title="${escapeHtml(row.title)}">${escapeHtml(shortProductName(row))}</div>
            <div class="product-meta">
              <span>${money(row.price)}</span>
              <span>${row.rating ? `${num(row.rating)} rating` : "rating n/a"}</span>
              <span>${reviewCount(row.ratingCount)}</span>
            </div>
          </div>
          <div class="bars">
            ${models.map((model) => shareLine(model, row.byModel.get(model))).join("")}
          </div>
        </div>`;
    })
    .join("");
}

function shareLine(model, row) {
  const value = row?.share || 0;
  const colorClass = `provider-${providerKey(providerFor(model))}`;
  return `
    <div class="bar-line">
      <span>${escapeHtml(displayModel(model))}</span>
      <div class="bar-track"><div class="bar-fill ${colorClass}" style="width:${Math.max(1, value * 100)}%"></div></div>
      <strong>${pct(value)}</strong>
    </div>`;
}

function renderPositionHeatmap() {
  const models = selectedModels();
  const prompts = selectedPromptsForScope(state);
  const coefficientRows = DATA.coefficients.filter(
    (d) => d.modality === state.modality && prompts.includes(d.prompt) && models.includes(d.modelKey),
  );
  els.heatmapSubtitle.textContent = `${labels[state.modality] || state.modality} · ${prompts.map((prompt) => promptLabel[prompt] || prompt).join(" vs ")} · deviation from the 12.5% no-position-bias baseline${highReasoningNote(models)}`;
  els.positionHeatmap.innerHTML = `
    <div class="position-radar-grid">
      ${prompts.map((prompt) => positionPromptRadar(prompt, models, coefficientRows)).join("")}
    </div>`;
}

function positionPromptRadar(prompt, models, coefficientRows) {
  return `
    <section class="position-prompt-panel radar-prompt-panel">
      <h3>${escapeHtml(promptLabel[prompt] || prompt)}</h3>
      <div class="radar-family-grid">
        ${providerOrder.map((provider) => positionProviderRadar(prompt, provider, models, coefficientRows)).join("")}
      </div>
    </section>`;
}

const BASE_POSITION_SHARE = 1 / 8;

function positionProviderRadar(prompt, provider, models, coefficientRows) {
  const providerModels = sortModelsByProviderRelease(models)
    .filter((model) => providerFor(model) === provider)
    .map((model) => ({
      model,
      probabilities: positionProbabilitiesForModel(coefficientRows, model, prompt),
    }));
  const providerClass = `provider-${providerKey(provider)}`;
  const fittedCount = providerModels.filter((series) => seriesHasData(series)).length;
  return `
    <section class="radar-card ${providerClass}">
      <div class="radar-card-heading">
        <span class="panel-kicker">${escapeHtml(providerFamilyLabel(provider))}</span>
        <strong>${fittedCount ? `${fittedCount} fitted model${fittedCount === 1 ? "" : "s"}` : "No fitted data"}</strong>
      </div>
      ${positionRadarSvg(providerModels, provider)}
      <div class="radar-legend">
        ${
          providerModels.length
            ? providerModels.map((series, index) => radarLegendItem(series, provider, index)).join("")
            : `<span class="no-fit">No fitted ${escapeHtml(promptLabel[prompt] || prompt)} coefficients</span>`
        }
      </div>
    </section>`;
}

function providerFamilyLabel(provider) {
  return provider === "Google" ? "Gemini" : provider;
}

function positionRadarSvg(seriesRows, provider) {
  const axisCount = 8;
  const size = 560;
  const center = size / 2;
  const radius = 176;
  const labelRadius = 229;
  const deviations = seriesRows.flatMap((series) =>
    series.probabilities
      .filter((value) => value != null && Number.isFinite(value))
      .map((value) => value - BASE_POSITION_SHARE),
  );
  const maxAbs = Math.max(BASE_POSITION_SHARE, ...deviations.map((value) => Math.abs(value)));
  const rings = [-1, -0.5, 0, 0.5, 1];
  const axes = Array.from({ length: axisCount }, (_, index) => radarAngle(index, axisCount));
  const ringMarkup = rings
    .map((multiplier) => {
      const points = axes.map((angle) => radarPoint(center, radius, angle, radarRadiusForDeviation(multiplier * maxAbs, maxAbs))).join(" ");
      const label = multiplier === 0 ? "12.5%" : signedPp(multiplier * maxAbs);
      return `<polygon class="radar-ring ${multiplier === 0 ? "baseline" : ""}" points="${points}"><title>${label}</title></polygon>`;
    })
    .join("");
  const axisMarkup = axes
    .map((angle, index) => {
      const end = radarPointTuple(center, radius, angle, 0.97);
      const label = radarPointTuple(center, labelRadius, angle, 1);
      return `
        <line class="radar-axis" x1="${center}" y1="${center}" x2="${end[0]}" y2="${end[1]}"></line>
        <text class="radar-axis-label" x="${label[0]}" y="${label[1]}" text-anchor="${radarTextAnchor(angle)}">${escapeHtml(positionAxisLabel(index))}</text>`;
    })
    .join("");
  const seriesMarkup = seriesRows
    .map((series, index) => radarSeriesMarkup(series, provider, index, center, radius, maxAbs))
    .join("");
  return `
    <svg class="radar-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(providerFamilyLabel(provider))} position-bias radar chart">
      <g>${ringMarkup}</g>
      <g>${axisMarkup}</g>
      <g>${seriesMarkup}</g>
      <text class="radar-baseline-label" x="${center}" y="${center - radius * 0.5 - 8}" text-anchor="middle">12.5% baseline</text>
    </svg>`;
}

function radarSeriesMarkup(series, provider, index, center, radius, maxAbs) {
  const points = series.probabilities
    .map((value, axisIndex) => {
      if (value == null || !Number.isFinite(value)) return null;
      return {
        value,
        axisIndex,
        point: radarPointTuple(center, radius, radarAngle(axisIndex, 8), radarRadiusForDeviation(value - BASE_POSITION_SHARE, maxAbs)),
      };
    })
    .filter(Boolean);
  if (!points.length) return "";
  const pointString = points.map((item) => item.point.join(",")).join(" ");
  const dash = radarDash(index);
  const markerMarkup = points
    .map(
      (item) =>
        `<circle class="radar-dot provider-${providerKey(provider)}" cx="${item.point[0]}" cy="${item.point[1]}" r="4.5">
          <title>${escapeHtml(displayModel(series.model))} · ${escapeHtml(positionAxisLabel(item.axisIndex))}: ${pct(item.value)} (${signedPp(item.value - BASE_POSITION_SHARE)})</title>
        </circle>`,
    )
    .join("");
  return `
    <polygon class="radar-area provider-${providerKey(provider)} series-${index % 4}" points="${pointString}"></polygon>
    <polyline class="radar-line provider-${providerKey(provider)} series-${index % 4}" points="${pointString} ${points[0].point.join(",")}" ${dash ? `stroke-dasharray="${dash}"` : ""}>
      <title>${escapeHtml(displayModel(series.model))}</title>
    </polyline>
    ${markerMarkup}`;
}

function radarLegendItem(series, provider, index) {
  const dash = radarDash(index);
  const hasData = seriesHasData(series);
  return `
    <span class="${hasData ? "" : "no-fit"}">
      <i class="provider-${providerKey(provider)}" style="${dash ? `border-top-style:dashed;` : ""}"></i>
      ${escapeHtml(displayModel(series.model))}${hasData ? "" : " (no fit)"}
    </span>`;
}

function seriesHasData(series) {
  return series.probabilities.some((value) => value != null && Number.isFinite(value));
}

function radarDash(index) {
  return ["", "9 6", "3 6", "12 4 3 4"][index % 4];
}

function radarAngle(index, total) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total;
}

function radarRadiusForDeviation(deviation, maxAbs) {
  return Math.max(0.06, Math.min(0.96, 0.5 + (deviation / maxAbs) * 0.44));
}

function radarPoint(center, radius, angle, scale) {
  const [x, y] = radarPointTuple(center, radius, angle, scale);
  return `${x},${y}`;
}

function radarPointTuple(center, radius, angle, scale) {
  return [
    Number((center + Math.cos(angle) * radius * scale).toFixed(2)),
    Number((center + Math.sin(angle) * radius * scale).toFixed(2)),
  ];
}

function radarTextAnchor(angle) {
  const x = Math.cos(angle);
  if (x > 0.32) return "start";
  if (x < -0.32) return "end";
  return "middle";
}

function positionAxisLabel(index) {
  return state.modality === "headless" ? `Position ${index + 1}` : uiPositionLabel(index);
}

function signedPp(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  const pp = value * 100;
  return `${pp >= 0 ? "+" : ""}${pp.toFixed(1)} pp`;
}

function positionProbabilitiesForModel(coefficientRows, model, prompt) {
  return mnlProbabilities(positionUtilitiesForModel(coefficientRows, model, prompt));
}

function positionUtilitiesForModel(coefficientRows, model, prompt) {
  const termMap = new Map(
    coefficientRows
      .filter((row) => row.modelKey === model && row.prompt === prompt)
      .map((row) => [row.term, row]),
  );
  return Array.from({ length: 8 }, (_, index) =>
    state.modality === "headless"
      ? headlessPositionEffect(termMap, index)
      : uiPositionEffect(termMap, index),
  );
}

function mnlProbabilities(utilities) {
  if (utilities.some((value) => value == null || !Number.isFinite(value))) {
    return Array.from({ length: utilities.length }, () => null);
  }
  const maxUtility = Math.max(...utilities);
  const expUtilities = utilities.map((value) => Math.exp(value - maxUtility));
  const denominator = expUtilities.reduce((total, value) => total + value, 0);
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return Array.from({ length: utilities.length }, () => null);
  }
  return expUtilities.map((value) => value / denominator);
}

function coefficientEstimate(termMap, term) {
  const value = termMap.get(term)?.estimate;
  return Number.isFinite(value) ? value : null;
}

function sumCoefficientComponents(components) {
  if (components.some((value) => value == null)) return null;
  return components.reduce((total, value) => total + value, 0);
}

function uiPositionEffect(termMap, index) {
  const row = Math.floor(index / 4) + 1;
  const col = (index % 4) + 1;
  const components = [];
  if (row === 1) components.push(coefficientEstimate(termMap, "row_1_dummy"));
  if (col <= 3) components.push(coefficientEstimate(termMap, `col_${col}_dummy`));
  return sumCoefficientComponents(components);
}

function headlessPositionEffect(termMap, index) {
  if (index === 7) return 0;
  return coefficientEstimate(termMap, `position_${index + 1}_dummy`);
}

function uiPositionLabel(index) {
  const row = Math.floor(index / 4) + 1;
  const col = (index % 4) + 1;
  return `R${row}C${col}`;
}

function probabilityHeatCellStyle(value, maxShare) {
  if (value == null || Number.isNaN(value)) return "";
  const intensity = Math.max(0, Math.min(1, value / (maxShare || 1)));
  const hue = 58 + intensity * 146;
  const saturation = 74 - intensity * 18;
  const lightness = 94 - intensity * 48;
  const color = intensity > 0.62 ? "#ffffff" : "#111111";
  return `background:hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%); color:${color};`;
}

function coefficientRows(model, prompt) {
  return DATA.coefficients.filter(
    (d) => d.modelKey === model && d.modality === coefficientState.modality && d.prompt === prompt,
  );
}

function formatP(value) {
  if (value == null || Number.isNaN(value)) return "p n/a";
  if (value < 0.001) return "p<0.001";
  return `p=${value.toFixed(3)}`;
}

function significanceStars(value) {
  if (value == null || Number.isNaN(value)) return "";
  if (value < 0.001) return "***";
  if (value < 0.01) return "**";
  if (value < 0.05) return "*";
  return "";
}

const coefficientTermLabels = {
  log_price: "ln(Price)",
  rating: "Rating",
  log_rating_count: "ln(Number of Reviews)",
  sponsored_tag: "Sponsored Tag",
  overall_pick_tag: "Overall Pick Tag",
  scarcity_tag: "Scarcity Tag",
  row_1_dummy: "Row 1",
  col_1_dummy: "Column 1",
  col_2_dummy: "Column 2",
  col_3_dummy: "Column 3",
  position_1_dummy: "Position 1",
  position_2_dummy: "Position 2",
  position_3_dummy: "Position 3",
  position_4_dummy: "Position 4",
  position_5_dummy: "Position 5",
  position_6_dummy: "Position 6",
  position_7_dummy: "Position 7",
};

function coefficientSectionsForModality(modality = coefficientState.modality) {
  const badge = ["sponsored_tag", "overall_pick_tag", "scarcity_tag"];
  const attributes = ["log_price", "rating", "log_rating_count"];
  if (modality === "headless") {
    return [
      { label: "Position effects", terms: ["position_1_dummy", "position_2_dummy", "position_3_dummy", "position_4_dummy", "position_5_dummy", "position_6_dummy", "position_7_dummy"] },
      { label: "Badge effects", terms: badge },
      { label: "Attribute effects", terms: attributes },
    ];
  }
  return [
    { label: "Position effects", terms: ["row_1_dummy", "col_1_dummy", "col_2_dummy", "col_3_dummy"] },
    { label: "Badge effects", terms: badge },
    { label: "Attribute effects", terms: attributes },
  ];
}

function coefficientCell(row) {
  if (!row || row.estimate == null) return '<span class="coef-missing">n/a</span>';
  const stars = significanceStars(row.pValue);
  const estimate = `${row.estimate.toFixed(3)}${stars}`;
  const se = row.stdError == null ? "" : `(${row.stdError.toFixed(3)})`;
  return `<span class="coef-estimate">${estimate}</span><span class="coef-se">${se}</span>`;
}

function coefficientSummaryCell(row, key) {
  if (key === "fixedEffects") return "Yes";
  if (!row) return '<span class="coef-missing">n/a</span>';
  if (key === "nRowsFit") return row.nRowsFit == null ? '<span class="coef-missing">n/a</span>' : Math.round(row.nRowsFit).toLocaleString();
  if (key === "nChoiceSetsFit") return row.nChoiceSetsFit == null ? '<span class="coef-missing">n/a</span>' : Math.round(row.nChoiceSetsFit).toLocaleString();
  if (key === "pseudoR2") return row.pseudoR2 == null ? '<span class="coef-missing">n/a</span>' : row.pseudoR2.toFixed(2);
  return '<span class="coef-missing">n/a</span>';
}

function renderCoefficients() {
  const models = sortModelsByProviderRelease(coefficientState.selectedModels.filter(Boolean));
  const sections = coefficientSectionsForModality();
  const prompts = coefficientState.selectedPrompts.filter(Boolean);
  const promptMaps = new Map(
    prompts.map((prompt) => [
      prompt,
      new Map(models.map((model) => [model, new Map(coefficientRows(model, prompt).map((row) => [row.term, row]))])),
    ]),
  );
  const hasAny = prompts.some((prompt) => models.some((model) => promptMaps.get(prompt)?.get(model)?.size));
  els.coefficientSubtitle.textContent = `${labels[coefficientState.modality] || coefficientState.modality} · ${prompts.map((prompt) => promptLabel[prompt] || prompt).join(" vs ")} · ${models.length} selected model${models.length === 1 ? "" : "s"}${highReasoningNote(models)}`;
  if (!hasAny) {
    els.coefficientChart.innerHTML = `<div class="empty-state">No fitted choice-model coefficients for these selected models and mode.</div>`;
    return;
  }
  els.coefficientChart.innerHTML = `
    <div class="coefficient-prompt-grid">
      ${prompts.map((prompt) => coefficientPromptTable(prompt, sections, models, promptMaps.get(prompt))).join("")}
    </div>
    <p class="table-note">Entries report conditional-logit coefficients with standard errors in parentheses. * p&lt;0.05, ** p&lt;0.01, *** p&lt;0.001.</p>
    <section class="price-equivalent-panel">
      <div>
        <span class="panel-kicker">Seller trade-offs</span>
        <h3>Price-Equivalent Trade-offs</h3>
      </div>
      <div class="coefficient-prompt-grid">
        ${prompts.map((prompt) => priceEquivalentPromptTable(prompt, models, promptMaps.get(prompt))).join("")}
      </div>
      <p class="table-note">Entries are multiplicative price changes that keep utility fixed: exp(-Delta utility / beta ln(price)) - 1.</p>
    </section>`;
}

function coefficientPromptTable(prompt, sections, models, rowMaps) {
  return `
    <section class="coefficient-prompt-table">
      <h3>${escapeHtml(promptLabel[prompt] || prompt)}</h3>
      <div class="coefficient-table-wrap">
        <table class="coefficient-table">
          <thead>
            <tr>
              <th>Variable</th>
              ${models.map((model) => `<th class="provider-text-${providerKey(providerFor(model))}">${escapeHtml(displayModel(model))}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${sections.map((section) => coefficientSectionRows(section, models, rowMaps)).join("")}
            <tr class="coef-divider"><th>Product Fixed Effects</th>${models.map(() => `<td>${coefficientSummaryCell(null, "fixedEffects")}</td>`).join("")}</tr>
            <tr><th>Observations</th>${models.map((model) => `<td>${coefficientSummaryCell(firstCoefficientRow(rowMaps.get(model)), "nRowsFit")}</td>`).join("")}</tr>
            <tr><th>Choice Sets (Groups)</th>${models.map((model) => `<td>${coefficientSummaryCell(firstCoefficientRow(rowMaps.get(model)), "nChoiceSetsFit")}</td>`).join("")}</tr>
            <tr><th>Pseudo R-squared</th>${models.map((model) => `<td>${coefficientSummaryCell(firstCoefficientRow(rowMaps.get(model)), "pseudoR2")}</td>`).join("")}</tr>
          </tbody>
        </table>
      </div>
    </section>`;
}

function coefficientSectionRows(section, models, rowMaps) {
  return `
    <tr class="coef-section-row"><th>${section.label}</th>${models.map(() => "<td></td>").join("")}</tr>
    ${section.terms
      .map(
        (term) => `
          <tr>
            <th>${coefficientTermLabels[term] || term}</th>
            ${models.map((model) => `<td>${coefficientCell(rowMaps.get(model)?.get(term))}</td>`).join("")}
          </tr>`,
      )
      .join("")}`;
}

function priceEquivalentPromptTable(prompt, models, rowMaps) {
  const sections = priceEquivalentSectionsForModality(coefficientState.modality);
  return `
    <section class="coefficient-prompt-table">
      <h3>${escapeHtml(promptLabel[prompt] || prompt)}</h3>
      <div class="coefficient-table-wrap">
        <table class="coefficient-table price-equivalent-table">
          <thead>
            <tr>
              <th></th>
              ${models.map((model) => `<th class="provider-text-${providerKey(providerFor(model))}">${escapeHtml(displayModel(model))}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${sections.map((section) => priceEquivalentSectionRows(section, models, rowMaps)).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function priceEquivalentSectionsForModality(modality) {
  const positionRow =
    modality === "headless"
      ? { label: "Position 1 (vs Position 8)", deltaUtility: (rowMap) => coefficientEstimate(rowMap, "position_1_dummy") }
      : { label: "Row 1 (vs Row 2)", deltaUtility: (rowMap) => coefficientEstimate(rowMap, "row_1_dummy") };
  return [
    {
      label: "How much could a seller raise prices (holding utility fixed) if the seller gets...",
      rows: [
        positionRow,
        { label: "Overall Pick tag", deltaUtility: (rowMap) => coefficientEstimate(rowMap, "overall_pick_tag") },
        { label: "+0.1 rating", deltaUtility: (rowMap) => multiplyCoefficient(rowMap, "rating", 0.1) },
        { label: "Double reviews", deltaUtility: (rowMap) => multiplyCoefficient(rowMap, "log_rating_count", Math.log(2)) },
      ],
    },
    {
      label: "How much would a seller need to cut price to offset the harm of...",
      rows: [
        { label: "Sponsored tag", deltaUtility: (rowMap) => coefficientEstimate(rowMap, "sponsored_tag") },
        { label: "Scarcity tag", deltaUtility: (rowMap) => coefficientEstimate(rowMap, "scarcity_tag") },
      ],
    },
  ];
}

function priceEquivalentSectionRows(section, models, rowMaps) {
  return `
    <tr class="coef-section-row"><th colspan="${models.length + 1}">${section.label}</th></tr>
    ${section.rows
      .map(
        (row) => `
          <tr>
            <th>${escapeHtml(row.label)}</th>
            ${models.map((model) => priceEquivalentCell(rowMaps.get(model), row)).join("")}
          </tr>`,
      )
      .join("")}`;
}

function multiplyCoefficient(rowMap, term, multiplier) {
  const value = coefficientEstimate(rowMap, term);
  return value == null ? null : value * multiplier;
}

function priceEquivalentCell(rowMap, row) {
  const value = priceEquivalentChange(rowMap, row.deltaUtility(rowMap));
  if (value == null || !Number.isFinite(value)) return '<td><span class="coef-missing">n/a</span></td>';
  const className = value < 0 ? "price-cut" : "price-raise";
  return `<td class="${className}">${signedPct(value)}</td>`;
}

function priceEquivalentChange(rowMap, deltaUtility) {
  const priceCoefficient = coefficientEstimate(rowMap, "log_price");
  if (deltaUtility == null || priceCoefficient == null || priceCoefficient === 0) return null;
  return Math.exp(-deltaUtility / priceCoefficient) - 1;
}

function signedPct(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return `${normalized > 0 ? "+" : ""}${(normalized * 100).toFixed(1)}%`;
}

function firstCoefficientRow(rowMap) {
  if (!rowMap || !rowMap.size) return null;
  return rowMap.values().next().value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bindEvents() {
  return null;
}

function render() {
  ensureState();
  renderControls();
  renderModelTimeline();
  renderProductShares();
  renderPositionHeatmap();
  renderCoefficients();
}

async function init() {
  if (!window.ACES_DASHBOARD_DATA) {
    throw new Error("Bundled dashboard data was not found. Make sure data/summary.js is loaded before app.js.");
  }
  DATA = window.ACES_DASHBOARD_DATA;
  normalizeDataModelKeys();
  bindEvents();
  render();
}

init().catch((error) => {
  document.body.innerHTML = `<main><div class="empty-state">Dashboard data could not be loaded: ${escapeHtml(error.message)}</div></main>`;
});
