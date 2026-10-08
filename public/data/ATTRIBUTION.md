# Historical map attribution and limitations

Political outlines: Historical Basemaps, André Ourednik and contributors, `geojson/world_1914.geojson`.
Source: https://github.com/aourednik/historical-basemaps
Downloaded 8 October 2026. The source repository ships the GNU GPL version 3 license; this project retains that license and distributes the original and derived geometry with attribution. No claim of a different Creative Commons license is made.

The dataset is a generalized reconstruction labeled 1914, not a surveyed map guaranteed to January 1. It contains anomalies: separately labeled Georgia, Armenia and Azerbaijan are assigned to the Russian Empire here because those areas were under Russian imperial rule in January 1914. The outline geometry is retained. Source for imperial Caucasus context: https://www.britannica.com/place/Transcaucasia/History-of-Transcaucasia . St Petersburg's historical January name is retained (renamed Petrograd in August 1914). Finland and Congress Poland remain Russian imperial possessions; Ireland remains part of the United Kingdom.

Playable scope is clipped to 12°W–46°E, 35°N–71°N. Non-European colonies and the eastern Russian Empire are excluded. Small disputed areas, islands, border precision and source errors remain limitations. Country populations, regional population allocations, army sizes and victory points are gameplay estimates inspired by the period, not a historical census or order of battle.

Strategic regions are city-centered Voronoi catchments clipped inside historical national outlines. **Their internal boundaries are abstract gameplay divisions, not historical province borders.** Land routes are a simplified strategic adjacency graph; sea routes are explicitly separate abstract transport routes and allow only friendly movement. No naval invasions or naval combat are implemented. Region geometry can differ from the route graph at fine border scales. Ownership transfers recolor these regions rather than pretending they are authentic historical administrative units.

Derived geometry: `europe-regions.geojson`. Rebuild with `npm run map:build`; the full transformation source is `scripts/build-map.mjs`. The original upstream geometry, README and GPL license are bundled alongside it. Project code is also released under GPL-3.0-or-later to preserve a consistent redistribution license.

The upstream feature labeled `Finland` is explicitly merged into Russian imperial geography. Omitting that separate feature previously left a false water gap around Helsinki; the derived map now includes its mainland outline.
