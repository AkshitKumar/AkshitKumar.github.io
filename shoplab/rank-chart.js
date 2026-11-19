(() => {
  "use strict";

  const root = document.getElementById("rank-chart");
  const source = document.getElementById("rank-data");
  if (!root || !source) return;
  const data = JSON.parse(source.textContent);
  const number = new Intl.NumberFormat("en-US");

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgElement(tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  function selectControl(labelText, id, options, className) {
    const label = element("label", className);
    label.append(element("span", "", labelText));
    const select = element("select");
    select.id = id;
    for (const [value, text] of Object.entries(options)) select.add(new Option(text, value));
    label.append(select);
    return { label, select };
  }

  const filters = element("div", "rank-controls");
  const category = selectControl("Category", "rank-category", data.categories);
  const model = selectControl("AI model", "rank-model", data.models);
  category.select.value = "all";
  model.select.value = "all";
  filters.append(category.label, model.label);
  const scope = element("label", "rank-scope");
  const unsorted = element("input");
  unsorted.type = "checkbox";
  unsorted.id = "rank-unsorted";
  scope.append(unsorted, "Exclude tasks where shoppers sorted");

  const legend = element("div", "rank-legend");
  const aiKey = element("span", "rank-key rank-ai");
  legend.append(element("span", "rank-key rank-human", "Shoppers"), aiKey);
  const matched = element("p", "rank-matched");
  const graph = svgElement("svg", { class: "rank-svg", role: "img", "aria-labelledby": "rank-plot-title rank-plot-desc" });

  const page = selectControl("Through page", "rank-page", {}, "rank-page-control");
  const values = element("div", "rank-values");
  values.setAttribute("aria-live", "polite");
  values.setAttribute("aria-atomic", "true");
  const readout = element("div", "rank-readout");
  readout.append(page.label, values);
  const details = element("details", "rank-table");
  details.append(element("summary", "", "Page-by-page values"));
  const table = element("table");
  details.append(table);
  root.replaceChildren(filters, scope, legend, element("p", "rank-y-label", "Cumulative share of picks"),
    graph, element("p", "rank-x-label", "Page in the original randomized catalogue"), readout, matched, details);

  let series;
  let selectedPage = 1;
  let currentWidth = 0;
  const fmt = count => (100 * count / series.pairs).toFixed(1) + "%";
  const shortModel = () => model.select.value === "all" ? "AI models" : data.models[model.select.value];

  function updateTable() {
    const caption = element("caption", "", "Cumulative share through each catalogue page");
    const head = element("thead");
    const titles = element("tr");
    for (const label of ["Through page", "Shoppers", shortModel()]) {
      const cell = element("th", "", label);
      cell.scope = "col";
      titles.append(cell);
    }
    head.append(titles);
    const body = element("tbody");
    for (let i = 0; i < series.human.length; i++) {
      const row = element("tr");
      const rowHead = element("th", "", i + 1);
      rowHead.scope = "row";
      row.append(rowHead, element("td", "", fmt(series.human[i])), element("td", "", fmt(series.ai[i])));
      body.append(row);
    }
    table.replaceChildren(caption, head, body);
  }

  function renderPlot() {
    // Draw in CSS pixels so the type stays readable on narrow screens.
    currentWidth = Math.max(160, Math.round(graph.getBoundingClientRect().width));
    const height = currentWidth < 400 ? 200 : 236;
    const left = 40, right = currentWidth - 13, top = 10, bottom = height - 24;
    const pages = series.human.length;
    const x = pageNumber => left + (right - left) * (pageNumber - 1) / (pages - 1);
    const y = share => bottom - share * (bottom - top);
    graph.setAttribute("viewBox", "0 0 " + currentWidth + " " + height);
    graph.style.height = height + "px";
    const title = svgElement("title", {id: "rank-plot-title"});
    title.textContent = "Cumulative distribution of selected products by original catalogue page";
    const desc = svgElement("desc", {id: "rank-plot-desc"});
    desc.textContent = "By page " + selectedPage + ", " + fmt(series.human[selectedPage-1]) +
      " of shopper picks and " + fmt(series.ai[selectedPage-1]) + " of " + shortModel() +
      " picks had appeared. The page-by-page values are available below.";
    graph.replaceChildren(title, desc);
    for (const pct of [0, 25, 50, 75, 100]) {
      const py = y(pct / 100);
      graph.append(svgElement("line", {x1:left, x2:right, y1:py, y2:py, class:pct ? "rank-grid" : "rank-axis"}));
      const label = svgElement("text", {x:left-7, y:py+4, "text-anchor":"end", class:"rank-tick"});
      label.textContent = pct + "%";
      graph.append(label);
    }
    for (let i = 1; i <= pages; i++) {
      const px = x(i);
      graph.append(svgElement("line", {x1:px, x2:px, y1:bottom, y2:bottom+4, class:"rank-axis"}));
      if (currentWidth < 350 && pages > 10 && i % 2 === 0) continue;
      const label = svgElement("text", {x:px, y:bottom+18, "text-anchor":"middle", class:"rank-tick"});
      label.textContent = i;
      graph.append(label);
    }
    const px = x(selectedPage);
    graph.append(svgElement("line", {x1:px, x2:px, y1:top, y2:bottom, class:"rank-guide"}));
    for (const kind of ["human", "ai"]) {
      const counts = series[kind];
      let path = "M " + x(1) + " " + y(0);
      for (let i = 0; i < pages; i++) {
        path += " H " + x(i+1) + " V " + y(counts[i] / series.pairs);
      }
      graph.append(svgElement("path", {d:path, class:"rank-line " + kind}));
    }
    const humanY = y(series.human[selectedPage-1] / series.pairs);
    const aiY = y(series.ai[selectedPage-1] / series.pairs);
    graph.append(svgElement("circle", {cx:px, cy:humanY, r:5.4, class:"rank-dot human"}));
    graph.append(svgElement("rect", {x:px-3, y:aiY-3, width:6, height:6, class:"rank-dot ai"}));
    // Use the same scale for reading the plot as for drawing it.
    graph.onclick = event => {
      const offset = event.clientX - graph.getBoundingClientRect().left;
      setPage(Math.max(1, Math.min(pages, 1 + Math.round((offset-left) / (right-left) * (pages-1)))));
    };
  }

  function setPage(next) {
    if (!series.pairs) return;
    selectedPage = next;
    page.select.value = String(selectedPage);
    const humanValue = element("span", "rank-read-human", "Shoppers ");
    humanValue.append(element("strong", "", fmt(series.human[next-1])));
    const aiValue = element("span", "rank-read-ai", shortModel() + " ");
    aiValue.append(element("strong", "", fmt(series.ai[next-1])));
    values.replaceChildren(humanValue, aiValue);
    renderPlot();
  }

  function updateSeries() {
    series = data.series[unsorted.checked ? "unsorted" : "all"][category.select.value][model.select.value];
    aiKey.textContent = shortModel();
    const hasData = series.pairs > 0;
    page.select.disabled = !hasData;
    graph.style.display = hasData ? "block" : "none";
    details.hidden = !hasData;
    if (!hasData) {
      page.select.replaceChildren();
      values.textContent = "No matched picks.";
      matched.textContent = "There are no matched shopping tasks for this selection.";
      return;
    }
    matched.textContent = number.format(series.tasks) + " matched shopping tasks · " +
      number.format(series.pairs) + " human–model pairs.";
    page.select.replaceChildren();
    for (let i = 1; i <= series.human.length; i++) page.select.add(new Option(String(i), String(i)));
    setPage(Math.min(selectedPage, series.human.length));
    updateTable();
  }

  for (const input of [model.select, category.select, unsorted]) input.addEventListener("change", updateSeries);
  page.select.addEventListener("change", () => setPage(Number(page.select.value)));
  updateSeries();
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      if (series.pairs && Math.round(graph.getBoundingClientRect().width) !== currentWidth) renderPlot();
    }).observe(root);
  } else {
    window.addEventListener("resize", () => { if (series.pairs) renderPlot(); });
  }
})();
