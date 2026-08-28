# FIO Food Dashboard

An interactive web dashboard for exploring the seasonal environmental
impact of food and drink purchasing in the UK. Built with D3.js and
served locally via Python's built-in HTTP server (Prototype Phase)

Developed by the [Healthy and Sustainable Places (HASP) Data Service](https://hasp.ac.uk)
as part of the FIO Food project at the University of Leeds.

---

## Overview

The FIO Food Dashboard lets researchers explore how the environmental footprint of food purchasing changes across a calendar year, broken down by environmental metric and food category. It is built on anonymised daily loyalty card transaction data from a major UK grocery retailer covering Yorkshire and Humber in 2022.

| Chart | Description |
|---|---|
| **Timeline** | Smoothed daily trend for one environmental metric across the selected date range. Entry point for identifying periods of elevated footprint. |
| **Heatmap** | LCFS food categories × daily or weekly columns. Cell colour shows each category's footprint relative to its own annual typical level. |

Both charts share a global metric selector, date range pickers, and a Total SF / Per kg toggle. Changing any of these controls updates both charts simultaneously.

```
> Prototype status: All patterns shown use dummy data generated
> outside the Trusted Research Environment (TRE). Real 2022 retailer
> data will be connected following VRE validation and approval.
```

---

## Project Structure

```
fio_dashboard/
├── index.html                  # Dashboard shell: layout, script loading
├── serve.py                    # Local HTTP server (one command to run)
│
├── css/
│   └── dashboard.css           # Layout grid, sidebar, accordion, chart cards
│
├── js/
│   ├── trend_chart.js          # createTrendChart(): D3 timeline chart function
│   ├── heatmap.js              # createHeatmap(): D3 heatmap chart function
│   └── dashboard.js            # Data loading, chart init, global controls wiring
│
├── data/
│   ├── L1_rolling.json         # Daily smoothed trend values (365 rows)
│   ├── L2a_daily.json          # Daily smoothed category-level values (23,725 rows)
│   └── L2a_weekly.json         # Weekly aggregated category-level values (3,380 rows)
│
├── notebooks/
│   ├── book_01.ipynb # Generates L1_rolling.json from dummy data (Timeline)
│   └── book_02.ipynb # Generates L2a_daily.json and L2a_weekly.json (Heatmap)
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.8 or later (no additional packages required: uses built-in `http.server`)
- A modern browser (Chrome, Firefox, or Safari) and Internet connection on first load (D3.js loaded from CDN)

### Running locally

```bash
git clone <repo-url>
cd fio_dashboard
python serve.py
```

The dashboard opens automatically at `http://localhost:8000`.

> `serve.py` must be run from the `fio_dashboard/` root directory.
> Opening `index.html` directly in a browser will not work: the browser
> blocks `fetch()` calls to local files due to same-origin policy.

### Regenerating data

If you need to rebuild the JSON data files from scratch:

```bash
python notebooks/book_01.ipynb
python notebooks/book_02.ipynb
```

Both scripts write their output files directly to `data/`. Refresh the browser after regeneration.

---

## Environmental Metrics

All three metrics are derived from per-product environmental intensity estimates sourced from Poore and Nemecek (2018), scaled by the total weight of products sold each day.

| Metric | Description | Unit (Total SF) | Unit (Per kg) |
|---|---|---|---|
| GHGE | Greenhouse Gas Emissions | kg CO₂-eq / day | kg CO₂-eq / kg |
| LU | Land Use | m²·yr / day | m²·yr / kg |
| WU | Water Use | L / day | L / kg |
| Composite | Normalised average of all three | 0-1 scale | 0-1 intensity scale |

### Total SF vs Per kg

**Total SF** (Sales Footprint) combines purchasing volume and basket composition. It reflects both what was bought and how much of it was sold.

**Per kg** strips out volume. It shows the average environmental intensity per kilogram sold: a measure of basket composition independent of quantity. If Total SF is elevated but Per kg is not, the period was driven by volume. If both are elevated, composition also shifted toward higher-impact products.

---

## Data Files

### L1_rolling.json

Daily smoothed values for the full year at basket level. One row per calendar day, 365 rows total.

| Column | Description |
|---|---|
| `date` | Calendar date string (YYYY-MM-DD) |
| `roll7_GHGE_SF` | 7-day rolling mean total GHGE sales footprint |
| `roll7_LU_SF` | 7-day rolling mean total Land Use sales footprint |
| `roll7_WU_SF` | 7-day rolling mean total Water Use sales footprint |
| `roll7_composite_norm` | 7-day rolling mean normalised composite (0–1) |
| `roll7_GHGE_perkg` | 7-day rolling mean GHGE per kg sold |
| `roll7_LU_perkg` | 7-day rolling mean Land Use per kg sold |
| `roll7_WU_perkg` | 7-day rolling mean Water Use per kg sold |
| `roll7_composite_intensity_norm` | 7-day rolling mean composite intensity (0–1) |

Boundary rows (Jan 1–3 and Dec 29–31) contain `null` for all rolling columns because of incomplete 7-day window. The timeline chart skips null rows when building the plotted series.

### L2a_daily.json

Daily smoothed values disaggregated to 65 LCFS food categories. One row per date per category, 23,725 rows total (365 × 65).

Key columns alongside `date` and `lcfs_cat`:

| Column pattern | Description |
|---|---|
| `roll7_{M}_SF` | 7-day rolling mean total SF per category (M = GHGE, LU, WU) |
| `roll7_{M}_perkg` | 7-day rolling mean per-kg intensity per category |
| `{M}_rank_on_day` | Daily rank of category among all 65 by total SF |
| `{M}_annual_mean` | Annual mean of smoothed SF for the category |
| `{M}_annual_share` | Category fraction of grand total annual SF (%) |
| `{M}_annual_min / max` | Smoothed SF range across the year per category |
| `{M}_annual_rank` | Rank by annual mean SF (1 = highest) |
| `{M}_pct_from_annual_mean` | % deviation of smoothed daily SF from annual mean |
| `{M}_perkg_annual_mean` | Annual mean of smoothed per-kg values |
| `{M}_perkg_max_abs_dev` | Diverging scale half-width for per-kg colour domain |
| `{M}_perkg_annual_rank` | Rank by annual mean per-kg (1 = highest) |
| `{M}_perkg_pct_from_annual_mean` | % deviation of per-kg value from per-kg annual mean |

### L2a_weekly.json

Weekly aggregated values for 65 categories. One row per 7-day bin per category, 3,380 rows total (52 weeks × 65).

Week bins are Jan-01 anchored: not ISO Monday anchored.
Week 1 covers Jan-01 to Jan-07, Week 2 covers Jan-08 to Jan-14, and so on. The `week_start` field holds the first date of each bin.

Additional columns beyond the daily set:

| Column | Description |
|---|---|
| `week_start` | First date of the 7-day bin (YYYY-MM-DD) |
| `calendar_month` | 0-based month index of the bin's majority month |
| `{M}_weekly_mean` | Mean of daily smoothed SF values within the bin |
| `{M}_perkg_weekly_mean` | Mean of daily smoothed per-kg values within the bin |
| `{M}_weekly_rank` | Category rank by weekly mean among all 65 |

---

## Chart Architecture

Both chart functions are standard D3 v7. They have no Observable or framework dependencies and return a plain DOM node via
`container.node()`.

### createTrendChart(data, { width })

Located in `js/trend_chart.js`. Receives the L1_rolling.json array and a pixel width.

**Internal state variables:**

| Variable | Type | Description |
|---|---|---|
| `activeMKey` | string | Active metric key: `"composite"`, `"GHGE"`, `"LU"`, `"WU"` |
| `activePkg` | boolean | `false` = Total SF view, `true` = Per kg view |
| `lastGlobalMetric` | string | Last metric pushed by global dropdown: used to restore after composite override |

**Redraw trigger chain:**

```
User interaction (control change)
 |
D3 .on("change") or .on("click") handler on the control element
 |
State variable updated (activeMKey / activePkg / date range)
 |
redraw() called
 |
plotData filtered from pre-built smoothed[] or smoothedPkg[] arrays
 |
xScale and yScale recomputed from plotData extent
 |
Axes, gridlines, event markers, trend line re-rendered
 |
Tooltip and hover line re-attached to overlay rect
```

### createHeatmap(dailyData, weeklyData, { width, onStats })

Located in `js/heatmap.js`. Receives both L2a JSON arrays, a pixel width, and an optional `onStats` callback.

**Internal state variables:**

| Variable | Type | Description |
|---|---|---|
| `activeMetric` | string | Active metric key: `"GHGE"`, `"LU"`, `"WU"` |
| `activePkg` | boolean | `false` = Total SF, `true` = Per kg |
| `activeView` | string | `"weekly"` or `"daily"` |
| `activeN` | number | Number of category rows displayed (10, 30, or 65) |

**Redraw trigger chain:**

```
User interaction (control change)
 |
D3 .on("change") or .on("click") handler
 |
State variable updated
 |
redraw() called
 |
Active column names resolved from activeMetric + activePkg
 |
sortedCats ordered by pre-computed annual rank (no d3.rollup)
 |
displayDates and displayValues built from dailyMap or weeklyMap
 |
chart_H computed from activeN (MIN_CHART_H to MAX_CHART_H range)
 |
rowScales built (sequential for Total SF, diverging for Per kg)
 |
Cells, labels, rank axis, event markers, legend re-rendered
 |
onStats(periodSFTotal, periodPkgAvg, cfg) fired if provided
```

**onStats callback:**

```javascript
createHeatmap(dailyData, weeklyData, {
  width,
  onStats: (periodSFTotal, periodPkgAvg, cfg) => {
    // cfg.unit and cfg.pkg_unit carry the active metric units
    // Called after every redraw: use to display reference values
    // outside the chart SVG (sidebar)
  }
});
```

### Global controls wiring (dashboard.js)

The global metric dropdown (`#global-metric-select`) drives both charts by setting the value on each chart's hidden internal metric select element and dispatching a synthetic `change` event. This fires each chart's existing D3 handler without modifying the chart functions.

```
#global-metric-select change
        |
pushMetric(internalSelect, value)
        |
internalSelect.value = value
dispatchEvent(new Event("change"))
        |
D3 handler fires → state update → redraw()
```

---

## LCFS Food Categories

The dashboard uses 65 food categories following the ONS Living Costs and Food Survey (LCFS) classification. The full category list is available in `notebooks/book_02.ipynb` under the `LCFS_CATS` constant.

---


## Further Reading

For full technical detail on metrics, controls, chart behaviour, and data pipeline decisions see the **Technical Document** (to be included in this repository).

For a non-technical introduction to the dashboard see the **Quick Start Guide** (to be included in this repository).