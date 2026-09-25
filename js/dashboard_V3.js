/*
- dashboard_V3.js
- Shell controller for the Sustainable Food Sales Explorer.
- Responsibilities:
- Tab switching: shows the correct right-panel and sidebar
  for each of the three tab buttons.
- Each chart loads only when its tab is opened for the first time,
  so the container has a real rendered width before the D3 function runs.
- Glossary accordion: one independent accordion per chart sidebar so
  cards in one sidebar do not affect the other.
- Data loading: fetch() calls for L1 and L2a JSON files,
  each scoped to the chart that needs them.
 *
- This file does not contain any chart drawing logic.
- Chart logic lives entirely in trend_chart_V3.js and heatmap_V3.js.
 *
- Section map:
- 1. DOMContentLoaded wrapper
- 2. Tab switching
- 3. Glossary accordion (timeline sidebar)
- 4. Glossary accordion (heatmap sidebar)
- 5. Timeline chart: deferred init
- 6. Heatmap chart: deferred init
- 7. Tab button listeners
 */

document.addEventListener('DOMContentLoaded', function () {

  /* 1. DOM REFERENCES
  Queries for all interactive elements and panels
  once the DOM is ready. Storing references here avoids
  repeated querySelectorAll calls throughout the file.

  To change: If you rename any element ID or class in
  index.html, update the matching selector here.
  */

  const tabBtns      = document.querySelectorAll('.tab-btn');
  const tabPanels    = document.querySelectorAll('.tab-panel');
  const sidebarInners= document.querySelectorAll('.sidebar-inner');
  const loadMsg      = document.getElementById('load-message');


  /* 2. TAB SWITCHING
  activateTab() reads the target panel ID and
  sidebar ID from the clicked button's data attributes, then
  iterates all panels and sidebars, showing the matching ones
  and hiding the rest using CSS classes. The active button
  state is also updated here.

  Called from the tab button listeners in Section 7. Also
  called directly at the bottom of this file to set the
  initial state without requiring a click.

  To change:
  - Changing the default active tab: update the tab-btn-active
    class in index.html and call activateTab() with the new
    panel and sidebar IDs at the bottom of this section.
  */

  function activateTab(targetPanelId, targetSidebarId) {

    // Show the matching right-panel tab div, hide all others
    tabPanels.forEach(function (panel) {
      panel.classList.toggle('tab-panel-hidden', panel.id !== targetPanelId);
    });

    // Show the matching sidebar inner div, hide all others
    sidebarInners.forEach(function (inner) {
      inner.classList.toggle(
        'sidebar-inner-hidden',
        inner.id !== targetSidebarId
      );
    });

    // Mark the clicked tab button as active, clear others
    tabBtns.forEach(function (btn) {
      btn.classList.toggle(
        'tab-btn-active',
        btn.dataset.panel === targetPanelId
      );
    });
    // Sync glossary: open the same card index in the incoming sidebar.
    // Both sidebars have the same 7 cards in the same order so the
    // index maps directly between them without any translation.
    if (targetSidebarId === 'sidebar-timeline' &&
        timelineCards[activeGlossaryIndex]) {
      openGlossaryCardTimeline(timelineCards[activeGlossaryIndex]);
    } else if (targetSidebarId === 'sidebar-heatmap' &&
               heatmapCards[activeGlossaryIndex]) {
      openGlossaryCardHeatmap(heatmapCards[activeGlossaryIndex]);
    }
  }


  /* 3. GLOSSARY ACCORDION - TIMELINE SIDEBAR
  Finds all .glossary-card elements inside
  #sidebar-timeline only, so that clicks on the timeline
  accordion do not affect the heatmap accordion (which has
  its own identical set of cards in a separate sidebar div).
  openGlossaryCardTimeline() closes all cards in this group,
  then opens the one that was clicked.

  To change:
  - Adding a new glossary term: copy a .glossary-card block
    inside #sidebar-timeline in index.html.
  - Changing which card is open by default: set
    data-open="true" on the desired .glossary-card in
    index.html. Only one card should have data-open="true".
  */

  const timelineCards = document.querySelectorAll(
    '#sidebar-timeline .glossary-card'
  );

  // Shared across both sidebars. When a card opens in either accordion,
  // this index is updated. activateTab() reads it to open the same
  // position in whichever sidebar is about to become visible.
  let activeGlossaryIndex = 0;

  function openGlossaryCardTimeline(target) {
    timelineCards.forEach(function (card, i) {
      const body   = card.querySelector('.glossary-body');
      const isOpen = card === target;
      card.setAttribute('data-open', isOpen ? 'true' : 'false');
      body.classList.toggle('is-open', isOpen);
      if (isOpen) activeGlossaryIndex = i;
    });
  }

  timelineCards.forEach(function (card) {
    card.querySelector('.glossary-header')
      .addEventListener('click', function () {
        const alreadyOpen = card.getAttribute('data-open') === 'true';
        if (!alreadyOpen) openGlossaryCardTimeline(card);
      });
  });

  // Open the default card (whichever has data-open="true" in HTML)
  const defaultTimelineCard = document.querySelector(
    "#sidebar-timeline .glossary-card[data-open='true']"
  );
  if (defaultTimelineCard) openGlossaryCardTimeline(defaultTimelineCard);


  /* 4. GLOSSARY ACCORDION - HEATMAP SIDEBAR
  Identical logic to Section 3 but scoped to
  #sidebar-heatmap. The two accordions are fully independent -
  opening a card in one sidebar has no effect on the other.

  To change: Same as Section 3 but edit cards inside
  #sidebar-heatmap in index.html.
  */

  const heatmapCards = document.querySelectorAll(
    '#sidebar-heatmap .glossary-card'
  );

  function openGlossaryCardHeatmap(target) {
    heatmapCards.forEach(function (card, i) {
      const body   = card.querySelector('.glossary-body');
      const isOpen = card === target;
      card.setAttribute('data-open', isOpen ? 'true' : 'false');
      body.classList.toggle('is-open', isOpen);
      if (isOpen) activeGlossaryIndex = i;
    });
  }

  heatmapCards.forEach(function (card) {
    card.querySelector('.glossary-header')
      .addEventListener('click', function () {
        const alreadyOpen = card.getAttribute('data-open') === 'true';
        if (!alreadyOpen) openGlossaryCardHeatmap(card);
      });
  });

  const defaultHeatmapCard = document.querySelector(
    "#sidebar-heatmap .glossary-card[data-open='true']"
  );
  if (defaultHeatmapCard) openGlossaryCardHeatmap(defaultHeatmapCard);


  /* 5. TIMELINE CHART - DEFERRED INIT
  Fetches L1_rolling_updated.json and calls
  createTrendChart() only on the first activation of the
  'Overall Seasonal Patterns' tab. The trendReady flag
  prevents a second fetch+render if the user switches tabs
  back and forth. The container width is read after the panel
  is visible so getBoundingClientRect() returns a real value.

  To change:
  - Data file path: update the fetch() URL below if the
    JSON file is renamed or moved to a different folder.
  - Chart function: createTrendChart() is defined in
    trend_chart_V3.js. Its signature is
    createTrendChart(data, { width }).
  - Error message: edit the string in loadMsg.textContent.
  */

  let trendReady = false;

  async function initTrend() {

    // Guard: only initialise once
    if (trendReady) return;
    trendReady = true;

    const trendContainer = document.getElementById('trend-container');

    try {

      if (loadMsg) loadMsg.style.display = 'block';

      // Fetch the 52-row weekly bin trend data
      const L1_NUM_COLS = [
        'binavg_GHGE_SF',   'binavg_LU_SF',   'binavg_WU_SF',
        'binavg_composite_norm',
        'binavg_GHGE_perkg', 'binavg_LU_perkg', 'binavg_WU_perkg',
        'binavg_composite_intensity_norm',
      ];
      const l1Data = await d3.csv('data/L1_weekly_bins.csv', function (d) {
        L1_NUM_COLS.forEach(function (col) {
          d[col] = (d[col] === '' || d[col] == null) ? null : +d[col];
        });
        return d;   // week_start remains a string for parseDate()
      });
      if (!l1Data || !l1Data.length) {
        throw new Error('L1_weekly_bins.csv loaded empty -- check data/ folder');
      }

      if (loadMsg) loadMsg.style.display = 'none';

      // Read container width after panel is visible.
      // The right-panel always-visible scrollbar (in CSS) keeps
      // this value stable so the SVG width never exceeds the column.
      const chartSection = trendContainer.closest('.chart-section');
      const sectionW     = chartSection
        ? chartSection.getBoundingClientRect().width - 48
        : 0;
      const width = Math.max(sectionW || trendContainer.getBoundingClientRect().width, 320);

      // createTrendChart() is defined in trend_chart_V3.js
      // It returns a DOM node that is appended to the container
      const trendNode = createTrendChart(l1Data, { width });
      trendContainer.appendChild(trendNode);

    } catch (err) {
      console.error('Timeline chart init error:', err);
      if (loadMsg) {
        loadMsg.textContent =
          'Failed to load timeline chart: ' + err.message +
          ' - check that serve.py is running and data/ files are present.';
        loadMsg.style.color  = '#c00';
        loadMsg.style.display = 'block';
      }
      // Reset the ready flag so the user can retry by switching tabs
      trendReady = false;
    }
  }


  /* 6. HEATMAP CHART - INIT
  L2a_weekly_updated.json and calls
  createHeatmap() only on the first activation of the
  'Category-level Patterns' tab. Fully independent from
  initTrend() - either chart can be opened first without
  triggering the other.

  The onStats callback is included here. It fires after every
  heatmap redraw and updates reference stat elements if they
  exist in the DOM. Currently those elements are inside the
  chart legend block, so the callback body can remain empty
  or be removed if stats are not displayed outside the chart.

  To change:
  - Data file path: update the fetch() URL below.
  - Chart function: createHeatmap() is defined in
    heatmap_V3.js. Its signature is
    createHeatmap(weeklyData, { width, onStats }).
  */

  let heatmapReady = false;

  async function initHeatmap() {

    // Guard: only initialise once
    if (heatmapReady) return;
    heatmapReady = true;

    const heatmapContainer = document.getElementById('heatmap-container');

    try {

      // Fetch the weekly 30-category heatmap data
      const l2aWeekly = await d3.csv('data/L2a_weekly_30cat.csv', function (d) {
        Object.keys(d).forEach(function (key) {
          if (key !== 'week_start' && key !== 'lcfs_cat') {
            d[key] = (d[key] === '' || d[key] == null) ? null : +d[key];
          }
        });
        return d;
      });
      if (!l2aWeekly || !l2aWeekly.length) {
        throw new Error('L2a_weekly_30cat.csv loaded empty -- check data/ folder');
      }

      // Read container width after panel is visible
      const hmSection = heatmapContainer.closest('.chart-section');
      const hmSectW   = hmSection
        ? hmSection.getBoundingClientRect().width - 48
        : 0;
      const heatmapWidth = Math.max(
        hmSectW || heatmapContainer.getBoundingClientRect().width,
        320
      );

      // createHeatmap() is defined in heatmap_V3.js
      const heatmapNode = createHeatmap(l2aWeekly, {
        width: heatmapWidth,
      });

      heatmapContainer.appendChild(heatmapNode);

    } catch (err) {
      console.error('Heatmap chart init error:', err);
      const errMsg = document.createElement('p');
      errMsg.textContent =
        'Failed to load heatmap chart: ' + err.message +
        ' - check that serve.py is running and data/ files are present.';
      errMsg.style.color    = '#c00';
      errMsg.style.fontSize = '13px';
      heatmapContainer.appendChild(errMsg);
      // Reset the ready flag so the user can retry
      heatmapReady = false;
    }
  }


  /* 7. TAB BUTTON LISTENERS 
  Attaches a click listener to every .tab-btn.
  On click it reads data-panel and data-sidebar from the
  button, calls activateTab() to switch visible content,
  then triggers the appropriate chart init function if the
  chart tab was clicked. Chart inits are guarded by their
  ready flags so repeated tab clicks do not re-fetch data.

  To change:
  - Adding a chart to a new tab: add an else-if branch below
    matching the new data-panel value and call a new init
    function following the same pattern as initTrend and
    initHeatmap.
  - Changing which tab is active on page load: update the
    tab-btn-active class in index.html (not here). The
    activateTab() call at the end of this section reads
    the active button from the DOM.
  */

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {

      const targetPanel   = btn.dataset.panel;
      const targetSidebar = btn.dataset.sidebar;

      // Switch panels and sidebar content
      activateTab(targetPanel, targetSidebar);

      // Trigger chart init on first activation of each chart tab
      if (targetPanel === 'timeline-panel') {
        initTrend();
      } else if (targetPanel === 'heatmap-panel') {
        initHeatmap();
      }
    });
  });

  /* Set initial state from whichever button carries tab-btn-active
     in the HTML. This runs once on page load without a click event
     so the correct panel and sidebar are visible from the start. */
  const activeBtn = document.querySelector('.tab-btn-active');
  if (activeBtn) {
    activateTab(activeBtn.dataset.panel, activeBtn.dataset.sidebar);
  }

  // ─── End of DOMContentLoaded ─────────────────────────────────────────
});


/* UTILITY - STAT FORMATTER
Technical: Compact number formatter for reference stat values
shown in chart legend blocks (annual means). Kept outside
DOMContentLoaded so it is available as a global if chart JS
files need to reference it, though currently it is only used
internally in the heatmap chart's own hmStatFmt function.

To change: Adjust the thresholds (1e6, 1e3) or decimal
places (the .2f, .0f format strings) to change how large
numbers are displayed. "million" and "K" are the written
suffixes used to keep tooltip labels readable. */

function fmtStat(v) {
  if (v == null || isNaN(v)) return '-';
  const abs = Math.abs(v);
  if (abs >= 1e6) return d3.format('.2f')(v / 1e6) + ' million';
  if (abs >= 1e3) return d3.format('.0f')(v / 1e3) + 'K';
  if (abs >= 10)  return d3.format('.1f')(v);
  return d3.format('.2f')(v);
}