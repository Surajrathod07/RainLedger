# Rainwater Harvesting Potential Calculator
## Presentation analysis and feature mapping
The source is the 12 numbered slides in Rainwater_Harvesting_MSE_12_Slides.pdf. A separate unnumbered page links the video submission.

|Slide|Project content|Application implementation|
|---|---|---|
|1 · Title|EVS Web Application + GIS, MIT Academy of Engineering, Alandi, Pune, 2026–27.|About page credits the original project and team.|
|2 · Introduction|Urban runoff and freshwater stress motivate a household-scale estimate. A millimetre on 100 m² equals 100 L before losses.|Location-specific assessment, unit conversion, non-potable demand.|
|3 · Objectives|Combine rainfall and catchment data, compute yield, map the site, communicate suitability and tank size.|GIS selection, roof dimensions, monthly engine, coverage indicator and tank comparisons.|
|4 · Literature review|Tucson irrigation, Qatar suitability, global reviews, Ethiopian site ranking and the Bhopal rooftop mapping tool illustrate different scales and methods.|Use the property as the unit of analysis. Results from the cited regions are not model coefficients.|
|5 · Research gap|Individual households need an accessible alternative to specialist desktop GIS workflows.|Browser-local assessment, editable data, reproducible exports.|
|6 · Methodology|Problem → literature → data → analysis → model → results → validation → recommendations. Formula is rainfall × area × runoff. Soil is mentioned in data collection.|Add a separate post-runoff collection efficiency. Soil is outside the rooftop-tank model; the app does not estimate aquifer recharge.|
|7 · Expected outcomes|800 mm × 100 m² × 0.8 = 64,000 L = 64 m³, about 175 L/day.|Reference calculation tested at 100% collection efficiency. Show monthly and annual volumes separately from delivered water.|
|8 · Discussion|Planning for non-drinking uses; uncertainty in rainfall and fixed runoff factors.|Editable surface factors, local rainfall provenance, tank and demand assumptions.|
|9 · Conclusion|Make local harvesting estimates accessible to households, schools and housing societies.|One workflow across five property types, GIS and reports.|
|10 · Future scope|Weather APIs, surface/slope adjustment, wider coverage, ML, LiDAR, water quality and costs.|Historical climate retrieval and editable material coefficients implemented. No automated roof extraction, water-quality or cost claims.|
|11 · References|Ten bibliography entries cover prior studies and GIS models.|Treat these as academic background; the weather provider and model assumptions are documented separately.|
|12 · Closing|Original project team and invitation to discuss.|Original project attribution in About. CSV/PDF support classroom discussion.|
