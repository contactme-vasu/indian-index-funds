const state = {
  data: null,
  periodIndex: 0,
  sortKey: "topBottomRatio",
  sortDirection: "desc",
  search: "",
  amcOnly: false,
  performanceSelected: new Set(),
  performanceActive: null,
};

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inrFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const chartColors = [
  "#1d5f8b",
  "#4fb745",
  "#ff7818",
  "#7c3aed",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#2563eb",
  "#65a30d",
  "#9333ea",
  "#c2410c",
  "#0369a1",
];

document.addEventListener("DOMContentLoaded", async () => {
  const response = await fetch("data.json", { cache: "no-store" });
  state.data = await response.json();

  document.getElementById("searchInput").addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  document.getElementById("amcOnlyInput").addEventListener("change", (event) => {
    state.amcOnly = event.target.checked;
    render();
  });

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    setHeaderWords(th, th.textContent);
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDirection = key === "indexName" || key === "sourceUrl" ? "asc" : "desc";
      }
      render();
    });
  });

  document.getElementById("performanceSelectAll").addEventListener("click", () => {
    setAllPerformanceSeries(true);
  });

  document.getElementById("performanceClear").addEventListener("click", () => {
    setAllPerformanceSeries(false);
  });

  initPerformanceSelection();
  renderTabs();
  renderMeta();
  render();
});

function renderTabs() {
  const tabs = document.getElementById("periodTabs");
  tabs.innerHTML = "";
  state.data.periods.forEach((period, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = period.label;
    button.className = index === state.periodIndex ? "active" : "";
    button.addEventListener("click", () => {
      state.periodIndex = index;
      renderTabs();
      render();
    });
    tabs.appendChild(button);
  });
}

function render() {
  const period = state.data.periods[state.periodIndex];
  const rows = sortedRows(filteredRows(period.rows));
  renderTable(period, rows);
  renderPerformance();
  renderFooter();
}

function initPerformanceSelection() {
  const performance = state.data.performance;
  if (!hasPerformanceData(performance)) return;
  state.performanceSelected = new Set(performance.series.map((series) => series.indexName));
}

