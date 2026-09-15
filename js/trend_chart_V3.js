// trend_chart.js -- TP-V2
// Timeline chart for the FIO-EISE dashboard.
// Receives 52-row weekly bin data from L1_rolling_updated.json.
// Returns a DOM node. Call: createTrendChart(l1Data, { width }).

function createTrendChart(data, { width = 960 } = {}) {

  // 1a: Config

  // All pixel dimensions and spacing values in one block.
  // Change values here only
  const LAYOUT = {
    H               : 320,
    MARGIN          : { top: 100, right: 60, bottom: 40, left: 88 },
    PKG_PAD_FACTOR  : 0.5,   // y padding fraction for per-kg view
    PKG_MIN_RANGE   : 1.5,    // min y span enforced for per-kg view
    EVENT_TICK_Y1   : -20,    // top of event marker tick line
    EVENT_TICK_Y2   : -8,     // bottom of event marker tick line
    EVENT_LABEL_Y   : -22,    // rotated label anchor y position
    DATE_LABEL_Y    : 44,     // px below grid for Date x-axis label
    FOOTNOTE_SIZE   : "12px",
    FOOTNOTE_MARGIN : "12px 0 8px 0",
  };

  const { H, MARGIN } = LAYOUT;
  const W = width - MARGIN.left - MARGIN.right;

  const METRICS = {
    composite: {
      col       : "roll7_composite_norm",
      pkg_col   : "roll7_composite_intensity_norm",
      label     : "Composite Impact - Total Sales FP (scaled 0-1)",
      pkg_label : "Composite Impact - Per-Kg (scaled 0-1)",
      short     : "Composite Impact",
      unit      : "(0-1 scale)",
      pkg_unit  : "(0-1 scale)",
      colour    : "#444444",
      fmt       : d3.format(".3f"),
      pkg_fmt   : d3.format(".3f"),
    },
    GHGE: {
      col       : "roll7_GHGE_SF",
      pkg_col   : "roll7_GHGE_perkg",
      label     : "GHGE Sales Footprint (kg CO2-eq/day)",
      pkg_label : "GHGE per kg sold (kg CO2-eq/kg)",
      short     : "GHGE",
      unit      : "kg CO2-eq/day",
      pkg_unit  : "kg CO2-eq/kg",
      colour    : "#2ca02c",
      fmt       : null,
      pkg_fmt   : null,
    },
    LU: {
      col       : "roll7_LU_SF",
      pkg_col   : "roll7_LU_perkg",
      label     : "Land Use Sales Footprint (m2yr/day)",
      pkg_label : "Land Use per kg sold (m2yr/kg)",
      short     : "Land Use",
      unit      : "m2yr/day",
      pkg_unit  : "m2yr/kg",
      colour    : "#ff7f0e",
      fmt       : null,
      pkg_fmt   : null,
    },
    WU: {
      col       : "roll7_WU_SF",
      pkg_col   : "roll7_WU_perkg",
      label     : "Water Use Sales Footprint (L/day)",
      pkg_label : "Water Use per kg sold (L/kg)",
      short     : "Water Use",
      unit      : "L/day",
      pkg_unit  : "L/kg",
      colour    : "#1f77b4",
      fmt       : null,
      pkg_fmt   : null,
    },
  };

  const METRIC_OPTIONS = [
    { key: "GHGE",      display: "GHGE (Greenhouse Gas Emissions)" },
    { key: "LU",        display: "LU (Land Use)"                   },
    { key: "WU",        display: "WU (Water Use)"                  },
    { key: "composite", display: "Composite Impact -- Overall"      },
  ];

  const EVENTS_BY_GROUP = {
    public_holidays: [
      { date: "2023-01-03", label: "New Year's Day BH"  },
      { date: "2023-04-15", label: "Good Friday BH"     },
      { date: "2023-04-18", label: "Easter Monday BH"   },
      { date: "2023-05-02", label: "Early May BH"       },
      { date: "2023-06-02", label: "Spring BH"          },
      { date: "2023-06-03", label: "Jubilee BH"         },
      { date: "2023-08-29", label: "Summer BH"          },
      { date: "2023-09-19", label: "State Funeral BH"   },
      { date: "2023-12-26", label: "Boxing Day BH"      },
      { date: "2023-12-27", label: "Christmas Day BH"   },
    ],
    cultural_events: [
      { date: "2023-03-27", label: "Mother's Day"       },
      { date: "2023-04-02", label: "Ramadan Start"      },
      { date: "2023-04-15", label: "Good Friday"        },
      { date: "2023-04-18", label: "Easter Monday"      },
      { date: "2023-05-02", label: "Ramadan End"        },
      { date: "2023-06-19", label: "Father's Day"       },
      { date: "2023-10-24", label: "Diwali"             },
      { date: "2023-10-31", label: "Halloween"          },
      { date: "2023-12-25", label: "Christmas"          },
    ],
    school_calendar: [
      { date: "2023-02-21", label: "SH-1 S"             },
      { date: "2023-02-25", label: "SH-1 E"             },
      { date: "2023-04-04", label: "SH-2 S"             },
      { date: "2023-04-14", label: "SH-2 E"             },
      { date: "2023-05-30", label: "SH-3 S"             },
      { date: "2023-06-01", label: "SH-3 E"             },
      { date: "2023-07-27", label: "SH-4 S"             },
      { date: "2023-09-02", label: "SH-4 E"             },
      { date: "2023-10-24", label: "SH-5 S"             },
      { date: "2023-10-28", label: "SH-5 E"             },
      { date: "2023-12-19", label: "SH-6 S"             },
      { date: "2023-12-30", label: "SH-6 E"             },
    ],
    weather_events: [
      { date: "2023-06-16", label: "HW (3 days)"        },
      { date: "2023-07-18", label: "HW (3 days)"        },
      { date: "2023-08-12", label: "HW (7 days)"        },
    ],
    sporting_events: [
      { date: "2023-02-05", label: "SN S"               },
      { date: "2023-03-19", label: "SN E"               },
      { date: "2023-07-06", label: "WE S"               },
      { date: "2023-07-31", label: "WE E"               },
      { date: "2023-07-28", label: "CG S"               },
      { date: "2023-08-08", label: "CG E"               },
      { date: "2023-11-20", label: "WC S"               },
      { date: "2023-12-18", label: "WC E"               },
    ],
  };

  const EVENT_FOOTNOTES = {
    public_holidays : "BH = Bank Holiday",
    cultural_events : "",
    school_calendar : "SH = School Holidays  S = Period start  E = Period end",
    weather_events  : "HW = Heatwave  number in brackets = duration in days",
    sporting_events : "CG = Commonwealth Games  SN = Six Nations  " +
                      "WC = FIFA World Cup  WE = UEFA Women's Euro  " +
                      "S = Period start  E = Period end",
  };

  const EVENT_GROUP_OPTIONS = [
    { key: "public_holidays", display: "Public Holidays" },
    { key: "cultural_events", display: "Cultural Events" },
    { key: "school_calendar", display: "School Calendar" },
    { key: "weather_events",  display: "Weather Events"  },
    { key: "sporting_events", display: "Sporting Events" },
  ];

  // Chart state
  let activeMKey       = "GHGE";
  let activePkg        = false;
  let activeEventGroup = "public_holidays";
  let xScale           = null;   // hoisted for redrawEventMarkers()


  // 1b: Parse 
  if (!data.length || typeof data[0].week_start !== "string") {
    console.error("TP-V2: week_start field missing or not a string.");
    return Object.assign(document.createElement("div"), {
      textContent: "Chart failed to load -- check console for details."
    });
  }

  const parseDate = d3.timeParse("%Y-%m-%d");
  const fmtDate   = d3.timeFormat("%d %b %Y");
  const fmtInput  = d3.timeFormat("%Y-%m-%d");

  // Parse week_start into d.date for all downstream logic
  data.forEach(d => {
    d.date = parseDate(String(d.week_start).trim());
  });

  // Build smoothed series from pre-computed weekly bin columns
  function buildSmoothedFromCol(rows, col) {
    return rows
      .filter(d => d.date != null && d[col] != null && !isNaN(d[col]))
      .map(d => ({ date: d.date, value: +d[col] }));
  }

  const smoothed = {
    composite : buildSmoothedFromCol(data, "roll7_composite_norm"),
    GHGE      : buildSmoothedFromCol(data, "roll7_GHGE_SF"),
    LU        : buildSmoothedFromCol(data, "roll7_LU_SF"),
    WU        : buildSmoothedFromCol(data, "roll7_WU_SF"),
  };

  const smoothedPkg = {
    composite : buildSmoothedFromCol(data, "roll7_composite_intensity_norm"),
    GHGE      : buildSmoothedFromCol(data, "roll7_GHGE_perkg"),
    LU        : buildSmoothedFromCol(data, "roll7_LU_perkg"),
    WU        : buildSmoothedFromCol(data, "roll7_WU_perkg"),
  };

  // Annual means from full 52-bin series -- used in tooltip % deviation
  const annualMeans    = {};
  const annualMeansPkg = {};
  for (const m of Object.keys(METRICS)) {
    annualMeans[m]    = smoothed[m].length
      ? d3.mean(smoothed[m],    d => d.value) : 0;
    annualMeansPkg[m] = smoothedPkg[m].length
      ? d3.mean(smoothedPkg[m], d => d.value) : 0;
  }

  console.log("TP-V2 smoothed series (52 weekly bins):");
  for (const m of Object.keys(METRICS)) {
    console.log(`  ${m}: n=${smoothed[m].length}`);
  }

  const dateMinStr = fmtInput(d3.min(data, d => d.date));
  const dateMaxStr = fmtInput(d3.max(data, d => d.date));


  // 1c: Helpers 

  // Short SI labels for y-axis ticks -- K and M only.
  // Does not spell out million to keep tick labels compact.
  function axisFormatter(v) {
    const abs = Math.abs(v);
    if (abs === 0)    return "0";
    if (abs >= 1e9)   return d3.format(".1s")(v).replace("G", "B");
    if (abs >= 1e6)   return d3.format(".2s")(v);
    if (abs >= 1e3)   return d3.format(".2s")(v).replace("k", "K");
    if (abs < 10)     return d3.format(".2f")(v);
    return d3.format(".1f")(v);
  }

  // Spelled-out formatter for tooltip values.
  // Uses explicit math at each threshold to avoid d3 SI rounding
  // that shows "1.0M" for values just below 1e6 (the M-vs-million bug).
  function yFormatter(v, cfg) {
    const fmtFn = activePkg ? cfg.pkg_fmt : cfg.fmt;
    if (fmtFn) return fmtFn(v);
    const abs = Math.abs(v);
    if (abs >= 1e9) return d3.format(".2f")(v / 1e9) + " billion";
    if (abs >= 1e6) return d3.format(".2f")(v / 1e6) + " million";
    if (abs >= 1e3) return d3.format(".0f")(v / 1e3) + "K";
    if (abs < 10)   return d3.format(".2f")(v);
    return d3.format(".1f")(v);
  }

  // Compact formatter for the annual mean reference values in the legend block.
  // Separate from yFormatter so SF and per-kg can always use their own format.
  function statFmt(v) {
    if (v == null || isNaN(v)) return "--";
    const abs = Math.abs(v);
    if (abs >= 1e6) return d3.format(".2f")(v / 1e6) + " million";
    if (abs >= 1e3) return d3.format(".0f")(v / 1e3) + "K";
    if (abs >= 10)  return d3.format(".1f")(v);
    return d3.format(".2f")(v);
  }

  function pctFormatter(v) {
    if (v == null || isNaN(v)) return "--";
    return (v >= 0 ? "+" : "") + d3.format(".1f")(v) + "%";
  }


  // 1d: Controls 
  const container = d3.create("div")
    .style("font-family", "sans-serif")
    .style("position", "relative");

  container.append("div")
    .style("font-size", "20px")
    .style("font-weight", "700")
    .style("color", "#222")
    .style("margin-bottom", "6px")
    .text("Timeline of Environmental Impact from Food and Drink Sales");

  // Static chart context -- always visible regardless of active state
  container.append("div")
    .style("font-size", "14px")
    .style("color", "#666")
    .style("line-height", "1.6")
    .style("margin-top", "12px")
    .style("margin-bottom", "24px")
    .style("max-width", "100%")
    .text(
      "This chart can be used to explore the seasonal variation in " +
      "environmental impacts from food and drink sales for total sales " +
      "footprints (SF) and for per-kg sales footprints (SF). " +
      "Please visit the About this tool page to learn more about these " +
      "footprints and how the chart can be configured."
    );

  // Dynamic metric state label -- colour and text updated in redraw()
  const titleDiv = container.append("div")
    .style("font-size", "13px")
    .style("font-weight", "600")
    .style("margin-bottom", "2px");

  // // Dynamic subtitle -- updated in redraw()
  // const subtitleDiv = container.append("div")
  //   .style("font-size", "11px")
  //   .style("color", "#999")
  //   .style("margin-bottom", "10px");

  // Dynamic subtitle -- updated in redraw()
  const subtitleDiv = container.append("div")
    .style("font-size", "11px")
    .style("color", "#999")
    .style("margin-bottom", "6px");

  // Legend: coloured line swatch + metric and view label
  // Updates on every redraw to reflect active metric and toggle state
  // const legendDiv = container.append("div")
  //   .style("display", "flex")
  //   .style("align-items", "center")
  //   .style("gap", "8px")
  //   .style("margin-bottom", "10px");

  
  const legendDiv = container.append("div")
    .style("display", "flex")
    .style("gap", "4px")
    .style("position", "absolute")
    .style("flex-direction", "row")
    .style("align-items", "flex-start")
    .style("top", MARGIN.top + 8 + "px")
    // .style("right", MARGIN.right + 8 + "px")
    .style("right", "0")    
    .style("background", "rgba(255,255,255,0.85)")
    .style("padding", "3px 3px")
    .style("border-radius", "4px")
    .style("pointer-events", "none");

  const legendSwatch = legendDiv.append("svg")
    .attr("width", "32")
    .attr("height", "10");
    // .style("flex-shrink", "0");

  legendSwatch.append("line")
    .attr("x1", "0").attr("y1", "5")
    .attr("x2", "32").attr("y2", "5")
    .attr("stroke-width", "2.5")
    .attr("stroke-linecap", "round")
    .attr("class", "legend-line");

  const legendLabel = legendDiv.append("span")
    .style("font-size", "12px")
    .style("color", "#555");

//   // Event row (top): event overlay dropdown + per-kg toggle
//   const eventRow = container.append("div")
//     .style("display", "flex")
//     .style("align-items", "center")
//     .style("gap", "10px")
//     .style("flex-wrap", "wrap")
//     .style("margin-bottom", "8px");

//   eventRow.append("span")
//     .style("font-size", "12px")
//     .style("color", "#666")
//     .text("Event overlay:");

//   const eventGroupSelect = eventRow.append("select")
//     .style("font-size", "12px").style("padding", "4px 8px")
//     .style("border-radius", "4px").style("border", "1px solid #ccc")
//     .style("background", "white").style("cursor", "pointer")
//     .on("change", function() {
//       activeEventGroup = d3.select(this).property("value");
//       if (xScale) redrawEventMarkers();
//     });

//   EVENT_GROUP_OPTIONS.forEach(({ key, display }) => {
//     eventGroupSelect.append("option")
//       .attr("value", key)
//       .property("selected", key === activeEventGroup)
//       .text(display);
//   });

//   // Separator between event select and per-kg pill
//   eventRow.append("div")
//     .style("width", "1px").style("height", "18px")
//     .style("background", "#ddd").style("margin", "0 4px");

//   // Per-kg pill in the event row (top row)
//   const pkgPill = eventRow.append("div")
//     .style("display", "flex")
//     .style("border", "1px solid #ccc")
//     .style("border-radius", "4px")
//     .style("overflow", "hidden");

//   const btnTotal = pkgPill.append("button")
//     .text("Total SF")
//     .style("font-size", "12px").style("padding", "4px 10px")
//     .style("border", "none").style("cursor", "pointer")
//     .style("transition", "background 0.15s, color 0.15s");

//   const btnPkg = pkgPill.append("button")
//     .text("Per kg")
//     .style("font-size", "12px").style("padding", "4px 10px")
//     .style("border", "none").style("border-left", "1px solid #ccc")
//     .style("cursor", "pointer")
//     .style("transition", "background 0.15s, color 0.15s");

//   function syncPkgToggle() {
//     btnTotal.style("background", !activePkg ? "#555" : "#fff")
//             .style("color",      !activePkg ? "#fff" : "#555");
//     btnPkg  .style("background",  activePkg ? "#555" : "#fff")
//             .style("color",       activePkg ? "#fff" : "#555");
//   }

//   btnTotal.on("click", function() {
//     if (activePkg) { activePkg = false; syncPkgToggle(); redraw(); }
//   });
//   btnPkg.on("click", function() {
//     if (!activePkg) { activePkg = true; syncPkgToggle(); redraw(); }
//   });
//   syncPkgToggle();

//   // Control row (bottom): metric + dates + reset
//   const ctrlRow = container.append("div")
//     .style("display", "flex")
//     .style("align-items", "center")
//     .style("gap", "10px")
//     .style("flex-wrap", "wrap")
//     .style("margin-bottom", "12px");

//   const metricSelect = ctrlRow.append("select")
//     .style("font-size", "12px").style("padding", "4px 8px")
//     .style("border-radius", "4px").style("border", "1px solid #ccc")
//     .style("background", "white").style("cursor", "pointer")
//     .on("change", function() {
//       activeMKey = d3.select(this).property("value");
//       redraw();
//     });

//   METRIC_OPTIONS.forEach(({ key, display }) => {
//     metricSelect.append("option")
//       .attr("value", key)
//       .property("selected", key === activeMKey)
//       .text(display);
//   });

//   ctrlRow.append("div")
//     .style("width", "1px").style("height", "18px")
//     .style("background", "#ddd").style("margin", "0 2px");

//   ctrlRow.append("span")
//     .style("font-size", "12px").style("color", "#666")
//     .text("From:");

  // // Top row: metric dropdown + per-kg toggle
  // const topRow = container.append("div")
  //   .style("display", "flex")
  //   .style("align-items", "center")
  //   .style("gap", "10px")
  //   .style("flex-wrap", "wrap")
  //   .style("margin-bottom", "8px");

  // ctrlWrapper: bounds absolute legend positioning without affecting row layout
  const ctrlWrapper = container.append("div")
    .style("position", "relative");

  // Top row: nowrap prevents a third row forming
  // padding-right reserves space so content never slides under the legend
  const topRow = ctrlWrapper.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("flex-wrap", "nowrap")
    .style("margin-bottom", "8px")
    // .style("padding-right", "240px");

  const metricSelect = topRow.append("select")
    .style("font-size", "12px").style("padding", "4px 8px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("background", "white").style("cursor", "pointer")
    .on("change", function() {
      activeMKey = d3.select(this).property("value");
      redraw();
    });

  METRIC_OPTIONS.forEach(({ key, display }) => {
    metricSelect.append("option")
      .attr("value", key)
      .property("selected", key === activeMKey)
      .text(display);
  });

  topRow.append("div")
    .style("width", "1px").style("height", "18px")
    .style("background", "#ddd").style("margin", "0 4px");

  // Per-kg pill in top row alongside metric dropdown
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

  // Bottom row: event overlay dropdown + date pickers + reset
  const ctrlRow = ctrlWrapper.append("div").style("margin-bottom", "12px")
    .style("max-width", "75%")

  // // Bottom row: event overlay dropdown + date pickers + reset
  // const ctrlRow = container.append("div")
  //   .style("display", "flex")
  //   .style("align-items", "center")
  //   .style("gap", "10px")
  //   .style("flex-wrap", "wrap")
  //   .style("margin-bottom", "12px");

  ctrlRow.append("span")
    .style("font-size", "12px").style("color", "#666")
    .style("margin-right", "10px")
    // .style("margin-bottom", "12px")
    .text("Event overlay:");

  const eventGroupSelect = ctrlRow.append("select")
    .style("font-size", "12px").style("padding", "4px 8px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("background", "white").style("cursor", "pointer")
    .style("margin-right", "10px")
    .on("change", function() {
      activeEventGroup = d3.select(this).property("value");
      if (xScale) redrawEventMarkers();
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
    .style("margin-right", "10px")
    .text("From:");

  const startPicker = ctrlRow.append("input")
    .attr("type", "date").attr("value", dateMinStr)
    .attr("min", dateMinStr).attr("max", dateMaxStr)
    .style("font-size", "12px").style("padding", "3px 6px")
    .style("border-radius", "4px").style("border", "1px solid #ccc")
    .style("margin-right", "10px")
    .on("change", function() {
      if (this.value > endPicker.property("value"))
        this.value = endPicker.property("value");
      redraw();
    });

  ctrlRow.append("span")
    .style("font-size", "12px").style("color", "#666")
    .style("margin-right", "10px")
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
      endPicker.property("value", dateMaxStr);
      redraw();
    });

  function syncResetButton() {
    const atFull = startPicker.property("value") === dateMinStr &&
                   endPicker.property("value")   === dateMaxStr;
    resetBtn
      .attr("disabled", atFull ? true : null)
      .style("opacity",        atFull ? "0.35" : "1")
      .style("cursor",         atFull ? "not-allowed" : "pointer")
      .style("pointer-events", atFull ? "none" : "auto");
  }

  //   // Legend block: swatch + annual mean reference values.
  // // Pushed to the right of topRow via margin-left auto.
  // const legendBlock = topRow.append("div")
  //   .style("margin-left", "auto")
  //   .style("display", "flex")
  //   .style("flex-direction", "column")
  //   .style("align-items", "flex-end")
  //   .style("gap", "2px")
  //   .style("padding-left", "12px");

  // Legend block: out of flex flow, anchored top-right of ctrlWrapper.
  // z-index 5 keeps it above rows without affecting layout.
  // Remove this block independently without touching topRow or ctrlRow.
  const legendBlock = ctrlWrapper.append("div")
    .style("position", "absolute")
    .style("top", "0")
    .style("right", "0")
    .style("z-index", "5")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "flex-end")
    .style("gap", "3px")
    // .style("padding", "4px 4px")
    .style("margin-left", "0px")
    .style("margin-top", "24px")
    .style("background", "rgba(255,255,255,0.92)")
    .style("border-radius", "4px");

  const swatchRow = legendBlock.append("div")
    .style("display", "flex")
    .style("align-items", "flex-end")
    .style("gap", "3px");

  // const legendSwatch = swatchRow.append("svg")
  //   .attr("width", "28").attr("height", "10")
  //   .style("flex-shrink", "0");

  legendSwatch.append("line")
    .attr("x1", "0").attr("y1", "20")
    .attr("x2", "28").attr("y2", "20")
    .attr("stroke-width", "2.5")
    .attr("stroke-linecap", "round")
    .attr("class", "legend-line")
    .style("align-items", "flex-end");;

  // const legendLabel = swatchRow.append("span")
  //   .style("font-size", "12px")
  //   .style("color", "#555");

  // Two stat lines below the swatch -- values updated in redraw()
  const legendMeanSF = legendBlock.append("span")
    .style("font-size", "12px").style("color", "#555");

  const legendMeanPkg = legendBlock.append("span")
    .style("font-size", "12px").style("color", "#555");


  // 1e: SVG shell

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", H + MARGIN.top + MARGIN.bottom)
    .style("overflow", "visible");

  const g = svg.append("g")
    .attr("transform", `translate(${MARGIN.left + 25},${MARGIN.top})`);

  // Layer order: grid, events, line, overlay
  const gridGroup  = g.append("g").attr("class", "grid");
  const eventGroup = g.append("g").attr("class", "events");
  const lineGroup  = g.append("g").attr("class", "line");
  const xAxisGroup = g.append("g").attr("transform", `translate(0,${H})`);
  const yAxisGroup = g.append("g");

  // Y-axis label -- text updated in redraw(), y anchored to MARGIN.left
  const yAxisLabelEl = g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(H / 2))
    .attr("y", -(MARGIN.left - 10))
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", "#666");

  // Date x-axis label -- static, always visible
  g.append("text")
    .attr("x", W / 2)
    .attr("y", H + LAYOUT.DATE_LABEL_Y)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", "#666")
    .text("Date");

  // Hover elements
  const hoverLine = g.append("line")
    .attr("y1", 0).attr("y2", H)
    .attr("stroke", "#aaa").attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,3")
    .style("display", "none");

  const hoverDot = g.append("circle")
    .attr("r", 5).attr("fill", "white").attr("stroke", "#555")
    .attr("stroke-width", 2)
    .style("display", "none");

  const overlay = g.append("rect")
    .attr("width", W).attr("height", H)
    .attr("fill", "none")
    .style("pointer-events", "all");

  // Data tooltip div
  const tooltip = container.append("div")
    .style("position", "absolute").style("pointer-events", "none")
    .style("background", "rgba(255,255,255,0.97)")
    .style("border", "1px solid #ccc").style("border-radius", "6px")
    .style("padding", "8px 12px").style("font-size", "12px")
    .style("line-height", "1.8")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.12)")
    .style("display", "none").style("max-width", "240px")
    .style("z-index", "10");

  // Footnote below SVG -- text set by redrawEventMarkers()
  const footnoteEl = container.append("p")
    .style("font-size", LAYOUT.FOOTNOTE_SIZE)
    .style("color", "#bbb")
    .style("margin", LAYOUT.FOOTNOTE_MARGIN)
    .style("min-height", "18px")
    .text(EVENT_FOOTNOTES["public_holidays"]);


  // 1f: Event markers

  function redrawEventMarkers() {
    if (!xScale) return;
    eventGroup.selectAll("*").remove();

    const [domMin, domMax] = xScale.domain();
    const activeEvents = EVENTS_BY_GROUP[activeEventGroup] || [];

    activeEvents.forEach(evt => {
      const evtDate = parseDate(evt.date);
      if (!evtDate || evtDate < domMin || evtDate > domMax) return;
      const ex = xScale(evtDate);

      // const markerG = eventGroup.append("g")
      //   .attr("class", "event-marker")
      //   .style("cursor", "default");

      // markerG.append("line")
      //   .attr("x1", ex).attr("x2", ex)
      //   .attr("y1", LAYOUT.EVENT_TICK_Y1)
      //   .attr("y2", LAYOUT.EVENT_TICK_Y2)
      //   .attr("stroke", "#bbb").attr("stroke-width", 1.5);

      // markerG.append("circle")
      //   .attr("cx", ex).attr("cy", LAYOUT.EVENT_TICK_Y2)
      //   .attr("r", 2).attr("fill", "#bbb");

      // markerG.append("text")
      //   .attr("transform",
      //     `translate(${ex + 3},${LAYOUT.EVENT_LABEL_Y}) rotate(-90)`)
      //   .attr("text-anchor", "start")
      //   .style("font-size", "9px").style("fill", "#aaa")
      //   .text(evt.label);

      const markerG = eventGroup.append("g")
        .attr("class", "event-marker")
        .style("cursor", "default");

      // Full-height dashed line through chart body
      markerG.append("line")
        .attr("x1", ex).attr("x2", ex)
        .attr("y1", LAYOUT.EVENT_TICK_Y2)
        .attr("y2", H)
        .attr("stroke", "#bbb").attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,3");

      // Short solid tick above the chart grid
      markerG.append("line")
        .attr("x1", ex).attr("x2", ex)
        .attr("y1", LAYOUT.EVENT_TICK_Y1)
        .attr("y2", LAYOUT.EVENT_TICK_Y2)
        .attr("stroke", "#bbb").attr("stroke-width", 1.5);

      // Dot at the grid boundary
      markerG.append("circle")
        .attr("cx", ex).attr("cy", LAYOUT.EVENT_TICK_Y2)
        .attr("r", 2).attr("fill", "#bbb");

      // Rotated label above the tick
      markerG.append("text")
        .attr("transform",
          `translate(${ex + 3},${LAYOUT.EVENT_LABEL_Y}) rotate(-90)`)
        .attr("text-anchor", "start")
        .style("font-size", "9px").style("fill", "#aaa")
        .text(evt.label);
    });

    footnoteEl.text(EVENT_FOOTNOTES[activeEventGroup] || "");
  }


  // 1g: Redraw

  function redraw() {
    const cfg  = METRICS[activeMKey];
    const src  = activePkg ? smoothedPkg : smoothed;
    const mean = activePkg
      ? annualMeansPkg[activeMKey]
      : annualMeans[activeMKey];

    const dFrom = new Date(startPicker.property("value") + "T00:00:00");
    const dTo   = new Date(endPicker.property("value")   + "T00:00:00");

    const plotData = src[activeMKey].filter(
      d => d.date >= dFrom && d.date <= dTo
    );
    if (!plotData.length) return;

    // X scale -- hoisted for redrawEventMarkers()
    xScale = d3.scaleTime()
      .domain([dFrom, dTo])
      .range([0, W]);

    // // Y scale -- composite zero-baseline, per-kg minimum range enforced
    // const [yLow0, yHigh0] = d3.extent(plotData, d => d.value);
    // let yLow = yLow0, yHigh = yHigh0;

    // if (activePkg && LAYOUT.PKG_MIN_RANGE > 0) {
    //   const span = yHigh - yLow;
    //   if (span < LAYOUT.PKG_MIN_RANGE) {
    //     const mid = (yLow + yHigh) / 2;
    //     yLow  = mid - LAYOUT.PKG_MIN_RANGE / 2;
    //     yHigh = mid + LAYOUT.PKG_MIN_RANGE / 2;
    //   }
    // }

    // const padFactor = activePkg ? LAYOUT.PKG_PAD_FACTOR : 0.08;
    // const yPad      = (yHigh - yLow) * padFactor;
    // const yMin      = activeMKey === "composite" ? 0 : yLow - yPad;

    // const yScale = d3.scaleLinear()
    //   .domain([yMin, yHigh + yPad])
    //   .range([H, 0]);

    // Composite: fixed 0-1 domain regardless of data range.
    // This ensures both 0 and 1 labels always appear and the two
    // composite views (Total SF and Per-kg) share the same axis.
    // All other metrics: auto-range with padding.
    let yDomainMin, yDomainMax;

    if (activeMKey === "composite") {
      yDomainMin = 0;
      yDomainMax = 1;
    } else {
      const [yLow0, yHigh0] = d3.extent(plotData, d => d.value);
      let yLow = yLow0, yHigh = yHigh0;
      if (activePkg && LAYOUT.PKG_MIN_RANGE > 0) {
        const span = yHigh - yLow;
        if (span < LAYOUT.PKG_MIN_RANGE) {
          const mid = (yLow + yHigh) / 2;
          yLow  = mid - LAYOUT.PKG_MIN_RANGE / 2;
          yHigh = mid + LAYOUT.PKG_MIN_RANGE / 2;
        }
      }
      const padFactor = activePkg ? LAYOUT.PKG_PAD_FACTOR : 0.25;
      const yPad      = (yHigh - yLow) * padFactor;
      yDomainMin      = yLow - yPad;
      yDomainMax      = yHigh + yPad;
    }

    const yScale = d3.scaleLinear()
      .domain([yDomainMin, yDomainMax])
      .range([H, 0]);

    // X-axis ticks -- force Jan label when dFrom is mid-January
    const regularTicks = d3.timeMonth.range(
      d3.timeMonth.ceil(dFrom), dTo
    );
    const allTicks = (dFrom.getMonth() === 0 && dFrom.getDate() > 1)
      ? [dFrom, ...regularTicks]
      : regularTicks;

    xAxisGroup.call(
      d3.axisBottom(xScale)
        .tickValues(allTicks)
        .tickFormat(d3.timeFormat("%b %Y"))
    );
    xAxisGroup.selectAll("text")
      .style("font-size", "10px")
      .attr("dy", "0.8em");

    // // Y-axis -- axisFormatter for short compact tick labels
    // yAxisGroup.call(
    //   d3.axisLeft(yScale)
    //     .ticks(6)
    //     .tickFormat(axisFormatter)
    // );
    // yAxisGroup.selectAll("text").style("font-size", "10px");

    // Composite: explicit tick values include 0 and 1 at all times.
    // Other metrics: auto ticks from yScale.
    const yAxisCall = activeMKey === "composite"
      ? d3.axisLeft(yScale)
          .tickValues([0, 0.2, 0.4, 0.6, 0.8, 1.0])
          .tickFormat(d3.format(".1f"))
      : d3.axisLeft(yScale)
          .ticks(6)
          .tickFormat(axisFormatter);

    yAxisGroup.call(yAxisCall);
    yAxisGroup.selectAll("text").style("font-size", "10px");

    // Gridlines -- horizontal only, aligned to y-axis ticks
    gridGroup.selectAll("*").remove();
    gridGroup.call(
      d3.axisLeft(yScale)
        .ticks(6)
        .tickSize(-W)
        .tickFormat("")
    );
    gridGroup.selectAll("line")
      .attr("stroke", "#e8e8e8")
      .attr("stroke-dasharray", "2,2");
    gridGroup.select(".domain").remove();

    // Y-axis label -- updates with metric and toggle state
    yAxisLabelEl.text(activePkg ? cfg.pkg_label : cfg.label);

    // Event markers
    redrawEventMarkers();

    // Trend line with draw-on animation
    lineGroup.selectAll("*").remove();

    const lineGen = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX)
      .defined(d => d.value != null && !isNaN(d.value));

    const path = lineGroup.append("path")
      .datum(plotData)
      .attr("fill", "none")
      .attr("stroke", cfg.colour)
      .attr("stroke-width", 2.2)
      .attr("d", lineGen);

    const pathLen = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", pathLen)
      .attr("stroke-dashoffset", pathLen)
      .transition()
      .duration(600)
      .attr("stroke-dashoffset", 0);

    // Hover interaction
    const bisect = d3.bisector(d => d.date).left;

    overlay
      .on("mousemove", function(event) {
        const [mx] = d3.pointer(event, this);
        const x0   = xScale.invert(mx);
        const i    = bisect(plotData, x0, 1);
        const d0   = plotData[i - 1];
        const d1   = plotData[i];
        const pt   = (!d1 || x0 - d0.date < d1.date - x0) ? d0 : d1;
        if (!pt) return;

        const px = xScale(pt.date);
        const py = yScale(pt.value);

        hoverLine
          .style("display", null)
          .attr("stroke", cfg.colour)
          .attr("x1", px).attr("x2", px);

        hoverDot
          .style("display", null)
          .attr("cx", px).attr("cy", py)
          .attr("stroke", cfg.colour);

        const pctDev = mean
          ? ((pt.value - mean) / mean) * 100
          : null;
        const pctStr   = pctFormatter(pctDev);
        const pctColour = pctDev >= 0 ? "#d62728" : "#2ca02c";
        const activeUnit = activePkg ? cfg.pkg_unit : cfg.unit;

        tooltip
          .style("display", null)
          .html(
            `<div style="font-weight:600;color:${cfg.colour};margin-bottom:3px">
               ${cfg.short}${activePkg ? " per kg" : " Total SF"}
             </div>
             <div><b>Week of:</b> ${fmtDate(pt.date)}</div>
             <div><b>Value:</b> ${yFormatter(pt.value, cfg)} ${activeUnit}</div>
             <hr style="margin:5px 0;border:none;border-top:1px solid #eee"/>
             <div><b>Annual mean:</b> ${yFormatter(mean, cfg)} ${activeUnit}</div>
             <div><b>vs annual mean:</b>
               <span style="color:${pctColour}">${pctStr}</span>
             </div>
             <div style="font-size:10px;color:#bbb;margin-top:3px">
               7-day bin average
             </div>`
          );

        const cRect = container.node().getBoundingClientRect();
        const tipW  = 240;
        const left  = event.clientX - cRect.left + 14;
        tooltip
          .style("left",
            (left + tipW > cRect.width ? left - tipW - 24 : left) + "px")
          .style("top", (event.clientY - cRect.top - 10) + "px");
      })
      .on("mouseleave", function() {
        hoverLine.style("display", "none");
        hoverDot.style("display",  "none");
        tooltip.style("display",   "none");
      });

    // Title and subtitle
    const activeUnit = activePkg ? cfg.pkg_unit : cfg.unit;
    // titleDiv
    //   .style("color", cfg.colour)
    //   .text(
    //     `${cfg.short}${activePkg ? " -- Per kg" : " -- Total SF"}`
    //   );
    // subtitleDiv.text("Values shown are averaged over 7 days");
  
    // titleDiv
    //   .style("color", cfg.colour)
    //   .text(
    //     `${cfg.short}${activePkg ? " -- Per kg" : " -- Total SF"}`
    //   );
    // subtitleDiv.text("Values shown are averaged over 7 days");

    // // Update legend swatch colour and label text
    // legendSwatch.select(".legend-line")
    //   .attr("stroke", cfg.colour);
    // legendLabel
    //   .style("color", cfg.colour)
    //   .text(`${cfg.short} -- ${activePkg ? "Per kg" : "Total SF"}`);

    legendSwatch.select(".legend-line").attr("stroke", cfg.colour);
    legendLabel
      .style("color", cfg.colour)
      .text(`${cfg.short} -- ${activePkg ? "Per kg" : "Total SF"}`);
    legendMeanSF.text(
      `Annual mean SF: ${statFmt(annualMeans[activeMKey])} ${cfg.unit}`
    );
    legendMeanPkg.text(
      `Annual mean per kg: ${statFmt(annualMeansPkg[activeMKey])} ${cfg.pkg_unit}`
    );

    syncResetButton();
  }


  redraw();
  return container.node();
}