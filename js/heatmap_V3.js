// heatmap.js -- HM-V2
// Heatmap chart for FIO Food environmental impact dashboard.
// Receives weekly bin data from L2a_weekly_updated.json (no daily file).
// Returns a DOM node. Call: createHeatmap(weeklyData, { width, onStats }).

function createHeatmap(weeklyData, { width = 900, onStats = null } = {}) {

  // 1a: Config

  const METRICS = {
    GHGE: {
      col                 : "roll7_GHGE_SF",
      pkg_col             : "roll7_GHGE_perkg",
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
      pkg_interpolator    : t => (t < 0.5
        ? d3.interpolateRgb("#f4baf6", "#ffffff")(t * 2)
        : d3.interpolateRgb("#ffffff", "#2ca02c")((t - 0.5) * 4)),
    },
    LU: {
      col                 : "roll7_LU_SF",
      pkg_col             : "roll7_LU_perkg",
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
      pkg_interpolator    : t => (t < 0.5
        ? d3.interpolateRgb("#a9d8e9", "#ffffff")(t * 2)
        : d3.interpolateRgb("#ffffff", "#ff7f0e")((t - 0.5) * 4)),
    },
    WU: {
      col                 : "roll7_WU_SF",
      pkg_col             : "roll7_WU_perkg",
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
      pkg_interpolator    : t => (t < 0.5
        ? d3.interpolateRgb("#f6b4d1", "#ffffff")(t * 2)
        : d3.interpolateRgb("#ffffff", "#88bced")((t - 0.5) * 8)),
    },
  };

  const METRIC_OPTIONS = [
    { key: "GHGE", display: "GHGE (Greenhouse Gas Emissions)" },
    { key: "LU",   display: "LU (Land Use)"                   },
    { key: "WU",   display: "WU (Water Use)"                  },
  ];

  // CAT_GAPS: breathing gap in px between row groups per N value
  const CAT_GAPS = { 10: 0, 20: 4, 30: 5, 40: 7, 65: 10 };

  // Event dates match 2023 dummy data.
  // Update to 2022 when real retailer data is connected.
  const EVENTS_BY_GROUP = {
    public_holidays: [
      // { date: "2023-01-03", label: "New Year's Day BH"  },
      // { date: "2023-04-15", label: "Good Friday BH"     },
      { date: "2023-04-18", label: "Easter Monday BH"   },
      { date: "2023-05-02", label: "Early May BH"       },
      // { date: "2023-06-02", label: "Spring BH"          },
      { date: "2023-06-03", label: "Jubilee BH"         },
      { date: "2023-08-29", label: "Summer BH"          },
      { date: "2023-09-19", label: "State Funeral BH"   },
      { date: "2023-12-26", label: "Boxing Day BH"      },
      // { date: "2023-12-27", label: "Christmas Day BH"   },
    ],
    cultural_events: [
      { date: "2023-03-27", label: "Mother's Day"       },
      { date: "2023-04-02", label: "Ramadan Start"      },
      { date: "2023-04-15", label: "Good Friday"        },
      // { date: "2023-04-18", label: "Easter Monday"      },
      { date: "2023-05-02", label: "Ramadan End"        },
      { date: "2023-06-19", label: "Father's Day"       },
      { date: "2023-10-24", label: "Diwali"             },
      { date: "2023-10-31", label: "Halloween"          },
      { date: "2023-12-25", label: "Christmas"          },
      { date: "2023-12-31", label: "New Year's Eve"          },
    ],
    school_calendar: [
      { date: "2023-02-19", label: "Spring Half Term S"             },
      { date: "2023-02-27", label: "Spring Half Term E"             },
      { date: "2023-04-04", label: "Easter Holidays S"             },
      { date: "2023-04-14", label: "Easter Holidays E"             },
      { date: "2023-05-28", label: "Summer Half Term S"             },
      { date: "2023-06-05", label: "Summer Half Term E"             },
      { date: "2023-07-23", label: "Summer Holidays S"             },
      { date: "2023-09-04", label: "Summer Holidays E"             },
      { date: "2023-10-22", label: "Autumn Half Term S"             },
      { date: "2023-10-30", label: "Autumn Half Term E"             },
      { date: "2023-12-17", label: "Christmas Holidays S"             },
      { date: "2023-12-30", label: "Christmas Holidays E"             },
    ],
    weather_events: [
      { date: "2023-06-16", label: "HW (3 days)"        },
      { date: "2023-07-18", label: "HW (3 days)"        },
      { date: "2023-08-12", label: "HW (7 days)"        },
    ],
    sporting_events: [
      // { date: "2023-02-05", label: "Six Nations S"               },
      { date: "2023-03-19", label: "Six Nations E"               },
      // { date: "2023-07-06", label: "UEFA Women's Euro S"               },
      { date: "2023-07-31", label: "UEFA Women's Euro E"               },
      // { date: "2023-07-28", label: "Commonwealth Games S"               },
      { date: "2023-08-08", label: "CW Games E"               },
      // { date: "2023-11-20", label: "FIFA World Cup S"               },
      { date: "2023-12-18", label: "FIFA World Cup E"               },
    ],
  };

  const EVENT_FOOTNOTES = {
    public_holidays : "BH = Bank Holiday",
    cultural_events : "",
    school_calendar : "SH = School Holidays  S = Period start  E = Period end",
    weather_events  : "HW = Heatwave  number in brackets = duration in days",
    sporting_events : "E = Period end  CW = Commonwealth",
  };

  const EVENT_GROUP_OPTIONS = [
    { key: "public_holidays", display: "Public Holidays" },
    { key: "cultural_events", display: "Cultural Events" },
    { key: "school_calendar", display: "School Calendar" },
    { key: "weather_events",  display: "Weather Events"  },
    { key: "sporting_events", display: "Sporting Events" },
  ];

  const MIN_CHART_H    = 250;
  const MAX_CHART_H    = 1200;
  const GAP            = 2;
  const MONTH_GAP      = 0;
  const ROW_GROUP_SIZE = 5;
  const MIN_ROW_H      = 8;
  const DIM_OPACITY    = 1;        // 1 = no row dimming on hover
  const MISSING_FILL   = "#f5f5f5";
  const LABEL_WIDTH    = 154;
  const RANK_AXIS_PAD  = 60;       // reserved on right for rank numbers
  const MARGIN = { top: 62, right: RANK_AXIS_PAD, bottom: 72, left: LABEL_WIDTH };

  const CAT_OPTIONS = [10, 30, 65];

  let activeMetric     = "GHGE";
  let activeN          = 30;
  let activePkg        = false;
  let activeEventGroup = "public_holidays";


  // 1b: Parse 
  const parseDate = d3.timeParse("%Y-%m-%d");
  const fmtDate   = d3.timeFormat("%d %b %Y");
  const fmtMonth  = d3.timeFormat("%b");
  const fmtInput  = d3.timeFormat("%Y-%m-%d");

  // Weekly-only: allCats and annualRef both derived from weeklyData
  // const allCats = Array.from(new Set(weeklyData.map(r => r.lcfs_cat)));

  // Filter removes undefined/null entries from malformed rows
  const allCats = Array.from(new Set(weeklyData.map(r => r.lcfs_cat).filter(Boolean)));

  const weeklyMap = new Map();
  const annualRef = new Map();
  allCats.forEach(cat => weeklyMap.set(cat, new Map()));

  weeklyData.forEach(r => {
    if (!weeklyMap.has(r.lcfs_cat)) return;
    weeklyMap.get(r.lcfs_cat).set(r.week_start, r);
    // first row per category carries all annual_* reference values
    if (!annualRef.has(r.lcfs_cat)) annualRef.set(r.lcfs_cat, r);
  });

  const allWeekStrs = [...new Set(weeklyData.map(r => r.week_start))].sort();
  const dateMinStr  = allWeekStrs[0];
  const dateMaxStr  = allWeekStrs[allWeekStrs.length - 1];

  // calendar_month per week: pre-computed in Python as 0-indexed month
  const weekMonthMap = new Map();
  weeklyData.forEach(r => {
    if (!weekMonthMap.has(r.week_start))
      weekMonthMap.set(r.week_start, r.calendar_month);
  });

  // Grand annual means: sum of per-category annual means for SF (= total annual SF),
  // and mean across categories for per-kg. Computed once at build time.
  // Used as reference values in the legend block and updated per metric in redraw().
  function hmStatFmt(v) {
    if (v == null || isNaN(v)) return "--";
    const abs = Math.abs(v);
    if (abs >= 1e6) return d3.format(".2f")(v / 1e6) + " million";
    if (abs >= 1e3) return d3.format(".0f")(v / 1e3) + "K";
    if (abs >= 10)  return d3.format(".1f")(v);
    return d3.format(".2f")(v);
  }

  const grandAnnualSF  = {};
  const grandAnnualPkg = {};
  for (const m of Object.keys(METRICS)) {
    const mcfg = METRICS[m];
    let sfSum = 0, pkgSum = 0, n = 0;
    allCats.forEach(cat => {
      const ref = annualRef.get(cat);
      if (!ref) return;
      sfSum  += ref[mcfg.mean_col]     || 0;
      pkgSum += ref[mcfg.pkg_mean_col] || 0;
      n++;
    });
    grandAnnualSF[m]  = sfSum;
    grandAnnualPkg[m] = n > 0 ? pkgSum / n : 0;
  }

  // 1c: Helpers 

  // Jan-01 anchored week start -- mirrors Python get_week_start() exactly
  function getJanAnchoredWeekStart(date) {
    const jan1      = new Date(date.getFullYear(), 0, 1);
    jan1.setHours(0, 0, 0, 0);
    const dayOfYear = Math.floor((date - jan1) / 86400000);
    return new Date(jan1.getTime() + Math.floor(dayOfYear / 7) * 7 * 86400000);
  }

  // calendar_month from pre-computed weekMonthMap; fallback to JS month
  function getDisplayMonth(date) {
    const wk = fmtInput(date);
    return weekMonthMap.has(wk) ? weekMonthMap.get(wk) : date.getMonth();
  }

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

  // valFormatter: explicit math avoids d3 SI rounding at the 1e6 boundary
  function valFormatter(v) {
    if (v === null || v === undefined || isNaN(v)) return "\u2014";
    const abs = Math.abs(v);
    if (abs >= 1e9) return d3.format(".2f")(v / 1e9) + " billion";
    if (abs >= 1e6) return d3.format(".2f")(v / 1e6) + " million";
    if (abs >= 1e3) return d3.format(".0f")(v / 1e3) + "K";
    if (abs >= 10)  return d3.format(".1f")(v);
    return d3.format(".2f")(v);
  }

  function pctFormatter(v) {
    if (v === null || v === undefined || isNaN(v)) return "\u2014";
    return (v >= 0 ? "+" : "") + d3.format(".1f")(v) + "%";
  }


  // 1d: Controls 
  const container = d3.create("div")
    .style("font-family", "sans-serif")
    .style("position", "relative");

  // Static chart heading -- does not change with metric or toggle state
  container.append("div")
    .style("font-size", "20px")
    .style("font-weight", "700")
    .style("color", "#222")
    .style("margin-bottom", "6px")
    .text("Seasonal Variations in Environmental Impacts across Food and Drink Categories");

  // Static chart context -- always visible
  container.append("div")
    .style("font-size", "14px")
    .style("color", "#666")
    .style("line-height", "1.6")
    .style("margin-top", "16px")
    .style("margin-bottom", "30px")
    .style("max-width", "100%")
    .text(
      "This chart can be used to explore seasonal variation in environmental " +
      "impacts from food and drink sales for specific food and drink categories. " +
      "Note that the colour scales are only comparable within " +
      "and not across categories." + "Please visit the 'About this tool' page to learn more."
    );

  // // Top row: metric dropdown + per-kg pill
  // const topRow = container.append("div")
  //   .style("display", "flex")
  //   .style("align-items", "center")
  //   .style("gap", "10px")
  //   .style("flex-wrap", "wrap")
  //   .style("margin-bottom", "8px");

  const ctrlWrapper = container.append("div")
    .style("position", "relative");

  const topRow = ctrlWrapper.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "5px")
    .style("flex-wrap", "nowrap")
    .style("margin-bottom", "8px")
    .style("padding-right", "240px");

  const metricSelect = topRow.append("select")
    .style("font-size", "12px").style("padding", "4px 8px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("background", "white").style("cursor", "pointer")
    .on("change", function() {
      activeMetric = d3.select(this).property("value");
      redraw();
    });

  METRIC_OPTIONS.forEach(({ key, display }) => {
    metricSelect.append("option")
      .attr("value", key)
      .property("selected", key === activeMetric)
      .text(display);
  });

  topRow.append("div")
    .style("width", "1px").style("height", "18px")
    .style("background", "#ddd").style("margin", "0 4px");

  const pkgPill = topRow.append("div")
    .style("display", "flex")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("overflow", "hidden");

  const btnTotal = pkgPill.append("button")
    .text("Total SF")
    .style("font-size", "12px").style("padding", "4px 10px")
    .style("border", "none").style("cursor", "pointer")
    .style("transition", "background 0.15s, color 0.15s");

  const btnPkg = pkgPill.append("button")
    .text("Per kg")
    .style("font-size", "12px").style("padding", "4px 10px")
    .style("border", "none").style("border-left", "1px solid #ccc")
    .style("cursor", "pointer")
    .style("transition", "background 0.15s, color 0.15s");

  function syncPkgToggle() {
    btnTotal.style("background", !activePkg ? "#555" : "#fff")
            .style("color",      !activePkg ? "#fff" : "#555");
    btnPkg  .style("background",  activePkg ? "#555" : "#fff")
            .style("color",       activePkg ? "#fff" : "#555");
  }

  btnTotal.on("click", function() {
    if (activePkg) { activePkg = false; syncPkgToggle(); redraw(); }
  });
  btnPkg.on("click", function() {
    if (!activePkg) { activePkg = true; syncPkgToggle(); redraw(); }
  });
  syncPkgToggle();

  // // Bottom row: event overlay + dates + reset + show N
  // const ctrlRow = container.append("div")
  //   .style("display", "flex")
  //   .style("align-items", "center")
  //   .style("column-gap", "10px")
  //   .style("row-gap", "8px")
  //   .style("flex-wrap", "wrap")
  //   .style("margin-bottom", "12px");

  topRow.append("div")
    .style("width", "1px").style("height", "18px")
    .style("background", "#ddd").style("margin", "0 4px");

  topRow.append("span")
    .style("font-size", "12px").style("color", "#666")
    .text("Show:");

  const catSelect = topRow.append("select")
    .style("font-size", "12px").style("padding", "4px 8px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("background", "white").style("cursor", "pointer")
    .on("change", function() {
      activeN = +d3.select(this).property("value");
      redraw();
    });

  CAT_OPTIONS.forEach(n => {
    catSelect.append("option")
      .attr("value", n)
      .property("selected", n === activeN)
      .text(`Top ${n} categories`);
  });

  // // Legend block pushed to right side of topRow
  // const hmLegendBlock = topRow.append("div")
  //   .style("margin-left", "auto")
  //   .style("display", "flex")
  //   .style("flex-direction", "column")
  //   .style("align-items", "flex-end")
  //   .style("gap", "2px")
  //   .style("padding-left", "12px");

  const hmLegendBlock = ctrlWrapper.append("div")
    .style("position", "absolute")
    .style("top", "0")
    .style("right", "0")
    .style("z-index", "5")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "flex-end")
    .style("gap", "3px")
    .style("padding", "4px 8px")
    .style("background", "rgba(255,255,255,0.92)")
    .style("border-radius", "4px");

  const hmSwatchRow = hmLegendBlock.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "8px");

  const hmLegendSwatch = hmSwatchRow.append("svg")
    .attr("width", "28").attr("height", "10")
    .style("flex-shrink", "0");

  hmLegendSwatch.append("line")
    .attr("x1", "0").attr("y1", "5")
    .attr("x2", "28").attr("y2", "5")
    .attr("stroke-width", "2.5")
    .attr("stroke-linecap", "round")
    .attr("class", "hm-legend-line");

  const hmLegendLabel = hmSwatchRow.append("span")
    .style("font-size", "12px").style("color", "#555");

  const hmLegendMeanSF = hmLegendBlock.append("span")
    .style("font-size", "12px").style("color", "#555");

  const hmLegendMeanPkg = hmLegendBlock.append("span")
    .style("font-size", "12px").style("color", "#555");

  // Bottom row: event overlay + dates + reset
  const ctrlRow = ctrlWrapper.append("div")

  ctrlRow.append("span")
    .style("font-size", "12px").style("color", "#666")
    .style("margin-right", "5px")
    .text("Event overlay:");

  const eventGroupSelect = ctrlRow.append("select")
    .style("font-size", "12px").style("padding", "4px 8px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("background", "white").style("cursor", "pointer")
    .style("margin-right", "10px")
    .on("change", function() {
      activeEventGroup = d3.select(this).property("value");
      redraw();
    });

  EVENT_GROUP_OPTIONS.forEach(({ key, display }) => {
    eventGroupSelect.append("option")
      .attr("value", key)
      .property("selected", key === activeEventGroup)
      .text(display);
  });

  // ctrlRow.append("div")
  //   .style("width", "1px").style("height", "18px")
  //   .style("background", "#ddd").style("margin", "0 2px");

  ctrlRow.append("span")
    .style("font-size", "12px").style("color", "#666")
    .style("margin-right", "5px")
    .text("From:");

  const startPicker = ctrlRow.append("input")
    .attr("type", "date").attr("value", dateMinStr)
    .attr("min", dateMinStr).attr("max", dateMaxStr)
    .style("font-size", "12px").style("padding", "3px 6px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("margin-right", "5px")
    .on("change", function() {
      if (this.value > endPicker.property("value"))
        this.value = endPicker.property("value");
      redraw();
    });

  ctrlRow.append("span")
    .style("font-size", "12px").style("color", "#666")
    .style("margin-right", "5px")
    .text("To:");

  const endPicker = ctrlRow.append("input")
    .attr("type", "date").attr("value", dateMaxStr)
    .attr("min", dateMinStr).attr("max", dateMaxStr)
    .style("font-size", "12px").style("padding", "3px 6px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("margin-right", "10px")
    .on("change", function() {
      if (this.value < startPicker.property("value"))
        this.value = startPicker.property("value");
      redraw();
    });

  const resetBtn = ctrlRow.append("button")
    .text("Reset dates")
    .style("font-size", "12px").style("padding", "4px 10px")
    .style("border-radius", "4px").style("border", "1px solid #bbb")
    .style("background", "#fff").style("color", "#555")
    .style("cursor", "pointer")
    .on("click", function() {
      startPicker.property("value", dateMinStr);
      endPicker.property("value",   dateMaxStr);
      redraw();
    });

  // ctrlRow.append("div")
  //   .style("width", "1px").style("height", "18px")
  //   .style("background", "#ddd").style("margin", "0 2px");

  // ctrlRow.append("span")
  //   .style("font-size", "12px").style("color", "#666")
  //   .text("Show:");

  // const catSelect = ctrlRow.append("select")
  //   .style("font-size", "12px").style("padding", "4px 8px")
  //   .style("border-radius", "4px").style("border", "1px solid #ccc")
  //   .style("background", "white").style("cursor", "pointer")
  //   .on("change", function() {
  //     activeN = +d3.select(this).property("value");
  //     redraw();
  //   });

  // CAT_OPTIONS.forEach(n => {
  //   catSelect.append("option")
  //     .attr("value", n)
  //     .property("selected", n === activeN)
  //     .text(`Top ${n} categories`);
  // });

  function syncResetButton() {
    const atFull = startPicker.property("value") === dateMinStr &&
                   endPicker.property("value")   === dateMaxStr;
    resetBtn
      .attr("disabled",        atFull ? true : null)
      .style("opacity",        atFull ? "0.35" : "1")
      .style("cursor",         atFull ? "not-allowed" : "pointer")
      .style("pointer-events", atFull ? "none" : "auto");
  }

  // Dynamic metric label -- colour and text updated in redraw()
  const titleDiv = container.append("div")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("margin-bottom", "4px");

  const subtitleDiv = container.append("div")
    .style("font-size", "12px")
    .style("color", "#999")
    .style("margin-bottom", "10px");


  // 1e: SVG shell

  const W = width - MARGIN.left - MARGIN.right;

  const svg = container.append("svg")
    .attr("width", width)
    .style("overflow", "visible");

  const defs   = svg.append("defs");
  const lgGrad = defs.append("linearGradient")
    .attr("id", "hm-v2-legend-grad")
    .attr("x1", "0%").attr("x2", "100%");

  const g = svg.append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const dividerGroup = g.append("g").attr("class", "dividers");
  const cellGroup    = g.append("g").attr("class", "cells");
  const monthGroup   = g.append("g").attr("class", "months");
  const labelGroup   = g.append("g").attr("class", "cat-labels");
  const rankGroup    = g.append("g").attr("class", "rank-axis");
  const eventGroup   = g.append("g").attr("class", "events");
  const axisLegGroup = g.append("g").attr("class", "axis-leg");

  const overlay = g.append("rect")
    .attr("width", W)
    .attr("fill", "none")
    .style("pointer-events", "all");

  // Cell hover tooltip
  const tooltip = container.append("div")
    .style("position", "absolute").style("pointer-events", "none")
    .style("background", "rgba(255,255,255,0.97)")
    .style("border", "1px solid #ccc").style("border-radius", "6px")
    .style("padding", "8px 12px").style("font-size", "12px")
    .style("line-height", "1.8")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.12)")
    .style("display", "none").style("max-width", "280px")
    .style("z-index", "10");

  // Shared tooltip for event markers and rank strip hover
  const evtTooltip = container.append("div")
    .style("position", "absolute").style("pointer-events", "none")
    .style("background", "rgba(255,255,255,0.97)")
    .style("border", "1px solid #ddd").style("border-radius", "5px")
    .style("padding", "5px 9px").style("font-size", "12px")
    .style("line-height", "1.5")
    .style("box-shadow", "0 1px 6px rgba(0,0,0,0.10)")
    .style("display", "none").style("max-width", "200px")
    .style("z-index", "11");

  // Footnote below SVG -- text set by redraw() via EVENT_FOOTNOTES
  const footnoteEl = container.append("p")
    .style("font-size", "12px")
    .style("color", "#bbb")
    .style("margin", "12px 0 8px 0")
    .style("min-height", "18px")
    .text(EVENT_FOOTNOTES["public_holidays"]);


  // 1f: Redraw

  function redraw() {

    [dividerGroup, cellGroup, monthGroup, labelGroup,
     rankGroup, eventGroup, axisLegGroup].forEach(g2 => g2.selectAll("*").remove());

    const cfg = METRICS[activeMetric];

    // All active column names resolved here -- single source per redraw
    const activeInterp      = cfg.interpolator;
    const activeLabel       = activePkg ? cfg.pkg_label          : cfg.label;
    const activeUnit        = activePkg ? cfg.pkg_unit           : cfg.unit;
    const activeAnnRankCol  = activePkg ? cfg.pkg_annual_rank_col : cfg.annual_rank_col;
    const activeMeanCol     = activePkg ? cfg.pkg_mean_col       : cfg.mean_col;
    const activePctCol      = activePkg ? cfg.pkg_pct_col        : cfg.pct_col;
    const activeWkCol       = activePkg ? cfg.weekly_pkg_col     : cfg.weekly_col;
    const activeDivCol      = cfg.pkg_max_abs_dev_col;

    const dFrom = new Date(startPicker.property("value") + "T00:00:00");
    const dTo   = new Date(endPicker.property("value")   + "T00:00:00");

    // Category sort by pre-computed annual rank -- no d3.rollup needed
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

    // Weekly bin filter: include bins that overlap the selected window
    const weekKeys = allWeekStrs.filter(wk => {
      const wd = parseDate(wk);
      const we = new Date(wd.getTime() + 6 * 86400000);
      return wd <= dTo && we >= dFrom;
    });

    const displayDates = weekKeys.map(s => parseDate(s));

    const displayValues = new Map();
    sortedCats.forEach(cat => {
      const wkMap = weeklyMap.get(cat);
      const m     = new Map();
      weekKeys.forEach(wk => {
        const row = wkMap?.get(wk);
        if (row && row[activeWkCol] != null)
          m.set(wk, {
            value    : row[activeWkCol],
            rank     : row[cfg.weekly_rank_col],
            share    : row[cfg.share_col],
            pct      : row[activePctCol],
            ann_mean : row[activeMeanCol],
          });
      });
      displayValues.set(cat, m);
    });

    const N_COLS = displayDates.length;
    if (!N_COLS) return;

    // Period baseline: sum SF and mean per-kg across all 65 cats in window
    let periodSFTotal  = 0;
    let periodPkgSum   = 0;
    let periodPkgCount = 0;

    allCats.forEach(cat => {
      const wm = weeklyMap.get(cat);
      weekKeys.forEach(wk => {
        const row = wm?.get(wk);
        if (!row) return;
        if (row[cfg.weekly_col] != null && !isNaN(row[cfg.weekly_col]))
          periodSFTotal += row[cfg.weekly_col];
        if (row[cfg.weekly_pkg_col] != null && !isNaN(row[cfg.weekly_pkg_col])) {
          periodPkgSum += row[cfg.weekly_pkg_col];
          periodPkgCount++;
        }
      });
    });

    const periodPkgAvg = periodPkgCount > 0 ? periodPkgSum / periodPkgCount : 0;

    if (typeof onStats === "function") {
      onStats(periodSFTotal, periodPkgAvg, cfg);
    }

    // Month gap: insert before the first column whose window contains a month-1st
    const monthStartCols = new Set();
    displayDates.forEach((d, i) => {
      if (i === 0) return;
      for (let offset = 0; offset < 7; offset++) {
        const day = new Date(d.getTime() + offset * 86400000);
        if (day.getDate() === 1) { monthStartCols.add(i); break; }
      }
    });

    const effectiveCellW = (W - monthStartCols.size * MONTH_GAP) / N_COLS;

    const colGapOffset = new Array(N_COLS).fill(0);
    let cumGaps = 0;
    for (let i = 0; i < N_COLS; i++) {
      if (monthStartCols.has(i)) cumGaps++;
      colGapOffset[i] = cumGaps;
    }

    function colX(colIdx) {
      return colIdx * effectiveCellW + (colGapOffset[colIdx] ?? 0) * MONTH_GAP;
    }

    // Colour scale -- diverging for per-kg, sequential for total SF
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
        const mean     = ref?.[activeMeanCol] ?? 0;
        const halfSpan = ref?.[activeDivCol]  ?? 1;
        rowScales.set(cat,
          d3.scaleDiverging(cfg.pkg_interpolator)
            .domain([mean - halfSpan * 1.5, mean, mean + halfSpan * 1.5])
            .clamp(true)
        );
      } else {
        const vals = Array.from((displayValues.get(cat) || new Map()).values())
          .map(d => d.value).filter(v => v != null && !isNaN(v));
        let [vMin, vMax] = d3.extent(vals);
        vMin = vMin ?? 0; vMax = vMax ?? 1;
        rowScales.set(cat,
          d3.scaleSequential(activeInterp).domain([vMin, vMax]).clamp(true)
        );
      }
    });

    // Month labels: at column containing the 1st of each month
    const monthsDrawn = new Set();

    // First month label at column 0
    if (displayDates.length) {
      const firstMonth = displayDates[0].getMonth();
      monthGroup.append("text")
        .attr("x", colX(0)).attr("y", -10)
        .attr("text-anchor", "start")
        .style("font-size", "11px").style("fill", "#555").style("font-weight", "600")
        .text(fmtMonth(displayDates[0]));
      monthsDrawn.add(firstMonth);
    }

    monthStartCols.forEach(colIdx => {
      let monthDate = null;
      for (let offset = 0; offset < 7; offset++) {
        const day = new Date(displayDates[colIdx].getTime() + offset * 86400000);
        if (day.getDate() === 1) { monthDate = day; break; }
      }
      if (!monthDate) return;
      const mo = monthDate.getMonth();
      if (monthsDrawn.has(mo)) return;
      monthsDrawn.add(mo);

      const x1 = colX(colIdx);
      monthGroup.append("text")
        .attr("x", x1).attr("y", -10)
        .attr("text-anchor", "start")
        .style("font-size", "11px").style("fill", "#555").style("font-weight", "600")
        .text(fmtMonth(monthDate));

      dividerGroup.append("line")
        .attr("x1", x1).attr("x2", x1)
        .attr("y1", -10).attr("y2", chart_H)
        .attr("stroke", "#e0e0e0").attr("stroke-width", 0.5);
    });

    // Top baseline
    dividerGroup.append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", -1).attr("y2", -1)
      .attr("stroke", "#e0e0e0").attr("stroke-width", 0.5);

    // Row group dividers
    sortedCats.forEach((_, i) => {
      if (groupGapPx > 0 && (i + 1) % ROW_GROUP_SIZE === 0 && i < N_CATS - 1) {
        const divY = rowYStarts[i] + ROW_H + GAP + groupGapPx / 2;
        dividerGroup.append("line")
          .attr("x1", -4).attr("x2", W)
          .attr("y1", divY).attr("y2", divY)
          .attr("stroke", "#eaeaea").attr("stroke-width", 0.5)
          .attr("stroke-dasharray", "2,2");
      }
    });

    // Category labels
    const labelFontSize = Math.min(11, Math.max(9, ROW_H * 0.38)) + "px";
    sortedCats.forEach((cat, i) => {
      const cy = rowYStarts[i] + ROW_H / 2;
      labelGroup.append("text")
        .attr("x", -6).attr("y", cy)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "central")
        .style("font-size", labelFontSize).style("fill", "#444")
        // .text(cat.length > 26 ? cat.slice(0, 25) + "\u2026" : cat);
        .text((cat ?? "").length > 20 ? cat.slice(0, 25) + "\u2026" : (cat ?? ""));
    });

    // Rank axis header with hover hint
    rankGroup.append("text")
      .attr("x", W + 24).attr("y", -6)
      .attr("text-anchor", "middle")
      .style("font-size", "11px").style("fill", "#999").style("font-weight", "600")
      .style("cursor", "default")
      .text("Rank")
      .on("mouseover", function(event) {
        evtTooltip.style("display", null).html(
          `<div style="font-size:11px;color:#555;line-height:1.5">
             Rank 1 = highest impact<br>
             Rank 65 = lowest impact
           </div>`
        );
        const cRect  = container.node().getBoundingClientRect();
        // Flip left: rank strip is on the far right so tooltip opens leftward
        evtTooltip
          .style("left", (event.clientX - cRect.left - 185) + "px")
          .style("top",  (event.clientY - cRect.top  - 30)  + "px");
      })
      .on("mouseleave", () => evtTooltip.style("display", "none"));

    // Rank numbers with hover tooltip
    sortedCats.forEach((_, i) => {
      const rank = i + 1;
      const show = N_CATS <= 30
        ? true
        : (rank === 1 || rank === N_CATS || rank % 5 === 0);
      if (!show) return;
      const cy = rowYStarts[i] + ROW_H / 2;
      rankGroup.append("text")
        .attr("x", W + 24).attr("y", cy)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .style("font-size", "11px").style("fill", "#bbb")
        .style("cursor", "default")
        .text(rank)
        .on("mouseover", function(event) {
          evtTooltip.style("display", null).html(
            `<div style="font-size:11px;color:#555;line-height:1.5">
               Rank 1 = highest impact<br>
               Rank 65 = lowest impact
             </div>`
          );
          const cRect = container.node().getBoundingClientRect();
          evtTooltip
            .style("left", (event.clientX - cRect.left - 150) + "px")
            .style("top",  (event.clientY - cRect.top  - 50) + "px");
        })
        .on("mouseleave", () => evtTooltip.style("display", "none"));
    });

    // Cells: one g.row-group per category
    const rowGroupEls = [];
    sortedCats.forEach((cat, rowIdx) => {
      const rowG  = cellGroup.append("g").attr("class", "row-group");
      rowGroupEls.push(rowG);
      const rowY  = rowYStarts[rowIdx];
      const scale = rowScales.get(cat);
      const colMap = displayValues.get(cat);

      displayDates.forEach((date, colIdx) => {
        const key  = fmtInput(date);
        const cell = colMap?.get(key);
        const val  = cell?.value ?? null;
        const fill = (val != null && !isNaN(val)) ? scale(val) : MISSING_FILL;
        rowG.append("rect")
          .attr("x",      colX(colIdx))
          .attr("y",      rowY)
          .attr("width",  Math.max(effectiveCellW - 0.2, 0.5))
          .attr("height", ROW_H)
          .attr("fill",   fill);
      });
    });

    // Event markers: horizontal label below grid, tick + dot + dashed line
    const activeEvents = EVENTS_BY_GROUP[activeEventGroup] || [];
    activeEvents.forEach(evt => {
      const evtDate = parseDate(evt.date);
      if (!evtDate || evtDate < dFrom || evtDate > dTo) return;

      const weekStartDate = getJanAnchoredWeekStart(evtDate);
      const weekStartStr  = fmtInput(weekStartDate);
      const idx = displayDates.findIndex(d => fmtInput(d) === weekStartStr);
      if (idx < 0) return;

      const dayOffset = Math.floor((evtDate - weekStartDate) / 86400000);
      const ex = colX(idx) + (dayOffset + 0.5) / 7 * effectiveCellW;

      const markerG = eventGroup.append("g")
        .attr("class", "event-marker")
        .style("cursor", "pointer");

      // Dashed vertical line through chart body
      markerG.append("line")
        .attr("x1", ex).attr("x2", ex)
        .attr("y1", 0).attr("y2", chart_H + 4)
        .attr("stroke", "#ccc").attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,3");

      markerG.append("line")
        .attr("x1", ex).attr("x2", ex)
        .attr("y1", chart_H + 6).attr("y2", chart_H + 14)
        .attr("stroke", "#999").attr("stroke-width", 1.5);

      // Dot and short tick below grid
      markerG.append("circle")
        .attr("cx", ex).attr("cy", chart_H + 4 + 13)
        .attr("r", 4).attr("fill", "#999");

      // // Horizontal label below tick
      // markerG.append("text")
      //   .attr("x", ex).attr("y", chart_H + 22)
      //   .attr("text-anchor", "middle")
      //   .style("font-size", "8px").style("fill", "#aaa")
      //   .text(evt.label);

      markerG
        .on("mouseover", function(event) {
          tooltip.style("display", "none");
          evtTooltip.style("display", null).html(
            `<div style="font-weight:600;color:#888;margin-bottom:2px">
               ${evt.label}</div>
             <div style="color:#555">${fmtDate(evtDate)}</div>`
          );
          const cRect = container.node().getBoundingClientRect();
          evtTooltip
            .style("left", (event.clientX - cRect.left + 10) + "px")
            .style("top",  (event.clientY - cRect.top  - 50) + "px");
        })
        .on("mouseleave", () => evtTooltip.style("display", "none"));
    });

    // Y-axis label
    axisLegGroup.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -chart_H / 2)
      .attr("y", -MARGIN.left + 10)
      .attr("text-anchor", "middle")
      .style("font-size", "11px").style("fill", "#666")
      .text("LCFS Categories (ranked by impact)");

    // Legend bar
    const legG = axisLegGroup.append("g")
      .attr("transform", `translate(${W - 150},${chart_H + 34})`);

    legG.append("text")
      .attr("x", 0).attr("y", 5)
      .style("font-size", "10px").style("fill", "#999")
      .text(activePkg ? "Deviation from annual mean:" : "Per-row scale:");

    legG.append("rect")
      .attr("y", 10).attr("width", 140).attr("height", 10).attr("rx", 2)
      .style("fill", "url(#hm-v2-legend-grad)");

    if (activePkg) {
      legG.append("text").attr("x", 0)  .attr("y", 30)
        .style("font-size", "9px").style("fill", "#bbb").text("Below mean");
      legG.append("text").attr("x", 70) .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "9px").style("fill", "#bbb").text("Annual mean");
      legG.append("text").attr("x", 140).attr("y", 30)
        .attr("text-anchor", "end")
        .style("font-size", "9px").style("fill", "#bbb").text("Above mean");
    } else {
      legG.append("text").attr("x", 0)  .attr("y", 30)
        .style("font-size", "9px").style("fill", "#bbb").text("Low");
      legG.append("text").attr("x", 140).attr("y", 30)
        .attr("text-anchor", "end")
        .style("font-size", "9px").style("fill", "#bbb").text("High");
    }

    // Cell hover tooltip
    overlay
      .on("mousemove", function(event) {
        const [mx, my] = d3.pointer(event, this);

        let colIdx = -1, minDist = Infinity;
        displayDates.forEach((d, i) => {
          const cx   = colX(i) + effectiveCellW / 2;
          const dist = Math.abs(mx - cx);
          if (dist < minDist) { minDist = dist; colIdx = i; }
        });

        const rowIdx = findRowIdx(my, rowYStarts, ROW_H);

        if (colIdx < 0 || rowIdx < 0 || minDist > effectiveCellW + MONTH_GAP) {
          tooltip.style("display", "none");
          rowGroupEls.forEach(rg => rg.attr("opacity", 1));
          return;
        }

        rowGroupEls.forEach(rg => rg.attr("opacity", DIM_OPACITY));
        rowGroupEls[rowIdx].attr("opacity", 1);

        const date = displayDates[colIdx];
        const cat  = sortedCats[rowIdx];
        const key  = fmtInput(date);
        const cell = displayValues.get(cat)?.get(key);

        if (!cell) { tooltip.style("display", "none"); return; }

        const pctColour  = cell.pct >= 0 ? "#d62728" : "#2ca02c";
        const rankLabel  = (cell.rank != null) ? `${cell.rank} of 65` : "\u2014";

        // Annual share only shown for Total SF -- omitted from per-kg tooltip
        const annualBlock = !activePkg && cell.share != null
          ? `<div style="font-size:11px;font-weight:600;color:#888;
                         margin-top:6px;border-top:1px solid #eee;padding-top:4px">
               Annual data:
             </div>
             <div><b>Annual contribution to total SF:</b>
               ${d3.format(".2f")(cell.share)}%
             </div>`
          : "";

        tooltip.style("display", null).html(
          `<div style="font-weight:600;color:${activeInterp(0.7)};margin-bottom:3px">
             ${cfg.short} ${activePkg ? "per kg" : "Sales Footprint"}
           </div>
           <div><b>Week of:</b> ${fmtDate(date)}</div>
           <div><b>Category:</b> ${cat}</div>
           <div style="font-size:11px;font-weight:600;color:#888;
                       margin-top:6px;border-top:1px solid #eee;padding-top:4px">
             Week's data:
           </div>
           <div><b>Week's rank:</b> ${rankLabel}</div>
           <div><b>Deviation from annual mean:</b>
             <span style="color:${pctColour}">${pctFormatter(cell.pct)}</span>
           </div>
           ${annualBlock}`
        );
        //            <div><b>Weekly mean:</b> ${valFormatter(cell.value)} ${activeUnit}</div>

        const cRect  = container.node().getBoundingClientRect();
        const tipW   = 280;
        const tipH   = 180;
        const left   = event.clientX - cRect.left + 14;
        const top    = event.clientY - cRect.top;
        const flipUp = top + tipH + 10 > cRect.height;
        tooltip
          .style("left", (left + tipW > cRect.width ? left - tipW - 24 : left) + "px")
          .style("top",  (flipUp ? top - tipH - 10 : top + 10) + "px");
      })
      .on("mouseleave", function() {
        tooltip.style("display",    "none");
        evtTooltip.style("display", "none");
        rowGroupEls.forEach(rg => rg.attr("opacity", 1));
      });

    // // Dynamic labels and footnote
    // titleDiv
    //   .style("color", activeInterp(0.7))
    //   .text(`${cfg.short} ${activePkg ? "Per kg" : "Sales Footprint"} -- Weekly Average`);

    // subtitleDiv.text(
    //   `Top ${N_CATS} of ${allCats.length} categories  --  ` +
    //   `${N_COLS} weeks  --  ` +
    //   `${activePkg ? "per-kg deviation from annual mean" : "total SF"} ` +
    //   `-- colour scaled per row`
    // );

    footnoteEl.text(EVENT_FOOTNOTES[activeEventGroup] || "");

    // Update swatch colour and annual mean reference values
    hmLegendSwatch.select(".hm-legend-line").attr("stroke", activeInterp(0.7));
    hmLegendLabel
      .style("color", activeInterp(0.7))
      .text(`${cfg.short} -- ${activePkg ? "Per kg" : "Total SF"}`);
    hmLegendMeanSF.text(
      `Annual mean SF: ${hmStatFmt(grandAnnualSF[activeMetric])} ${cfg.unit}`
    );
    hmLegendMeanPkg.text(
      `Annual mean per kg: ${hmStatFmt(grandAnnualPkg[activeMetric])} ${cfg.pkg_unit}`
    );

    syncResetButton();
  }


  redraw();
  return container.node();
}