function renderMeta() {
  const reportMeta = document.getElementById("reportMeta");
  const metadata = [
    ["Data updated up to", formatDateOnly(state.data.dataUpdatedThrough)],
  ];

  reportMeta.innerHTML = metadata.map(([label, value]) => `
    <div>
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");

  const sourceList = document.getElementById("sourceList");
  sourceList.innerHTML = state.data.sources.map((source) => `
    <li>
      <span>${escapeHtml(source.text)}</span>
      <a href="${escapeHtml(source.url)}" aria-label="Open source">↗</a>
    </li>
  `).join("");

  const excludedIndexNote = document.getElementById("excludedIndexNote");
  const excludedIndexes = Array.isArray(state.data.excludedIndexes) ? state.data.excludedIndexes : [];
  if (excludedIndexes.length === 0) {
    excludedIndexNote.hidden = true;
    excludedIndexNote.textContent = "";
  } else {
    excludedIndexNote.hidden = false;
    excludedIndexNote.textContent = `${excludedIndexes.length} configured indexes are excluded because cached TRI data is unavailable: ${excludedIndexes.join(", ")}.`;
  }
}

function filteredRows(rows) {
  return rows.filter((row) => {
    if (state.amcOnly && row.amcs.length === 0) return false;
    if (!state.search) return true;
    const haystack = `${row.indexName} ${row.amcs.join(" ")}`.toLowerCase();
    return haystack.includes(state.search);
  });
}

function sortedRows(rows) {
  const direction = state.sortDirection === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, state.sortKey);
    const bv = sortValue(b, state.sortKey);
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * direction;
    }
    return ((av ?? Number.NEGATIVE_INFINITY) - (bv ?? Number.NEGATIVE_INFINITY)) * direction;
  });
}

function sortValue(row, key) {
  return row[key];
}

function renderTable(period, rows) {
  const tbody = document.getElementById("rankingBody");
  tbody.innerHTML = "";
  document.getElementById("rowCount").textContent = `${rows.length} rows`;
  setHeaderWords(
    document.getElementById("avgRollingHeader"),
    `Average ${period.rollingYears} Year Rolling Return (%)`
  );

  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.indexName)}</td>
      <td>${formatPercent(row.cagr)}</td>
      <td>${formatPercent(row.stdDev)}</td>
      <td>${formatPercent(row.maxDrawdown)}</td>
      <td>${numberOrDash(row.sharpeRatio)}</td>
      <td>${numberOrDash(row.sortinoRatio)}</td>
      <td>${numberOrDash(row.yearsOfData)}</td>
      <td>${formatPercent(row.latest1YearReturn)}</td>
      <td>${formatPercent(row.latest3YearReturn)}</td>
      <td>${formatPercent(row.latest5YearReturn)}</td>
      <td>${formatPercent(row.latest7YearReturn)}</td>
      <td>${formatPercent(row.latest10YearReturn)}</td>
      <td>${formatPercent(row.averageRollingReturn)}</td>
      <td>${formatPercent(row.worstRollingReturn)}</td>
      <td>${formatPercent(row.bestRollingReturn)}</td>
      <td>${formatPercent(row.rollingReturnStdDev)}</td>
      <td>${numberOrDash(row.topQuartileCount)}</td>
      <td>${numberOrDash(row.bottomQuartileCount)}</td>
      <td>${numberOrDash(row.topBottomRatio)}</td>
      <td>${row.sourceUrl ? `<a class="source-link" href="${escapeHtml(row.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : '<span class="muted">none</span>'}</td>
    `;
    fragment.appendChild(tr);
  }
  tbody.appendChild(fragment);
}

function renderPerformance() {
  const performance = state.data.performance;
  const description = document.getElementById("performanceDescription");
  const unavailable = document.getElementById("performanceUnavailable");
  const controls = document.getElementById("performanceControls");
  const chartWrap = document.querySelector(".chart-wrap");
  const chart = document.getElementById("performanceChart");
  const actions = document.querySelector(".performance-actions");

  if (!hasPerformanceData(performance)) {
    description.textContent = "";
    unavailable.textContent = "Cumulative performance chart data is not available in this report.";
    unavailable.hidden = false;
    controls.innerHTML = "";
    chart.innerHTML = "";
    chartWrap.hidden = true;
    actions.hidden = true;
    return;
  }

  unavailable.hidden = true;
  chartWrap.hidden = false;
  actions.hidden = false;
  description.textContent = `The chart below shows cumulative performance of ${formatInr(performance.initialInvestment)} invested in each of the indices on ${formatDateNumeric(performance.startDate)}. Data through ${formatDateNumeric(performance.endDate)}.`;
  renderPerformanceControls(performance);
  renderPerformanceChart(performance);
}

function renderPerformanceControls(performance) {
  const controls = document.getElementById("performanceControls");
  controls.innerHTML = "";
  const fragment = document.createDocumentFragment();

  performance.series.forEach((series, index) => {
    const color = chartColors[index % chartColors.length];
    const label = document.createElement("label");
    label.className = "performance-toggle";
    label.dataset.seriesName = series.indexName;
    label.addEventListener("pointerenter", () => setActivePerformanceSeries(series.indexName));
    label.addEventListener("pointerleave", () => clearActivePerformanceSeries(series.indexName));
    label.addEventListener("focusin", () => setActivePerformanceSeries(series.indexName));
    label.addEventListener("focusout", () => clearActivePerformanceSeries(series.indexName));

    const swatch = document.createElement("span");
    swatch.className = "performance-swatch";
    swatch.style.backgroundColor = color;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.performanceSelected.has(series.indexName);
    input.addEventListener("change", (event) => {
      if (event.target.checked) {
        state.performanceSelected.add(series.indexName);
      } else {
        state.performanceSelected.delete(series.indexName);
      }
      if (!state.performanceSelected.has(state.performanceActive)) {
        state.performanceActive = null;
      }
      renderPerformanceChart(performance);
    });

    const text = document.createElement("span");
    text.textContent = series.indexName;

    label.append(input, swatch, text);
    fragment.appendChild(label);
  });

  controls.appendChild(fragment);
}

function renderPerformanceChart(performance) {
  const chart = document.getElementById("performanceChart");
  chart.innerHTML = "";

  const allPoints = performance.series.flatMap((series) => series.points || []);
  if (allPoints.length === 0) return;

  const width = 1000;
  const height = 460;
  const margin = { top: 24, right: 28, bottom: 58, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = allPoints.map((point) => Number(point.value)).filter(Number.isFinite);
  const dates = allPoints.map((point) => parseDate(point.date)).filter((date) => !Number.isNaN(date));
  const minTime = Math.min(...dates);
  const maxTime = Math.max(...dates);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(...values);
  const valuePadding = Math.max((maxValue - minValue) * 0.08, 100);
  const yMin = minValue;
  const yMax = maxValue + valuePadding;
  const visibleCount = performance.series.filter((series) => state.performanceSelected.has(series.indexName)).length;
  const activeSeries = state.performanceSelected.has(state.performanceActive) ? state.performanceActive : null;

  chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  chart.setAttribute("preserveAspectRatio", "xMidYMid meet");
  chart.setAttribute("aria-label", activeSeries ? `Cumulative performance line chart, ${activeSeries} highlighted` : "Cumulative performance line chart");
  chart.onpointerleave = () => {
    state.performanceActive = null;
    updatePerformanceHighlight();
  };

  const xScale = (dateValue) => margin.left + ((dateValue - minTime) / (maxTime - minTime || 1)) * plotWidth;
  const yScale = (value) => margin.top + (1 - ((value - yMin) / (yMax - yMin || 1))) * plotHeight;

  const gridGroup = svgElement("g", { class: "chart-grid" });
  const axisGroup = svgElement("g", { class: "chart-axis" });
  const lineGroup = svgElement("g", { class: "chart-lines" });
  const labelGroup = svgElement("g", { class: "chart-active-label" });

  for (const tickValue of yTicks(yMin, yMax, 5)) {
    const y = yScale(tickValue);
    gridGroup.appendChild(svgElement("line", {
      x1: margin.left,
      y1: y,
      x2: width - margin.right,
      y2: y,
    }));
    axisGroup.appendChild(svgText(margin.left - 10, y + 4, formatInr(tickValue), "end", "chart-y-label"));
  }

  for (const tickTime of xTicks(minTime, maxTime, 5)) {
    const x = xScale(tickTime);
    gridGroup.appendChild(svgElement("line", {
      x1: x,
      y1: margin.top,
      x2: x,
      y2: height - margin.bottom,
    }));
    axisGroup.appendChild(svgText(x, height - margin.bottom + 28, formatDateNumeric(new Date(tickTime).toISOString().slice(0, 10)), "middle", "chart-x-label"));
  }

  axisGroup.appendChild(svgElement("line", {
    class: "chart-domain",
    x1: margin.left,
    y1: height - margin.bottom,
    x2: width - margin.right,
    y2: height - margin.bottom,
  }));
  axisGroup.appendChild(svgElement("line", {
    class: "chart-domain",
    x1: margin.left,
    y1: margin.top,
    x2: margin.left,
    y2: height - margin.bottom,
  }));

  performance.series.forEach((series, index) => {
    if (!state.performanceSelected.has(series.indexName)) return;
    const pathData = (series.points || [])
      .filter((point) => Number.isFinite(Number(point.value)) && !Number.isNaN(parseDate(point.date)))
      .map((point, pointIndex) => {
        const command = pointIndex === 0 ? "M" : "L";
        return `${command}${xScale(parseDate(point.date)).toFixed(2)},${yScale(Number(point.value)).toFixed(2)}`;
      })
      .join(" ");

    if (!pathData) return;
    const isActive = series.indexName === activeSeries;
    const path = svgElement("path", {
      class: [
        "chart-line",
        isActive ? "is-active" : "",
        activeSeries && !isActive ? "is-dimmed" : "",
      ].filter(Boolean).join(" "),
      d: pathData,
      stroke: chartColors[index % chartColors.length],
      tabindex: "0",
      role: "img",
      "aria-label": `${series.indexName} cumulative performance`,
      "data-series-name": series.indexName,
    });
    path.addEventListener("pointerenter", () => setActivePerformanceSeries(series.indexName));
    path.addEventListener("pointerleave", () => clearActivePerformanceSeries(series.indexName));
    path.addEventListener("focus", () => setActivePerformanceSeries(series.indexName));
    path.addEventListener("blur", () => clearActivePerformanceSeries(series.indexName));
    const title = svgElement("title");
    title.textContent = series.indexName;
    path.appendChild(title);
    lineGroup.appendChild(path);

    if (isActive) {
      const lastPoint = [...(series.points || [])]
        .reverse()
        .find((point) => Number.isFinite(Number(point.value)) && !Number.isNaN(parseDate(point.date)));
      if (lastPoint) {
        const labelText = `${series.indexName}: ${formatInr(Number(lastPoint.value))}`;
        const labelWidth = Math.min(labelText.length * 7.2 + 16, width - margin.left - margin.right);
        const labelX = Math.min(xScale(parseDate(lastPoint.date)) + 10, width - margin.right - labelWidth + 8);
        const labelY = Math.max(yScale(Number(lastPoint.value)) - 12, margin.top + 16);
        labelGroup.appendChild(svgElement("rect", {
          x: labelX - 8,
          y: labelY - 18,
          width: labelWidth,
          height: 26,
          rx: 4,
        }));
        labelGroup.appendChild(svgText(labelX, labelY, labelText, "start", "chart-active-label-text"));
      }
    }
  });

  chart.append(gridGroup, axisGroup, lineGroup, labelGroup);

  if (visibleCount === 0) {
    chart.appendChild(svgText(width / 2, height / 2, "No indexes selected", "middle", "chart-empty"));
  }
}

function hasPerformanceData(performance) {
  return Boolean(
    performance &&
    performance.startDate &&
    performance.endDate &&
    Array.isArray(performance.series) &&
    performance.series.length > 0
  );
}

function setAllPerformanceSeries(checked) {
  const performance = state.data.performance;
  if (!hasPerformanceData(performance)) return;
  state.performanceSelected = new Set(checked ? performance.series.map((series) => series.indexName) : []);
  state.performanceActive = null;
  renderPerformanceControls(performance);
  renderPerformanceChart(performance);
}

function setActivePerformanceSeries(indexName) {
  if (!state.performanceSelected.has(indexName)) return;
  state.performanceActive = indexName;
  updatePerformanceHighlight();
}

function clearActivePerformanceSeries(indexName) {
  if (state.performanceActive !== indexName) return;
  state.performanceActive = null;
  updatePerformanceHighlight();
}

function updatePerformanceHighlight() {
  const performance = state.data.performance;
  if (!hasPerformanceData(performance)) return;
  renderPerformanceChart(performance);
  document.querySelectorAll(".performance-toggle").forEach((label) => {
    const isActive = label.dataset.seriesName === state.performanceActive;
    const shouldDim = Boolean(state.performanceActive) && label.dataset.seriesName !== state.performanceActive;
    label.classList.toggle("is-active", isActive);
    label.classList.toggle("is-dimmed", shouldDim);
  });
}

function renderFooter() {
  const date = new Date(state.data.generatedAt);
  document.getElementById("updatedAt").textContent = `Updated ${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function formatDateOnly(value) {
  if (!value) return "Not available";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateNumeric(value) {
  if (!value) return "Not available";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value) {
  return value === null || value === undefined ? "-" : `${percentFormat.format(value)}%`;
}

function numberOrDash(value) {
  return value === null || value === undefined ? "-" : numberFormat.format(value);
}

function formatInr(value) {
  return inrFormat.format(Number(value) || 0);
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`).getTime();
}

function yTicks(minValue, maxValue, count) {
  const step = (maxValue - minValue) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, index) => minValue + step * index);
}

function xTicks(minTime, maxTime, count) {
  const step = (maxTime - minTime) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, index) => Math.round(minTime + step * index));
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

function svgText(x, y, value, anchor, className) {
  const text = svgElement("text", {
    x,
    y,
    "text-anchor": anchor,
    class: className,
  });
  text.textContent = value;
  return text;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function setHeaderWords(th, label) {
  th.textContent = "";
  for (const word of String(label).trim().split(/\s+/)) {
    const span = document.createElement("span");
    span.textContent = word;
    th.appendChild(span);
  }
}
