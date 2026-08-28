// FIO Food Dashboard: Trend Chart TP-V1.6
// Loads pre-computed 7-day rolling averages from dummy data
// Per-kg toggle (activePkg) switches between total SF and per-kg series.

function createTrendChart(data, { width = 680 } = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    console.error(
      "TP-V1.5 guard: data is empty or not an array.",
      "Received:", typeof data,
      "use: const raw = await FileAttachment(...).json(); return createTrendChart(raw);"
    );
    return Object.assign(document.createElement("div"), {
      textContent: "Chart failed to load: see console for details."
    });
  }
  if (typeof data[0].date !== "string") {
    console.error(
      "TP-V1.5 guard: date field is not a string. Got:", typeof data[0].date,
      data[0].date,
      "ensure JSON was exported with date formatted as YYYY-MM-DD string."
    );
    return Object.assign(document.createElement("div"), {
      textContent: "Chart failed to load: see console for details."
    });
  }


  // 1a Config
  // METRICS carries both total and per-kg column names, labels, units,
  // and formatters. pkg_fmt=null falls through to the suffix formatter.
  // EVENTS uses 2023 dates for dummy data prototype testing.

  const METRICS = {
    GHGE: {
      col       : "roll7_GHGE_SF",
      pkg_col   : "roll7_GHGE_perkg",
      label     : "GHGE Sales Footprint (kg CO₂-eq/day)",
      pkg_label : "GHGE per kg sold (kg CO₂-eq/kg)",
      short     : "GHGE SF",
      pkg_short : "GHGE per-kg",
      unit      : "kg CO₂-eq",
      pkg_unit  : "kg CO₂-eq/kg",
      colour    : "#2ca02c",
      fmt       : null,
      pkg_fmt   : d3.format(".2f")
    },
    LU: {
      col       : "roll7_LU_SF",
      pkg_col   : "roll7_LU_perkg",
      label     : "Land Use Sales Footprint (m²·yr/day)",
      pkg_label : "Land Use per kg sold (m²·yr/kg)",
      short     : "Land Use SF",
      pkg_short : "Land Use per kg",
      unit      : "m²·yr",
      pkg_unit  : "m²·yr/kg",
      colour    : "#ff7f0e",
      fmt       : null,
      pkg_fmt   : d3.format(".2f")
    },
    WU: {
      col       : "roll7_WU_SF",
      pkg_col   : "roll7_WU_perkg",
      label     : "Water Use Sales Footprint (L/day)",
      pkg_label : "Water Use per kg sold (L/kg)",
      short     : "Water Use SF",
      pkg_short : "Water Use per kg",
      unit      : "L",
      pkg_unit  : "L/kg",
      colour    : "#1f77b4",
      fmt       : null,
      pkg_fmt   : null
    },
    composite: {
      col       : "roll7_composite_norm",
      pkg_col   : "roll7_composite_intensity_norm",
      label     : "Composite Sales Footprint (scaled 0-1)",
      pkg_label : "Composite Score per-kg (scaled 0-1)",
      short     : "Composite SF",
      pkg_short : "Composite Score per-kg",
      unit      : "(0-1 scale)",
      pkg_unit  : "(0-1 scale)",
      colour    : "#444444",
      fmt       : d3.format(".3f"),
      pkg_fmt   : d3.format(".3f")
    },
  };

  const METRIC_OPTIONS = [
    { key: "GHGE",      display: "GHGE (Greenhouse Gas Emissions)" },
    { key: "LU",        display: "LU (Land Use)"                   },
    { key: "WU",        display: "WU (Water Use)"                  },
    { key: "composite", display: "Composite (Overall Impact)"      },
  ];

  const EVENTS = [
    { date: "2023-04-17", label: "Easter Sunday"      },
    { date: "2023-06-02", label: "Queen's Jubilee BH"         },
    // { date: "2023-08-29", label: "Summer BH"         },
    { date: "2023-09-18", label: "Queen's Funeral BH" },
    { date: "2023-10-31", label: "Halloween"           },
    { date: "2023-12-25", label: "Christmas Day"       }
  ];

  const PKG_PAD_FACTOR = 1;
  const PKG_MIN_RANGE = 1.5;

  let activeMKey = "GHGE";
  let activePkg  = false;
  
  let lastGlobalMetric  = "GHGE";


  // 1b Parse dates, build smoothed series
  // Null boundary rows (Jan 1-3, Dec 29-31) are excluded naturally.
  
  const parseDate = d3.timeParse("%Y-%m-%d");
  const fmtDate   = d3.timeFormat("%d %b %Y");
  const fmtInput  = d3.timeFormat("%Y-%m-%d");

  data.forEach(d => {
    const rawDate = String(d.date ?? "").trim();
    d.date = parseDate(rawDate);
  });

  data = data
    .filter(d => d.date instanceof Date && !isNaN(d.date))
    .sort((a, b) => a.date - b.date);

  const dateMin    = data[0].date;
  const dateMax    = data[data.length - 1].date;
  const dateMinStr = fmtInput(dateMin);
  const dateMaxStr = fmtInput(dateMax);

  function buildSmoothedFromCol(rows, col) {
    return rows
      .map(d => {
        const v = d[col];
        if (v === null || v === undefined || isNaN(v)) return null;
        return { date: d.date, value: v };
      })
      .filter(d => d !== null);
  }

  const smoothed = {
    composite : buildSmoothedFromCol(data, "roll7_composite_norm"),
    GHGE      : buildSmoothedFromCol(data, "roll7_GHGE_SF"),
    LU        : buildSmoothedFromCol(data, "roll7_LU_SF"),
    WU        : buildSmoothedFromCol(data, "roll7_WU_SF")
  };

  const smoothedPkg = {
    composite : buildSmoothedFromCol(data, "roll7_composite_intensity_norm"),
    GHGE      : buildSmoothedFromCol(data, "roll7_GHGE_perkg"),
    LU        : buildSmoothedFromCol(data, "roll7_LU_perkg"),
    WU        : buildSmoothedFromCol(data, "roll7_WU_perkg")
  };

  // Annual means: computed once from the full smoothed series.
  // Used in the tooltip to show how the hovered value compares to
  // the full-year average for the active metric and toggle state.
  const annualMeans = {
    composite : d3.mean(smoothed.composite,    d => d.value),
    GHGE      : d3.mean(smoothed.GHGE,         d => d.value),
    LU        : d3.mean(smoothed.LU,           d => d.value),
    WU        : d3.mean(smoothed.WU,           d => d.value)
  };

  const annualMeansPkg = {
    composite : d3.mean(smoothedPkg.composite, d => d.value),
    GHGE      : d3.mean(smoothedPkg.GHGE,      d => d.value),
    LU        : d3.mean(smoothedPkg.LU,        d => d.value),
    WU        : d3.mean(smoothedPkg.WU,        d => d.value)
  };

  const refLen = smoothed.GHGE.length;
  console.log("TP-V1.5 smoothed series (expected n=359 for all):");
  [
    ["composite",     smoothed.composite],
    ["GHGE",          smoothed.GHGE],
    ["LU",            smoothed.LU],
    ["WU",            smoothed.WU],
    ["composite_pkg", smoothedPkg.composite],
    ["GHGE_pkg",      smoothedPkg.GHGE],
    ["LU_pkg",        smoothedPkg.LU],
    ["WU_pkg",        smoothedPkg.WU]
  ].forEach(([k, s]) => {
    const flag = s.length === refLen ? "✓" : "← MISMATCH";
    console.log(
      `  ${k}: n=${s.length} ${flag}`,
      s.length
        ? `| ${fmtDate(s[0].date)} - ${fmtDate(s[s.length-1].date)}`
        : "EMPTY"
    );
  });


  // 1c Container, controls, SVG shell
  // Control row: metric dropdown | per-kg toggle | separator | From | To | reset.
  // Per-kg toggle is a segmented pill, preserved across metric and reset.

  const MARGIN     = { top: 62, right: 20, bottom: 48, left: 78 };
  const H          = 300;
  const W          = width - MARGIN.left - MARGIN.right; 
  const clipPathId = "tp-v15-clip";

  const container = d3.create("div")
    .style("font-family", "sans-serif")
    .style("position",    "relative");

  const ctrlRow = container.append("div")
    .style("display","flex").style("align-items","center")
    .style("gap","10px").style("flex-wrap","wrap")
    .style("margin-bottom","20px");

  // Metric dropdown
  // const metricDropdown = ctrlRow.append("select")
  //   .style("font-size","14px").style("padding","4px 8px")
  //   .style("border-radius","4px").style("border","1px solid #ccc")
  //   .style("background","white").style("cursor","pointer")
  //   .on("change", function() {
  //     activeMKey = d3.select(this).property("value");
  //     redraw();
  //   });

  const metricDropdown = ctrlRow.append("select")
  .style("font-size","12px").style("padding","4px 8px")
  .style("border-radius","4px").style("border","1px solid #ccc")
  .style("background","white").style("cursor","pointer")
  .on("change", function() {
    // Always record the incoming global metric so unchecking the
    // override restores to the correct value without another push.
    lastGlobalMetric = d3.select(this).property("value");
    // If override is active, swallow the redraw -- composite stays displayed.
    // activeMKey is not updated so the override remains clean.
    if (compositeOverride.property("checked")) return;
    activeMKey = lastGlobalMetric;
    redraw();
  });

  METRIC_OPTIONS.forEach(({ key, display }) => {
    metricDropdown.append("option")
      .attr("value",key).property("selected", key === activeMKey)
      .text(display);
  });

  // Composite override: when checked, the trend chart ignores the global
  // metric selection and shows composite regardless. Unchecking restores
  // the last metric pushed by the global dropdown via lastGlobalMetric.
  // Default is unchecked so the global metric drives the chart on load.
  const overrideWrap = ctrlRow.append("label")
    .style("display","flex").style("align-items","center")
    .style("gap","5px").style("cursor","pointer")
    .style("font-size","12px").style("color","#666")
    .style("user-select","none");

  const compositeOverride = overrideWrap.append("input")
    .attr("type","checkbox")
    .style("cursor","pointer")
    .style("margin","0");

  overrideWrap.append("span").text("Composite");

  compositeOverride.on("change", function() {
    if (this.checked) {
      // Force composite display regardless of global metric
      activeMKey = "composite";
    } else {
      // Restore to whatever the global dropdown last sent
      activeMKey = lastGlobalMetric;
      // Sync the hidden internal select so pushMetric reads correctly
      metricDropdown.property("value", activeMKey);
    }
    redraw();
  });

  // Per-kg pill
  const pkgPill = ctrlRow.append("div")
    .style("display","flex")
    .style("border","1px solid #ccc").style("border-radius","4px")
    .style("overflow","visible");

  const btnTotal = pkgPill.append("button")
    .text("Total SF")
    .style("font-size","14px").style("padding","4px 10px")
    .style("border","none").style("cursor","pointer")
    .style("transition","background 0.15s, color 0.15s");

  const btnPkg = pkgPill.append("button")
    .text("Per kg")
    .style("font-size","14px").style("padding","4px 10px")
    .style("border","none").style("border-left","1px solid #ccc")
    .style("cursor","pointer")
    .style("transition","background 0.15s, color 0.15s");

  function syncPkgToggle() {
    btnTotal
      .style("background", !activePkg ? "#555" : "#fff")
      .style("color",      !activePkg ? "#fff" : "#555");
    btnPkg
      .style("background",  activePkg ? "#555" : "#fff")
      .style("color",       activePkg ? "#fff" : "#555");
  }

  btnTotal.on("click", function() {
    if (activePkg) { activePkg = false; syncPkgToggle(); redraw(); }
  });
  btnPkg.on("click", function() {
    if (!activePkg) { activePkg = true; syncPkgToggle(); redraw(); }
  });

  syncPkgToggle();

  ctrlRow.append("div")
    .style("width","1px").style("height","18px")
    .style("background","#ddd").style("margin","0 2px");

  ctrlRow.append("span")
    .style("font-size","14px").style("color","#666").text("From:");

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

  ctrlRow.append("span")
    .style("font-size","14px").style("color","#666").text("To:");

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

  // Reset: dates only. activeMKey and activePkg are preserved.
  const resetBtn = ctrlRow.append("button")
    .text("Reset")
    .style("font-size","14px").style("padding","4px 10px")
    .style("border-radius","4px").style("border","1px solid #bbb")
    .style("background","#fff").style("color","#555").style("cursor","pointer")
    .on("click", function() {
      startPicker.property("value", dateMinStr);
      endPicker.property("value",   dateMaxStr);
      redraw();
    });

  function syncResetButton() {
    const atFull = startPicker.property("value") === dateMinStr &&
                   endPicker.property("value")   === dateMaxStr;
    resetBtn
      .attr("disabled",        atFull ? true          : null)
      .style("opacity",        atFull ? "0.35"        : "1")
      .style("cursor",         atFull ? "not-allowed" : "pointer")
      .style("pointer-events", atFull ? "none"        : "auto");
  }

  const titleDiv = container.append("div")
    .style("font-size","16px").style("font-weight","600")
    .style("margin-bottom","4px");

  const subtitleDiv = container.append("div")
    .style("font-size","13px").style("color","#999")
    .style("margin-bottom","10px");

  const svg = container.append("svg")
    .attr("width",  width)
    .attr("height", H + MARGIN.top + MARGIN.bottom)
    .style("overflow","visible");

  svg.append("defs")
    .append("clipPath").attr("id", clipPathId)
    .append("rect")
      .attr("x",0).attr("y",0)
      .attr("width",W).attr("height",H);

  const g = svg.append("g")
    .attr("transform",`translate(${MARGIN.left},${MARGIN.top + 20})`); // + 100 MARGIN.left to shift

  const gridGroup      = g.append("g").attr("class","grid");
  const hoverLineGroup = g.append("g").attr("class","hover-line");
  const lineGroup      = g.append("g").attr("class","line")
    .attr("clip-path",`url(#${clipPathId})`);
  const xAxisGroup     = g.append("g").attr("class","x-axis")
    .attr("transform",`translate(0,${H})`);
  const yAxisGroup     = g.append("g").attr("class","y-axis");
  const eventGroup     = g.append("g").attr("class","events")
    .style("overflow","hidden");

  const yLabelText = g.append("text")
    .attr("transform",  "rotate(-90)")
    .attr("x",         -H / 2)
    .attr("y",         -62)
    .attr("text-anchor","middle")
    .style("font-size", "11px")
    .style("fill",      "#555");

  const tooltip = container.append("div")
    .style("position","absolute").style("pointer-events","none")
    .style("background","rgba(255,255,255,0.97)")
    .style("border","1px solid #ccc").style("border-radius","6px")
    .style("padding","8px 12px").style("font-size","15px")
    .style("line-height","1.7")
    .style("box-shadow","0 2px 8px rgba(0,0,0,0.12)")
    .style("display","none").style("max-width","220px").style("z-index","10");

  const hoverLine = hoverLineGroup.append("line")
    .attr("y1",0).attr("y2",H)
    .attr("stroke-width",1).attr("stroke-dasharray","3,3")
    .style("display","none");

  const overlay = g.append("rect")
    .attr("width",W).attr("height",H)
    .attr("fill","none").style("pointer-events","all");


  // 1d) yFormatter (metric-aware and pkg-aware)
  // Resolves to cfg.pkg_fmt when activePkg is true, cfg.fmt otherwise.
  // null falls through to the K/M/B suffix formatter.

  function yFormatter(v, cfg) {
    const fmtFn = activePkg ? cfg.pkg_fmt : cfg.fmt;
    if (fmtFn) return fmtFn(v);
    if (Math.abs(v) >= 1e9) return d3.format(".3s")(v).replace("G","B");
    if (Math.abs(v) >= 1e6) return d3.format(".3s")(v);
    if (Math.abs(v) >= 1e3) return d3.format(".3s")(v);
    return d3.format(",.0f")(v);
  }


  // 1e redraw: xScale, axes, event markers, trend line, tooltip.
  // activePkg selects between smoothed and smoothedPkg series.
  // All labels, units, and formatters update consistently on every call.

  let isFirstRender = true;

  function redraw() {

    const cfg = METRICS[activeMKey];

    const activeSeries = activePkg ? smoothedPkg : smoothed;
    const activeLabel  = activePkg ? cfg.pkg_label : cfg.label;
    const activeShort  = activePkg ? cfg.pkg_short : cfg.short;
    const activeUnit   = activePkg ? cfg.pkg_unit  : cfg.unit;

    const dFrom = new Date(startPicker.property("value") + "T00:00:00");
    const dTo   = new Date(endPicker.property("value")   + "T00:00:00");

    const plotData = activeSeries[activeMKey].filter(
      d => d.date >= dFrom && d.date <= dTo
    );

    if (plotData.length < 2) return;

    const xScale = d3.scaleTime()
      .domain([dFrom, dTo])
      .range([0, W]);

    const yExtent   = d3.extent(plotData, d => d.value);
    const padFactor = activePkg ? PKG_PAD_FACTOR : 0.08;

    // Enforce minimum visible range for per-kg views where variation is small.
    // If the natural data range is narrower than PKG_MIN_RANGE, expand it
    // symmetrically around the midpoint before applying padding.
    let [yLow, yHigh] = yExtent;
    if (activePkg && PKG_MIN_RANGE > 0) {
      const span = yHigh - yLow;
      if (span < PKG_MIN_RANGE) {
        const mid  = (yLow + yHigh) / 2;
        yLow  = mid - PKG_MIN_RANGE / 2;
        yHigh = mid + PKG_MIN_RANGE / 2;
      }
    }

    const yPad = (yHigh - yLow) * padFactor;
    const yMin = activeMKey === "composite" ? 0 : yLow - yPad;
    const yMax = activeMKey === "composite" ? 1 : yHigh + yPad;
    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([H, 0]);

    // x-axis.
    // Regular ticks: 1st of each month from the first full month onwards.
    // d3.timeMonth.ceil(Jan 04) = Feb 01, so January would have no tick.
    // When dFrom falls mid-January, add dFrom itself as the first tick so
    // "Jan 2023" appears at x=0 regardless of the 3-day boundary offset.
    // For all other start months the regular tick at the 1st covers it.
    const regularTicks = d3.timeMonth.range(d3.timeMonth.ceil(dFrom), dTo);
    const allTicks = (dFrom.getMonth() === 0 && dFrom.getDate() > 1)
      ? [dFrom, ...regularTicks]
      : regularTicks;

    xAxisGroup.call(
      d3.axisBottom(xScale)
        .tickValues(allTicks)
        .tickFormat(d3.timeFormat("%b %Y"))
    )
      .call(g2 => g2.select(".domain").remove())
      .call(g2 => g2.selectAll("line").remove())
      .selectAll("text")
        .style("font-size","13px").style("fill","#666")
        .attr("dy","1.2em");

    // y-axis.
    yAxisGroup.selectAll("*").remove();
    yAxisGroup.call(
      d3.axisLeft(yScale).ticks(5)
        .tickFormat(v => yFormatter(v, cfg))
    )
      .call(g2 => g2.select(".domain").remove())
      .call(g2 => g2.selectAll("line").remove())
      .selectAll("text")
        .style("font-size","13px").style("fill","#666");

    yLabelText.text(activeLabel);

    // Horizontal gridlines.
    gridGroup.selectAll("line.ygrid").remove();
    gridGroup.selectAll("line.ygrid")
      .data(yScale.ticks(5)).join("line")
        .attr("class","ygrid")
        .attr("x1",0).attr("x2",W)
        .attr("y1",d => yScale(d)).attr("y2",d => yScale(d))
        .attr("stroke","#ebebeb").attr("stroke-width",1);

    // Month boundary gridlines.
    gridGroup.selectAll("line.mgrid").remove();
    gridGroup.selectAll("line.mgrid")
      .data(d3.timeMonth.range(
        d3.timeMonth.floor(dFrom),
        d3.timeMonth.ceil(dTo)
      )).join("line")
        .attr("class","mgrid")
        .attr("x1",d => xScale(d)).attr("x2",d => xScale(d))
        .attr("y1",0).attr("y2",H)
        .attr("stroke","#f4f4f4").attr("stroke-width",1);

    // Event markers
    eventGroup.selectAll("*").remove();
    const [xDomMin, xDomMax] = xScale.domain();

    EVENTS.forEach(evt => {
      const evtDate = parseDate(evt.date);
      if (!evtDate || evtDate < xDomMin || evtDate > xDomMax) return;
      const ex = xScale(evtDate);
      eventGroup.append("line")
        .attr("x1",ex).attr("x2",ex)
        .attr("y1",-16).attr("y2",H)
        .attr("stroke","#bbbbbb").attr("stroke-width",1)
        .attr("stroke-dasharray","4,3");
      eventGroup.append("text")
        .attr("transform",`translate(${ex + 3}, -16) rotate(-90)`)
        .attr("text-anchor","start")
        .style("font-size","11px").style("fill","#aaaaaa")
        .text(evt.label);
    });

    // Trend line
    const lineGen = d3.line()
      .defined(d => d.value !== null && !isNaN(d.value))
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const pathSel   = lineGroup.selectAll("path.trend-line").data([plotData]);
    const pathEnter = pathSel.enter().append("path")
      .attr("class","trend-line")
      .attr("fill","none")
      .attr("stroke-width",2.0)
      .attr("stroke-linecap","round");
    const pathMerge = pathEnter.merge(pathSel)
      .attr("stroke", cfg.colour);

    if (isFirstRender) {
      // Draw-on animation plays once on initial load.
      pathMerge.attr("d", lineGen);
      const totalLen = pathMerge.node().getTotalLength();
      pathMerge
        .attr("stroke-dasharray",  `${totalLen} ${totalLen}`)
        .attr("stroke-dashoffset", totalLen)
        .transition().duration(1000).ease(d3.easePolyInOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function() {
          d3.select(this)
            .attr("stroke-dasharray",  null)
            .attr("stroke-dashoffset", null);
        });
      isFirstRender = false;
    } else {
      // Clear dasharray and dashoffset before transitioning.
      pathMerge
        .attr("stroke-dasharray",  null)
        .attr("stroke-dashoffset", null)
        .transition().duration(350)
        .attr("stroke", cfg.colour)
        .attr("d",      lineGen);
    }

    hoverLine.attr("stroke", cfg.colour).attr("opacity", 0.25);
    
//////////////// check redraw logic for fixing post-reset transition

    // 1f Tooltip and hover line

    const bisect = d3.bisector(d => d.date).left;

    overlay
      .on("mousemove", function(event) {
        const [mx] = d3.pointer(event, this);
        const x0   = xScale.invert(mx);
        const idx  = bisect(plotData, x0, 1);
        const a    = plotData[idx - 1];
        const b    = plotData[idx] || a;
        const pt   = x0 - a.date > b.date - x0 ? b : a;

        if (Math.abs(xScale(pt.date) - mx) > 36) {
          tooltip.style("display","none");
          hoverLine.style("display","none");
          return;
        }

        const px = xScale(pt.date);
        hoverLine.style("display",null).attr("x1",px).attr("x2",px);

        const annualMean = activePkg
          ? annualMeansPkg[activeMKey]
          : annualMeans[activeMKey];
        const pctDiff    = ((pt.value - annualMean) / annualMean) * 100;
        const pctColour  = pctDiff >= 0 ? "#d62728" : "#2ca02c";
        const pctLabel   = (pctDiff >= 0 ? "+" : "") + d3.format(".1f")(pctDiff) + "%";

        tooltip.style("display",null).html(
          `<div style="font-weight:600;color:${cfg.colour};margin-bottom:3px">
             ${activeShort}
           </div>
           <div><b>Date:</b> ${fmtDate(pt.date)}</div>
           <div><b>Value:</b> ${yFormatter(pt.value, cfg)} ${activeUnit}</div>
           <div><b>Annual mean:</b>
            ${yFormatter(annualMean, cfg)} ${activeUnit}</div>
           <div><b>vs annual mean:</b>
             <span style="color:${pctColour}">${pctLabel}</span>
           </div>
           <div style="font-size:11px;color:#aaa;margin-top:3px">
             7-day rolling mean
           </div>`
        );

        const cRect = container.node().getBoundingClientRect();
        const tipW  = 220;
        const left  = event.clientX - cRect.left + 14;
        const top   = event.clientY - cRect.top  - 10;
        tooltip
          .style("left",(left + tipW > cRect.width ? left-tipW-24 : left)+"px")
          .style("top",  top+"px");
      })
      .on("mouseleave", function() {
        tooltip.style("display","none");
        hoverLine.style("display","none");
      });

    titleDiv.style("color", cfg.colour).text(activeLabel);
    subtitleDiv.text(
      `7-day rolling mean · ${activePkg ? "Per kg" : "Total SF"} · Daily view`
    );

    syncResetButton();
  }

  redraw();
  return container.node();
}