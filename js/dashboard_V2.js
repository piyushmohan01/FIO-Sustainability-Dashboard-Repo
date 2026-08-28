// dashboard.js
// Translation layer: replaces Observable FileAttachment and cell execution.
// Also wires the global metric dropdown to both chart-internal selects.
// The internal chart selects remain the source of truth for activeMKey and activeMetric

document.addEventListener("DOMContentLoaded", async () => {

  const loadMsg          = document.getElementById("load-message");
  const globalSelect     = document.getElementById("global-metric-select");
  const statSFTotal      = document.getElementById("stat-sf-total");
  const statPkgMean      = document.getElementById("stat-pkg-mean");

  // Accordion logic
  // Runs immediately on DOMContentLoaded, independent of data loading.
  // openCard: closes all cards then opens the target card.
  // All bodies share the same max-height via .is-open
  // Sidebar height stays constant when switching between cards.

  const accordionCards = document.querySelectorAll(".accordion-card");

  function openCard(targetCard) {
    accordionCards.forEach(card => {
      const header = card.querySelector(".accordion-header");
      const body   = card.querySelector(".accordion-body");
      if (card === targetCard) {
        // Open this card
        card.setAttribute("data-open", "true");
        header.setAttribute("aria-expanded", "true");
        body.classList.add("is-open");
      } else {
        // Close all others
        card.setAttribute("data-open", "false");
        header.setAttribute("aria-expanded", "false");
        body.classList.remove("is-open");
      }
    });
  }

  // Attaching click handler to each accordian header button
  accordionCards.forEach(card => {
    const header = card.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      const isOpen = card.getAttribute("data-open") === "true";
      // Clicking an already-open card does nothing -- one card is
      // always open. Remove this guard to allow all-closed state.
      if (!isOpen) openCard(card);
    });
  });

  // Open the card marked data-open="true" in the HTML on first load.
  // Defaults to About card if no card has the attribute set.
  const defaultCard = document.querySelector(".accordion-card[data-open='true']")
    || accordionCards[0];
  if (defaultCard) openCard(defaultCard);

  // End accordion logic

  try {

    // Load all three JSON files in parallel
    const [l1Data, l2aDaily, l2aWeekly] = await Promise.all([
      fetch("data/L1_rolling.json").then(r => {
        if (!r.ok) throw new Error("L1_rolling.json not found");
        return r.json();
      }),
      fetch("data/L2a_daily.json").then(r => {
        if (!r.ok) throw new Error("L2a_daily.json not found");
        return r.json();
      }),
      fetch("data/L2a_weekly.json").then(r => {
        if (!r.ok) throw new Error("L2a_weekly.json not found");
        return r.json();
      })
    ]);

    const trendContainer   = document.getElementById("trend-container");
    const heatmapContainer = document.getElementById("heatmap-container");
    const width = trendContainer.getBoundingClientRect().width || 680;

    if (loadMsg) loadMsg.style.display = "none";

    // Initialise both charts and append to their containers
    const trendNode = createTrendChart(l1Data, { width });
    trendContainer.appendChild(trendNode);


    // Simple formatter for the stats panel - mirrors valFormatter in heatmap.js
    // without importing it. Kept here to keep dashboard.js self-contained.
    function fmtStat(v) {
      if (!v && v !== 0) return "\u2014";
      const abs = Math.abs(v);
      if (abs >= 1e9) return (v / 1e9).toFixed(1) + "B";
      if (abs >= 1e6) return (v / 1e6).toFixed(1) + "M";
      if (abs >= 1e3) return (v / 1e3).toFixed(1) + "K";
      if (abs < 10)   return v.toFixed(2);
      return v.toFixed(1);
    }

    const heatmapNode = createHeatmap(l2aDaily, l2aWeekly, {
      width,
      // onStats fires after every heatmap redraw - updates left panel values.
      // cfg carries unit and pkg_unit for the active metric and toggle state.
      onStats: (sfTotal, pkgAvg, cfg) => {
        if (statSFTotal)
          statSFTotal.textContent = fmtStat(sfTotal) + " " + cfg.unit;
        if (statPkgMean)
          statPkgMean.textContent = fmtStat(pkgAvg)  + " " + cfg.pkg_unit;
      }
    });
    heatmapContainer.appendChild(heatmapNode);

    ///////

    // Query the internal metric selects after charts are in the DOM.
    // These are the first select elements inside each chart container.
    // Their change handlers control activeMKey / activeMetric + redraw().
    const trendMetricSelect   = trendContainer.querySelector("select");
    const heatmapMetricSelect = heatmapContainer.querySelector("select");

    // pushMetric: sets the value on an internal select and fires its
    // change handler so the chart redraws with the new metric.
    // Using dispatchEvent(new Event("change")) triggers the D3 .on("change")
    // listener attached to the select element during chart initialisation.
    function pushMetric(selectEl, value) {
      if (!selectEl) return;
      selectEl.value = value;
      selectEl.dispatchEvent(new Event("change"));
    }

    // Global metric dropdown change handler.
    // Composite is a trend-chart-only metric, heatmap has no composite option
    // When composite is selected globally the heatmap stays on its current metric.
    // Composite Checkbox to give finer control over the trend chart independently.
    globalSelect.addEventListener("change", function () {
      const val = this.value;

      if (val === "composite") {
        // Push composite to trend chart only
        pushMetric(trendMetricSelect, "composite");
        // Heatmap: no change -- composite is not in its METRIC_OPTIONS
      } else {
        // Push to both charts for GHGE, LU, WU
        pushMetric(trendMetricSelect,   val);
        pushMetric(heatmapMetricSelect, val);
      }
    });

    // Sync on load: set global dropdown to match the default activeMetric
    // in both chart functions (both default to "GHGE" or "composite").
    // Read the current value of the internal trend select as the source
    // of truth since it was set by the chart function on initialisation.
    if (trendMetricSelect) {
      globalSelect.value = trendMetricSelect.value;
    }

  } catch (err) {
    console.error("Dashboard init error:", err);
    if (loadMsg) {
      loadMsg.textContent = "Failed to load: " + err.message
        + " — check serve.py is running and JSON files are in data/.";
      loadMsg.style.color = "#c00";
    }
  }

});