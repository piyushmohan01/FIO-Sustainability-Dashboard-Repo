// FIO Food Dashboard: LCFS Category Heatmap HM-V1.6
// Per-kg cells use roll7_{M}_perkg (smoothed, matching trend chart).
// Per-kg colour uses d3.scaleDiverging centred on annual mean per category.

// onStats: optional callback fired at the end of every redraw.
// Receives (periodSFTotal, periodPkgAvg, cfg) so the dashboard can
// display reference values outside the chart SVG.

function createHeatmap(dailyData, weeklyData, { width = 960, onStats = null } = {}) {

  // 1a Config

  const METRICS = {
    GHGE: {
      col                 : "roll7_GHGE_SF",
      pkg_col             : "roll7_GHGE_perkg",       // smoothed: matches trend chart
      rank_col            : "GHGE_rank_on_day",
      weekly_col          : "GHGE_weekly_mean",
      weekly_pkg_col      : "GHGE_perkg_weekly_mean",
      weekly_rank_col     : "GHGE_weekly_rank",
      annual_rank_col     : "GHGE_annual_rank",
      pkg_annual_rank_col : "GHGE_perkg_annual_rank",
      min_col             : "GHGE_annual_min",
      max_col             : "GHGE_annual_max",
      pkg_min_col         : "GHGE_perkg_annual_min",
      pkg_max_col         : "GHGE_perkg_annual_max",
      pkg_max_abs_dev_col : "GHGE_perkg_max_abs_dev",
      mean_col            : "GHGE_annual_mean",
      pkg_mean_col        : "GHGE_perkg_annual_mean",
      share_col           : "GHGE_annual_share",
      pct_col             : "GHGE_pct_from_annual_mean",
      pkg_pct_col         : "GHGE_perkg_pct_from_annual_mean",
      label               : "GHGE Sales Footprint (kg CO\u2082-eq/day)",
      pkg_label           : "GHGE per kg sold (kg CO\u2082-eq/kg)",
      short               : "GHGE",
      unit                : "kg CO\u2082-eq/day",
      pkg_unit            : "kg CO\u2082-eq/kg",
      interpolator        : d3.interpolateYlGn,
      // pkg_interpolator    : d3.interpolatePiYG
      pkg_interpolator    : t => (t < 0.5
        ? d3.interpolateRgb("#f4baf6","#ffffff")(t * 2)
        : d3.interpolateRgb("#ffffff","#2ca02c")((t - 0.5) * 4))
    },
    LU: {
      col                 : "roll7_LU_SF",
      pkg_col             : "roll7_LU_perkg",
      rank_col            : "LU_rank_on_day",
      weekly_col          : "LU_weekly_mean",
      weekly_pkg_col      : "LU_perkg_weekly_mean",
      weekly_rank_col     : "LU_weekly_rank",
      annual_rank_col     : "LU_annual_rank",
      pkg_annual_rank_col : "LU_perkg_annual_rank",
      min_col             : "LU_annual_min",
      max_col             : "LU_annual_max",
      pkg_min_col         : "LU_perkg_annual_min",
      pkg_max_col         : "LU_perkg_annual_max",
      pkg_max_abs_dev_col : "LU_perkg_max_abs_dev",
      mean_col            : "LU_annual_mean",
      pkg_mean_col        : "LU_perkg_annual_mean",
      share_col           : "LU_annual_share",
      pct_col             : "LU_pct_from_annual_mean",
      pkg_pct_col         : "LU_perkg_pct_from_annual_mean",
      label               : "Land Use Sales Footprint (m\u00b2\u00b7yr/day)",
      pkg_label           : "Land Use per kg sold (m\u00b2\u00b7yr/kg)",
      short               : "Land Use",
      unit                : "m\u00b2\u00b7yr/day",
      pkg_unit            : "m\u00b2\u00b7yr/kg",
      interpolator        : d3.interpolateYlOrBr,
      // pkg_interpolator    : d3.interpolatePuOr
      pkg_interpolator    : t => (t < 0.5
        ? d3.interpolateRgb("#a9d8e9","#ffffff")(t * 2)
        : d3.interpolateRgb("#ffffff","#ff7f0e")((t - 0.5) * 4))
    },
    WU: {
      col                 : "roll7_WU_SF",
      pkg_col             : "roll7_WU_perkg",
      rank_col            : "WU_rank_on_day",
      weekly_col          : "WU_weekly_mean",
      weekly_pkg_col      : "WU_perkg_weekly_mean",
      weekly_rank_col     : "WU_weekly_rank",
      annual_rank_col     : "WU_annual_rank",
      pkg_annual_rank_col : "WU_perkg_annual_rank",
      min_col             : "WU_annual_min",
      max_col             : "WU_annual_max",
      pkg_min_col         : "WU_perkg_annual_min",
      pkg_max_col         : "WU_perkg_annual_max",
      pkg_max_abs_dev_col : "WU_perkg_max_abs_dev",
      mean_col            : "WU_annual_mean",
      pkg_mean_col        : "WU_perkg_annual_mean",
      share_col           : "WU_annual_share",
      pct_col             : "WU_pct_from_annual_mean",
      pkg_pct_col         : "WU_perkg_pct_from_annual_mean",
      label               : "Water Use Sales Footprint (L/day)",
      pkg_label           : "Water Use per kg sold (L/kg)",
      short               : "Water Use",
      unit                : "L/day",
      pkg_unit            : "L/kg",
      interpolator        : d3.interpolateYlGnBu,
      // pkg_interpolator    : d3.interpolateRdBu
      // pkg_interpolator    : d3.interpolateBrBG
      pkg_interpolator    : t => (t < 0.5
        ? d3.interpolateRgb("#f6b4d1","#ffffff")(t * 2)
        : d3.interpolateRgb("#ffffff","#88bced")((t - 0.5) * 8))
    }
  };

  const METRIC_OPTIONS = [
    { key: "GHGE", display: "GHGE (Greenhouse Gas Emissions)" },
    { key: "LU",   display: "LU (Land Use)"                   },
    { key: "WU",   display: "WU (Water Use)"                  }
  ];

  // CAT_GAPS: maps activeN to breathing gap between row groups (px).
  // Change values here to adjust grid spacing per category count.
  const CAT_GAPS = { 10: 0, 20: 4, 30: 5, 40: 7, 65: 10 };

  const EVENTS = [
    { date: "2023-04-09", label: "Easter Sunday"        },
    { date: "2023-06-02", label: "Jubilee Bank Holiday" },
    { date: "2023-09-18", label: "Queen's Funeral BH"   },
    { date: "2023-10-31", label: "Halloween"             },
    { date: "2023-12-25", label: "Christmas Day"         }
  ];

  const MIN_CHART_H    = 270;
  const MAX_CHART_H    = 1200;
  const GAP            = 2;
  const MONTH_GAP      = 0;
  const ROW_GROUP_SIZE = 5;
  const MIN_ROW_H      = 8;
  const DIM_OPACITY    = 1;   // Set to 1 = No Dimming on Hover
  const MISSING_FILL   = "#f5f5f5";

  const LABEL_WIDTH    = 154;
  const MARGIN = { top: 62, right: 0, bottom: 72, left: LABEL_WIDTH };

  const CAT_OPTIONS  = [10, 30, 65];
  const VIEW_OPTIONS = [
    { key: "weekly", display: "Weekly" },
    { key: "daily",  display: "Daily"  }
  ];

  let activeMetric = "GHGE";
  let activeView   = "weekly";
  let activeN      = 30;
  let activePkg    = false;


  // 1b Parse and build lookup maps

  const parseDate = d3.timeParse("%Y-%m-%d");
  const fmtDate   = d3.timeFormat("%d %b %Y");
  const fmtMonth  = d3.timeFormat("%b");
  const fmtInput  = d3.timeFormat("%Y-%m-%d");

  const allCats = Array.from(new Set(dailyData.map(r => r.lcfs_cat)));

  const dailyMap  = new Map();
  const annualRef = new Map();
  allCats.forEach(cat => dailyMap.set(cat, new Map()));

  dailyData.forEach(r => {
    if (dailyMap.has(r.lcfs_cat)) {
      dailyMap.get(r.lcfs_cat).set(r.date, r);
      if (!annualRef.has(r.lcfs_cat)) annualRef.set(r.lcfs_cat, r);
    }
  });

  const weeklyMap = new Map();
  allCats.forEach(cat => weeklyMap.set(cat, new Map()));
  weeklyData.forEach(r => {
    if (weeklyMap.has(r.lcfs_cat))
      weeklyMap.get(r.lcfs_cat).set(r.week_start, r);
  });

  // Date bounds from exported data, both default to DATA_START / DATA_END
  // since Python now exports only rows within that range.
  const allDateStrs = [...new Set(dailyData.map(r => r.date))].sort();
  const allDates    = allDateStrs.map(s => parseDate(s));
  const dateMinStr  = allDateStrs[0];
  const dateMaxStr  = allDateStrs[allDateStrs.length - 1];

  // All week_start strings from the weekly file -- full year Jan-01 anchored.
  const allWeekStrs = [...new Set(weeklyData.map(r => r.week_start))].sort();
  
  const weekMonthMap = new Map();
  weeklyData.forEach(r => {
    if (!weekMonthMap.has(r.week_start))
      weekMonthMap.set(r.week_start, r.calendar_month);
  });


  // 1c Helpers
  
  // Jan-01 anchored week start for a given Date object.
  // Matches the Python get_week_start() logic exactly.
  function getJanAnchoredWeekStart(date) {
    const jan1       = new Date(date.getFullYear(), 0, 1);
    jan1.setHours(0, 0, 0, 0);
    const dayOfYear  = Math.floor((date - jan1) / 86400000);
    const binStart   = new Date(jan1.getTime() + Math.floor(dayOfYear / 7) * 7 * 86400000);
    return binStart;
  }

  // weekMajorityMonth retired, month gaps now driven by calendar 1st
  // getDisplayMonth retired, no longer needed for gap calculation

  function computeRowYStarts(N, ROW_H, groupGapPx) {
    let y = 0;
    return Array.from({ length: N }, (_, i) => {
      const start = y;
      y += ROW_H + GAP;
      if ((i + 1) % ROW_GROUP_SIZE === 0 && i < N - 1) y += groupGapPx;
      return start;
    });
  }

  function findRowIdx(my, rowYStarts, ROW_H) {
    for (let i = 0; i < rowYStarts.length; i++) {
      if (my >= rowYStarts[i] && my < rowYStarts[i] + ROW_H) return i;
    }
    return -1;
  }

  function valFormatter(v) {
    if (v === null || v === undefined || isNaN(v)) return "\u2014";
    const abs = Math.abs(v);
    if (abs >= 1e9) return d3.format(".1s")(v).replace("G","B");
    if (abs >= 1e6) return d3.format(".1s")(v);
    if (abs >= 1e3) return d3.format(".1s")(v);
    // 10-99 range: one decimal preserves precision for per-kg LU and WU
    if (abs >= 10)  return d3.format(".1f")(v);
    // below 10: two decimals covers per-kg GHGE range of 4-6
    return d3.format(".2f")(v);
  }

  function pctFormatter(v) {
    if (v === null || v === undefined || isNaN(v)) return "\u2014";
    return (v >= 0 ? "+" : "") + d3.format(".1f")(v) + "%";
  }


  // 1d Container and controls 

  const container = d3.create("div")
    .style("font-family","sans-serif").style("position","relative");

  const ctrlRow = container.append("div")
    .style("display","flex").style("align-items","center")
    .style("gap","10px").style("flex-wrap","wrap")
    .style("margin-bottom","20px");

  const metricSelect = ctrlRow.append("select")
    .style("font-size","14px").style("padding","4px 8px")
    .style("border-radius","4px").style("border","1px solid #ccc")
    .style("background","white").style("cursor","pointer")
    .on("change", function() {
      activeMetric = d3.select(this).property("value"); redraw();
    });

  METRIC_OPTIONS.forEach(({ key, display }) => {
    metricSelect.append("option")
      .attr("value",key).property("selected", key===activeMetric).text(display);
  });

  // Per-kg pill: identical to trend chart.
  const pkgPill = ctrlRow.append("div")
    .style("display","flex").style("border","1px solid #ccc")
    .style("border-radius","4px").style("overflow","hidden");

  const btnTotal = pkgPill.append("button").text("Total SF")
    .style("font-size","14px").style("padding","4px 10px")
    .style("border","none").style("cursor","pointer")
    .style("transition","background 0.15s, color 0.15s");

  const btnPkg = pkgPill.append("button").text("Per kg")
    .style("font-size","14px").style("padding","4px 10px")
    .style("border","none").style("border-left","1px solid #ccc")
    .style("cursor","pointer")
    .style("transition","background 0.15s, color 0.15s");

  function syncPkgToggle() {
    btnTotal.style("background", !activePkg ? "#555" : "#fff")
            .style("color",      !activePkg ? "#fff" : "#555");
    btnPkg  .style("background",  activePkg ? "#555" : "#fff")
            .style("color",       activePkg ? "#fff" : "#555");
  }
  btnTotal.on("click", function() {
    if (activePkg)  { activePkg = false; syncPkgToggle(); redraw(); }
  });
  btnPkg.on("click", function() {
    if (!activePkg) { activePkg = true;  syncPkgToggle(); redraw(); }
  });
  syncPkgToggle();

  ctrlRow.append("div")
    .style("width","1px").style("height","18px")
    .style("background","#ddd").style("margin","0 2px");

  ctrlRow.append("span").style("font-size","14px").style("color","#666").text("From:");

  const startPicker = ctrlRow.append("input")
    .attr("type","date").attr("value",dateMinStr)
    .attr("min",dateMinStr).attr("max",dateMaxStr)
    .style("font-size","14px").style("padding","3px 6px")
    .style("border-radius","4px").style("border","1px solid #ccc")
    .on("change", function() {
      if (this.value > endPicker.property("value"))
        this.value = endPicker.property("value");
      redraw();
    });

  ctrlRow.append("span").style("font-size","14px").style("color","#666").text("To:");

  const endPicker = ctrlRow.append("input")
    .attr("type","date").attr("value",dateMaxStr)
    .attr("min",dateMinStr).attr("max",dateMaxStr)
    .style("font-size","14px").style("padding","3px 6px")
    .style("border-radius","4px").style("border","1px solid #ccc")
    .on("change", function() {
      if (this.value < startPicker.property("value"))
        this.value = startPicker.property("value");
      redraw();
    });

  const resetBtn = ctrlRow.append("button").text("Reset")
    .style("font-size","14px").style("padding","4px 10px")
    .style("border-radius","4px").style("border","1px solid #bbb")
    .style("background","#fff").style("color","#555").style("cursor","pointer")
    .on("click", function() {
      startPicker.property("value", dateMinStr);
      endPicker.property("value",   dateMaxStr);
      redraw();
    });

  // ctrlRow.append("div")
  //   .style("width","1px").style("height","18px")
  //   .style("background","#ddd").style("margin","0 2px")
  //   .style("flex","0 0 100%")
  //   .style("width","100%")
  //   .style("height","0");

  ctrlRow.append("span").style("font-size","14px")
  .style("color","#666").style("margin-top", "0px").text("View:");

  const viewSelect = ctrlRow.append("select")
    .style("font-size","14px").style("padding","4px 8px")
    .style("border-radius","4px").style("border","1px solid #ccc")
    .style("background","white").style("cursor","pointer")
    .style("margin-top", "0px")
    .on("change", function() {
      activeView = d3.select(this).property("value"); redraw();
    });
    

  VIEW_OPTIONS.forEach(({ key, display }) => {
    viewSelect.append("option")
      .attr("value",key).property("selected", key===activeView).text(display);
  });

  ctrlRow.append("div")
    .style("width","1px").style("height","18px")
    .style("background","#ddd").style("margin","0 2px")
    .style("margin-top", "0px");
    
  ctrlRow.append("span").style("font-size","14px")
  .style("margin-top", "0px").style("color","#666").text("Show:");

  const catSelect = ctrlRow.append("select")
    .style("font-size","14px").style("padding","4px 8px")
    .style("border-radius","4px").style("border","1px solid #ccc")
    .style("background","white").style("cursor","pointer")
    .style("margin-top", "0px")
    .on("change", function() {
      activeN = +d3.select(this).property("value"); redraw();
    });

  CAT_OPTIONS.forEach(n => {
    catSelect.append("option")
      .attr("value",n).property("selected", n===activeN)
      .text(`Top ${n} categories`);
  });

  function syncResetButton() {
    const atFull = startPicker.property("value") === dateMinStr &&
                   endPicker.property("value")   === dateMaxStr;
    resetBtn
      .attr("disabled",        atFull ? true  : null)
      .style("opacity",        atFull ? "0.35": "1")
      .style("cursor",         atFull ? "not-allowed" : "pointer")
      .style("pointer-events", atFull ? "none"        : "auto");
  }

  const titleDiv = container.append("div")
    .style("font-size","16px").style("font-weight","600")
    .style("margin-bottom","4px");

  const subtitleDiv = container.append("div")
    .style("font-size","13px").style("color","#999")
    .style("margin-bottom","10px");


  // 1e SVG shell

  const W = width - MARGIN.left - 50; 

  const svg = container.append("svg")
    .attr("width", width + 100)
    .style("overflow","visible");

  const defs   = svg.append("defs");
  const lgGrad = defs.append("linearGradient")
    .attr("id","hm-v16-legend-grad")
    .attr("x1","0%").attr("x2","100%");

  const g = svg.append("g")
    .attr("transform",`translate(${MARGIN.left },${MARGIN.top})`);

  const dividerGroup = g.append("g").attr("class","dividers");
  const cellGroup    = g.append("g").attr("class","cells");
  const monthGroup   = g.append("g").attr("class","months");
  const labelGroup   = g.append("g").attr("class","cat-labels");
  const rankGroup    = g.append("g").attr("class","rank-axis");
  const eventGroup   = g.append("g").attr("class","events");
  const axisLegGroup = g.append("g").attr("class","axis-leg");

  const overlay = g.append("rect")
    .attr("width", W).attr("fill","none")
    .style("pointer-events","all");

  const tooltip = container.append("div")
    .style("position","absolute").style("pointer-events","none")
    .style("background","rgba(255,255,255,0.97)")
    .style("border","1px solid #ccc").style("border-radius","6px")
    .style("padding","8px 12px").style("font-size","14px")
    .style("line-height","1.8")
    .style("box-shadow","0 2px 8px rgba(0,0,0,0.12)")
    .style("display","none").style("max-width","260px").style("z-index","10");

  const evtTooltip = container.append("div")
    .style("position","absolute").style("pointer-events","none")
    .style("background","rgba(255,255,255,0.97)")
    .style("border","1px solid #ddd").style("border-radius","5px")
    .style("padding","5px 9px").style("font-size","14px")
    .style("line-height","1.5")
    .style("box-shadow","0 1px 6px rgba(0,0,0,0.10)")
    .style("display","none").style("max-width","200px").style("z-index","11");


  // 1f redraw

  function redraw() {

    [dividerGroup, cellGroup, monthGroup, labelGroup,
     rankGroup, eventGroup, axisLegGroup].forEach(g2 => g2.selectAll("*").remove());

    const cfg = METRICS[activeMetric];

    // Resolve active column names from current state.
    // Every column reference in redraw() derives from this block only.
    const activeInterp      = cfg.interpolator;
    const activeLabel       = activePkg ? cfg.pkg_label          : cfg.label;
    const activeUnit        = activePkg ? cfg.pkg_unit           : cfg.unit;
    const activeRankCol     = activePkg ? null                   : cfg.rank_col;
    const activeAnnRankCol  = activePkg ? cfg.pkg_annual_rank_col: cfg.annual_rank_col;
    const activeMinCol      = activePkg ? cfg.pkg_min_col        : cfg.min_col;
    const activeMaxCol      = activePkg ? cfg.pkg_max_col        : cfg.max_col;
    const activeMeanCol     = activePkg ? cfg.pkg_mean_col       : cfg.mean_col;
    const activePctCol      = activePkg ? cfg.pkg_pct_col        : cfg.pct_col;
    const activeWkCol       = activePkg ? cfg.weekly_pkg_col     : cfg.weekly_col;
    const activeDivCol      = cfg.pkg_max_abs_dev_col;  // diverging half-width

    const dFrom = new Date(startPicker.property("value") + "T00:00:00");
    const dTo   = new Date(endPicker.property("value")   + "T00:00:00");
    const filteredDates = allDates.filter(d => d >= dFrom && d <= dTo);
    if (!filteredDates.length) return;

    // Category sort: pre-computed annual rank from annualRef, no d3.rollup.
    const sortedCats = [...allCats]
      .sort((a, b) => {
        const ra = annualRef.get(a)?.[activeAnnRankCol] ?? 99;
        const rb = annualRef.get(b)?.[activeAnnRankCol] ?? 99;
        return ra - rb;
      })
      .slice(0, activeN);

    const N_CATS     = sortedCats.length;
    const groupGapPx = CAT_GAPS[activeN] ?? 0;
    const nGroupGaps = Math.floor((N_CATS - 1) / ROW_GROUP_SIZE);
    const chart_H    = MIN_CHART_H + ((N_CATS - 10) / 55) * (MAX_CHART_H - MIN_CHART_H);
    const available  = chart_H - (N_CATS - 1) * GAP - nGroupGaps * groupGapPx;
    const ROW_H      = Math.max(available / N_CATS, MIN_ROW_H);
    const rowYStarts = computeRowYStarts(N_CATS, ROW_H, groupGapPx);

    svg.attr("height", chart_H + MARGIN.top + MARGIN.bottom);
    overlay.attr("height", chart_H);

    // Build display columns and values from pre-computed JSON rows.
    let displayDates, displayValues;

    if (activeView === "weekly") {
      const weekKeys = allWeekStrs.filter(wk => {
        const wd = parseDate(wk);
        const we = new Date(wd.getTime() + 6 * 86400000);
        return wd <= dTo && we >= dFrom;
      });
      displayDates = weekKeys.map(s => parseDate(s));

      displayValues = new Map();
      sortedCats.forEach(cat => {
        const wkMap = weeklyMap.get(cat);
        const m     = new Map();
        weekKeys.forEach(wk => {
          const row = wkMap?.get(wk);
          if (row && row[activeWkCol] !== null)
            m.set(wk, {
              value    : row[activeWkCol],
              rank     : row[cfg.weekly_rank_col],
              share    : row[cfg.share_col],
              pct      : row[activePctCol],
              ann_mean : row[activeMeanCol]
            });
        });
        displayValues.set(cat, m);
      });
    } else {
      displayDates  = filteredDates;
      displayValues = new Map();
      sortedCats.forEach(cat => {
        const dm = dailyMap.get(cat);
        const m  = new Map();
        filteredDates.forEach(d => {
          const key = fmtInput(d);
          const row = dm?.get(key);
          if (row) m.set(key, {
            value    : row[activePkg ? cfg.pkg_col : cfg.col],
            rank     : activeRankCol ? row[activeRankCol] : null,
            share    : row[cfg.share_col],
            pct      : row[activePctCol],
            ann_mean : row[activeMeanCol]
          });
        });
        displayValues.set(cat, m);
      });
    }

    const N_COLS = displayDates.length;
    if (!N_COLS) return;

    // Period baseline: sum of active SF metric across all 65 categories
    // and mean of active per-kg metric across all 65 categories.
    // Uses all categories (allCats), not just the visible top-N.
    let periodSFTotal  = 0;
    let periodPkgSum   = 0;
    let periodPkgCount = 0;

    if (activeView === "weekly") {
      const weekKeysAll = allWeekStrs.filter(wk => {
        const wd = parseDate(wk);
        const we = new Date(wd.getTime() + 6 * 86400000);
        return wd <= dTo && we >= dFrom;
      });
      allCats.forEach(cat => {
        const wm = weeklyMap.get(cat);
        weekKeysAll.forEach(wk => {
          const row = wm?.get(wk);
          if (!row) return;
          if (row[cfg.weekly_col] !== null && !isNaN(row[cfg.weekly_col]))
            periodSFTotal += row[cfg.weekly_col];
          if (row[cfg.weekly_pkg_col] !== null && !isNaN(row[cfg.weekly_pkg_col])) {
            periodPkgSum += row[cfg.weekly_pkg_col];
            periodPkgCount++;
          }
        });
      });
    } else {
      allCats.forEach(cat => {
        const dm = dailyMap.get(cat);
        filteredDates.forEach(d => {
          const row = dm?.get(fmtInput(d));
          if (!row) return;
          if (row[cfg.col] !== null && !isNaN(row[cfg.col]))
            periodSFTotal += row[cfg.col];
          if (row[cfg.pkg_col] !== null && !isNaN(row[cfg.pkg_col])) {
            periodPkgSum += row[cfg.pkg_col];
            periodPkgCount++;
          }
        });
      });
    }

    const periodPkgAvg = periodPkgCount > 0 ? periodPkgSum / periodPkgCount : 0;

    // Fire onStats if provided -- passes raw numbers and active cfg so
    // the caller can format and display values however it needs to.
    if (typeof onStats === "function") {
      onStats(periodSFTotal, periodPkgAvg, cfg);
    }

    // Month gap layout
    // Month gap on calendar 1st: a gap appears before any column that
    // contains the 1st of a month. The first column never gets a gap.
    // Daily: gap before columns where date.getDate() === 1.
    // Weekly: gap before columns whose 7-day window contains the 1st.
    const monthStartCols = new Set();

    displayDates.forEach((d, i) => {
      if (i === 0) return;
      if (activeView === "daily") {
        if (d.getDate() === 1) monthStartCols.add(i);
      } else {
        // Check each day in the 7-day window for a month-1st
        for (let offset = 0; offset < 7; offset++) {
          const day = new Date(d.getTime() + offset * 86400000);
          if (day.getDate() === 1) { monthStartCols.add(i); break; }
        }
      }
    });

    // effectiveCellW accounts for total gap space across all month boundaries
    const effectiveCellW = (W - monthStartCols.size * MONTH_GAP) / N_COLS;

    // Precompute cumulative gap offsets per column for O(1) colX lookup
    const colGapOffset = new Array(N_COLS).fill(0);
    let cumGaps = 0;
    for (let i = 0; i < N_COLS; i++) {
      if (monthStartCols.has(i)) cumGaps++;
      colGapOffset[i] = cumGaps;
    }

    // colX: date argument retained for call-site compatibility but unused
    function colX(colIdx, date) {
      return colIdx * effectiveCellW + (colGapOffset[colIdx] ?? 0) * MONTH_GAP;
    }

    // Colour scales: separate logic for total SF and per-kg.
    // Total SF: sequential per-row scale from displayed value extent.
    // Per-kg: diverging scale centred on annual mean. 
    // Unique PKG_DIVERGE_INTERP for all metrics.
    // Legend gradient updates to match the active scale type.
    lgGrad.selectAll("stop").remove();
    d3.range(0, 1.01, 0.1).forEach(t =>
      lgGrad.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", activePkg ? cfg.pkg_interpolator(t) : activeInterp(t))
    );

    const rowScales = new Map();
    sortedCats.forEach(cat => {
      if (activePkg) {
        const ref      = annualRef.get(cat);
        const mean     = ref?.[activeMeanCol]  ?? 0;
        const halfSpan = ref?.[activeDivCol]   ?? 1;
        // Per-metric diverging interpolator: each metric has its own scheme
        rowScales.set(cat,
          d3.scaleDiverging(cfg.pkg_interpolator)
            .domain([mean - halfSpan, mean, mean + halfSpan])
            .clamp(true)
        );
      } else {
        const vals = Array.from((displayValues.get(cat) || new Map()).values())
          .map(d => d.value).filter(v => v !== null && !isNaN(v));
        let [vMin, vMax] = d3.extent(vals);
        vMin = vMin ?? 0; vMax = vMax ?? 1;
        rowScales.set(cat,
          d3.scaleSequential(activeInterp).domain([vMin, vMax]).clamp(true)
        );
      }
    });

    // Month labels: placed at the column containing the 1st of each month.
    // Divider lines at the same x position as the gap (monthStartCols).
    // First column of the first month gets a label but no divider.
    const monthsDrawn = new Set();

    // Label at column 0 for the first month (Jan)
    const firstMonth = filteredDates[0].getMonth();
    if (!monthsDrawn.has(firstMonth)) {
      monthGroup.append("text")
        .attr("x", colX(0, displayDates[0])).attr("y", -25)
        .attr("text-anchor","start")
        .style("font-size","10px").style("fill","#555").style("font-weight","600")
        .text(fmtMonth(filteredDates[0]));
      monthsDrawn.add(firstMonth);
    }

    // Label and divider at each month-boundary column
    monthStartCols.forEach(colIdx => {
      // Find which month the 1st falls in by checking days in the window
      let monthDate = null;
      if (activeView === "daily") {
        monthDate = displayDates[colIdx];
      } else {
        for (let offset = 0; offset < 7; offset++) {
          const day = new Date(displayDates[colIdx].getTime() + offset * 86400000);
          if (day.getDate() === 1) { monthDate = day; break; }
        }
      }
      if (!monthDate) return;
      const mo = monthDate.getMonth();
      if (monthsDrawn.has(mo)) return;
      monthsDrawn.add(mo);

      const x1 = colX(colIdx, displayDates[colIdx]);

      monthGroup.append("text")
        .attr("x", x1).attr("y", -25)
        .attr("text-anchor","start")
        .style("font-size","10px").style("fill","#555").style("font-weight","600")
        .text(fmtMonth(monthDate));

      dividerGroup.append("line")
        .attr("x1",x1).attr("x2",x1).attr("y1",-16).attr("y2",chart_H)
        .attr("stroke","#e0e0e0").attr("stroke-width",0.5);
    });

    dividerGroup.append("line")
      .attr("x1",0).attr("x2",W).attr("y1",-1).attr("y2",-1)
      .attr("stroke","#e0e0e0").attr("stroke-width",0.5);

    sortedCats.forEach((_, i) => {
      if (groupGapPx > 0 && (i+1) % ROW_GROUP_SIZE === 0 && i < N_CATS-1) {
        const divY = rowYStarts[i] + ROW_H + GAP + groupGapPx / 2;
        dividerGroup.append("line")
          .attr("x1",-4).attr("x2",W).attr("y1",divY).attr("y2",divY)
          .attr("stroke","#eaeaea").attr("stroke-width",0.5)
          .attr("stroke-dasharray","2,2");
      }
    });

    const labelFontSize = Math.min(14, Math.max(9, ROW_H * 0.38)) + "px";
    sortedCats.forEach((cat, i) => {
      const cy = rowYStarts[i] + ROW_H / 2;
      labelGroup.append("text")
        .attr("x",-6).attr("y",cy)
        .attr("text-anchor","end").attr("dominant-baseline","central")
        .style("font-size",labelFontSize).style("fill","#444")
        .text(cat.length > 26 ? cat.slice(0,25)+"\u2026" : cat);
    });

    // Rank axis: all ranks shown if N <= 30, every 5th + 1 + N if N > 30.
    rankGroup.append("text")
      .attr("x", W ).attr("y", -5)
      .attr("text-anchor","right")
      .style("font-size","10px").style("fill","#999").style("font-weight","600")
      .text("Rank");

    sortedCats.forEach((_, i) => {
      const rank = i + 1;
      const show = N_CATS <= 30
        ? true
        : (rank === 1 || rank === N_CATS || rank % 5 === 0);
      if (!show) return;
      const cy = rowYStarts[i] + ROW_H / 2;
      rankGroup.append("text")
        .attr("x", W + 18).attr("y", cy)
        .attr("text-anchor","middle").attr("dominant-baseline","central")
        .style("font-size","10px").style("fill","#bbb")
        .text(rank);
    });

    // Cells: one g.row-group per category for opacity transitions on hover.
    const rowGroupEls = [];
    sortedCats.forEach((cat, rowIdx) => {
      const rowG   = cellGroup.append("g").attr("class","row-group");
      rowGroupEls.push(rowG);
      const rowY   = rowYStarts[rowIdx];
      const scale  = rowScales.get(cat);
      const colMap = displayValues.get(cat);

      displayDates.forEach((date, colIdx) => {
        const key  = fmtInput(date);
        const cell = colMap?.get(key);
        const val  = cell?.value ?? null;
        const fill = (val !== null && !isNaN(val)) ? scale(val) : MISSING_FILL;
        rowG.append("rect")
          .attr("x",      colX(colIdx, date))
          .attr("y",      rowY)
          .attr("width",  Math.max(effectiveCellW - 0.2, 0.5))
          .attr("height", ROW_H)
          .attr("fill",   fill);
      });
    });

    // Event markers: horizontal label centred above tick, no rotation.
    // Weekly view: precise day-offset x position within week column.
    // Daily view: direct date-to-column lookup.
    function getEventX(evtDate) {
      if (activeView === "daily") {
        const idx = displayDates.findIndex(d => fmtInput(d) === fmtInput(evtDate));
        if (idx < 0) return null;
        return colX(idx, displayDates[idx]) + effectiveCellW / 2;
      }

      // Find the Jan-01-anchored week that contains this event date
      const weekStartDate = getJanAnchoredWeekStart(evtDate);
      const weekStartStr  = fmtInput(weekStartDate);
      const idx = displayDates.findIndex(d => fmtInput(d) === weekStartStr);
      if (idx < 0) return null;
      // Day offset within the 7-day bin (0 = first day of bin)
      const dayOffset = Math.floor((evtDate - weekStartDate) / 86400000);
      return colX(idx, displayDates[idx]) + (dayOffset + 0.5) / 7 * effectiveCellW;
    }

    EVENTS.forEach(evt => {
      const evtDate = parseDate(evt.date);
      if (!evtDate || evtDate < dFrom || evtDate > dTo) return;
      const ex = getEventX(evtDate);
      if (ex === null) return;

      const markerG = eventGroup.append("g").attr("class","event-marker")
        .style("cursor","pointer");

      markerG.append("line")
        .attr("x1",ex).attr("x2",ex).attr("y1",chart_H + 4).attr("y2",chart_H + 12)
        .attr("stroke","#999").attr("stroke-width",1.5);

      markerG.append("circle")
        .attr("cx",ex).attr("cy",chart_H + 4).attr("r",2).attr("fill","#999");

      markerG.append("text")
        .attr("x", ex).attr("y", chart_H + 22)
        .attr("text-anchor","middle")
        .style("font-size","8px").style("fill","#aaa")
        .text(evt.label);

      markerG
        .on("mouseover", function(event) {
          tooltip.style("display","none");
          evtTooltip.style("display",null).html(
            `<div style="font-weight:600;color:#888;margin-bottom:2px">
               ${evt.label}</div>
             <div style="color:#555">${fmtDate(evtDate)}</div>`
          );
          const cRect = container.node().getBoundingClientRect();
          evtTooltip
            .style("left",(event.clientX - cRect.left + 10)+"px")
            .style("top", (event.clientY - cRect.top  - 46)+"px");
        })
        .on("mouseleave", () => evtTooltip.style("display","none"));
    });

    // Axis labels and legend.
    // Legend labels switch for diverging (per-kg) vs sequential (total SF).
    axisLegGroup.append("text")
      .attr("transform","rotate(-90)")
      .attr("x", -chart_H / 2).attr("y", -MARGIN.left + 10)
      .attr("text-anchor","middle")
      .style("font-size","12px").style("fill","#666")
      .text("LCFS Categories (ranked by impact)");

    // Period baseline stat: top-right of chart area, right-aligned.
    // Total SF: sum across all 65 cats across the full displayed period.
    // Per-kg: mean intensity across all 65 cats across the full displayed period.
    // const baseG = axisLegGroup.append("g")
    //   .attr("transform", `translate(${W}, -100)`);

    // baseG.append("text")
    //   .attr("x", 0).attr("y", 15)
    //   .attr("text-anchor","end")
    //   // .style("font-size","11px").style("fill","#999").style("font-weight","600")
    //   .style("font-size","11px").style("fill",activeInterp(0.7)).style("font-weight","600")
    //   .text(`${cfg.short} SF total: ${valFormatter(periodSFTotal)} ${cfg.unit}`);


    // baseG.append("text")
    //   .attr("x", 0).attr("y", 30)
    //   .attr("text-anchor","end")
    //   .style("font-size","11px").style("fill",activeInterp(0.7)).style("font-weight","600")
    //   .text(`${cfg.short} per-kg mean: ${valFormatter(periodPkgAvg)} ${cfg.pkg_unit}`);

    // axisLegGroup.append("text")
    //   .attr("x", W / 2).attr("y", chart_H + 54)
    //   .attr("text-anchor","middle")
    //   .style("font-size","10px").style("fill","#666")
    //   .text("Date");

    // Stat block removed from SVG -- periodSFTotal and periodPkgAvg
    // are passed to the dashboard via the onStats callback


    const legG = axisLegGroup.append("g")
      .attr("transform",`translate(${W - 150},${chart_H + 34})`);

    legG.append("text").attr("x",0).attr("y",5)
      .style("font-size","10px").style("fill","#999")
      .text(activePkg ? "Deviation from annual mean:" : "Per-row scale:");

    legG.append("rect")
      .attr("y",10).attr("width",140).attr("height",10).attr("rx",2)
      .style("fill","url(#hm-v16-legend-grad)");

    if (activePkg) {
      // Three-label legend for diverging scale.
      legG.append("text").attr("x",0)  .attr("y",30)
        .style("font-size","10px").style("fill","#bbb").text("Below");
      legG.append("text").attr("x",70) .attr("y",30)
        .attr("text-anchor","middle")
        .style("font-size","10px").style("fill","#bbb").text("Annual mean");
      legG.append("text").attr("x",140).attr("y",30)
        .attr("text-anchor","end")
        .style("font-size","10px").style("fill","#bbb").text("Above");
    } else {
      legG.append("text").attr("x",0)  .attr("y",30)
        .style("font-size","10px").style("fill","#bbb").text("Low");
      legG.append("text").attr("x",140).attr("y",30)
        .attr("text-anchor","end")
        .style("font-size","10px").style("fill","#bbb").text("High");
    }

    // Tooltip and hover: DIM_OPACITY restored, non-hovered rows dim on hover.
    overlay
      .on("mousemove", function(event) {
        const [mx, my] = d3.pointer(event, this);

        let colIdx = -1, minDist = Infinity;
        displayDates.forEach((d, i) => {
          const cx   = colX(i, d) + effectiveCellW / 2;
          const dist = Math.abs(mx - cx);
          if (dist < minDist) { minDist = dist; colIdx = i; }
        });

        const rowIdx = findRowIdx(my, rowYStarts, ROW_H);

        if (colIdx < 0 || rowIdx < 0 || minDist > effectiveCellW + MONTH_GAP) {
          tooltip.style("display","none");
          rowGroupEls.forEach(rg => rg.attr("opacity",1));
          return;
        }

        rowGroupEls.forEach(rg => rg.attr("opacity", DIM_OPACITY));
        rowGroupEls[rowIdx].attr("opacity", 1);

        const date = displayDates[colIdx];
        const cat  = sortedCats[rowIdx];
        const key  = fmtInput(date);
        const cell = displayValues.get(cat)?.get(key);

        if (!cell) { tooltip.style("display","none"); return; }

        const isWeekly  = activeView === "weekly";
        const dateLabel = isWeekly
          ? `<div><b>Week of:</b> ${fmtDate(date)}</div>`
          : `<div><b>Date:</b> ${fmtDate(date)}</div>`;
        const viewLabel = isWeekly ? "Weekly mean" : "Value";
        const rankLabel = (cell.rank !== null && cell.rank !== undefined)
          ? `${cell.rank} of 65`
          : "\u2014 (per-kg daily view)";
        const pctColour = cell.pct >= 0 ? "#d62728" : "#2ca02c";

        // Tooltip split: daily shows exact date and raw value label,
        // weekly shows week-of date and mean label. Annual mean row removed.
        // Values rounded via valFormatter; units always shown.

        tooltip.style("display",null).html(
          `<div style="font-weight:600;color:${activeInterp(0.7)};margin-bottom:3px">
             ${cfg.short} ${activePkg ? "per kg" : "Sales Footprint"}
           </div>
           ${dateLabel}
           <div><b>Category:</b> ${cat}</div>

           <div><b>Rank:</b> ${rankLabel}</div>
           <div><b>Annual ${cfg.short} share:</b>
             ${cell.share !== null ? d3.format(".2f")(cell.share)+"%" : "\u2014"}</div>
           <div><b>vs annual mean:</b>
             <span style="color:${pctColour}">${pctFormatter(cell.pct)}</span>
           </div>`
        );

        const cRect = container.node().getBoundingClientRect();
        const tipW  = 260;
        const left  = event.clientX - cRect.left + 14;
        const top   = event.clientY - cRect.top  - 10;
        tooltip
          .style("left",(left+tipW>cRect.width ? left-tipW-24 : left)+"px")
          .style("top",  top+"px");
      })
      .on("mouseleave", function() {
        tooltip.style("display","none");     // restored: was commented out in V1.5
        evtTooltip.style("display","none");
        rowGroupEls.forEach(rg => rg.attr("opacity",1));
      });

    titleDiv
      .style("color", activeInterp(0.7))
      .text(`LCFS Category ${activeLabel}: ${activeView==="weekly"?"Weekly":"Daily"}`);
    subtitleDiv.text(
      `Top ${N_CATS} of ${allCats.length} categories \u00b7 ` +
      `${N_COLS} ${activeView==="weekly"?"weeks":"days"} \u00b7 ` +
      `${activePkg ? "per-kg deviation from annual mean" : "total SF"} \u00b7 colour scaled per row`
    );

    syncResetButton();
  }

  redraw();
  return container.node();
}