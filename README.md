# RainLedger
Rainwater Harvesting Potential Calculator • EVS Web Application + GIS

## Run on Windows
Extract the ZIP and open PowerShell in the folder containing this README:
```powershell
py -m http.server 8000 --bind 127.0.0.1 --directory dist
```
Open http://localhost:8000 in your browser. Keep PowerShell open while using the site. If your Python launcher is called python, substitute python for py. On macOS or Linux, use python3. No npm installation, account or private API key is needed.

## Assessment
Dashboard shows an illustrative residential profile. Open Calculator to start a property assessment. Pick a district or pin; the location step retrieves climate data and identifies its period. Review the source before leaving the step. Set dimensions or trace an outline, choose roof and loss parameters, then review the monthly rainfall and select View results. Enable Advanced Assessment on the Rainfall step to include tank and demand inputs. Results show rooftop yield first. Expand Advanced Assessment to explore the water balance, sizing and scenarios. PDF and CSV exports follow the selected assessment mode. Data stays in this browser. PDF and CSV downloads work without a cloud service.

The GIS page also accepts coordinates, a dragged marker or device location (permission required). Mapping, place search and new weather retrieval require network connectivity. District outlines, nine selected reference-point climate records, charts and reports are bundled. District names follow a 2019 snapshot. The off-network district basemap has no street-level imagery. Default effective rainfall of 70% and material coefficients are editable planning assumptions.

## Project files
- PROJECT.md maps each presentation slide to its implementation.
- src/engine.ts defines inputs, validation, yield, monthly tank balance and scenarios.
- dist contains the ready-to-run site. The ES modules separate pages, reports, graphics, geographic operations and historical data.
- dist/gis/credits.txt documents data sources and geographic vintage.
- tests contains engine and climate-data regression tests.
- build.mjs regenerates the engine module and route entry pages with Node 24.
- Run node build.mjs after changing the TypeScript model or main HTML. Run node --test tests/*.test.js (or npm test) for regression checks.

## Interpreting output
Annual harvest is collected inflow before tank limits. Supplied water can include initial stock. All demand is pooled. The monthly simulation meets demand before capping storage; it can overestimate intramonth availability. Utilization is mean month-end fullness. A tank comparison checks half, selected and double capacity. The reported size is the smallest tested option delivering at least 95% of the best tested annual supply. This screening rule is not a construction specification. Scenario rank uses round((n−1) × percentile), with zero-based indexing. Manual rainfall edits change the assessment baseline; historic-year comparisons retain their recorded inputs. Irrigation entered in litres stays fixed across scenarios.

## Vercel
Use the directory containing package.json as the project root and Node.js 24.x. The included vercel.json runs node build.mjs and serves dist. Each page has a static route entry.
"# RainLedger" 
