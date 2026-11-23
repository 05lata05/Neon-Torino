# Data credits and licences

| Data | Source | Licence | Where it is used |
|---|---|---|---|
| Roads, buildings, areas, trams, stops, shops, trees, landmarks | © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | [ODbL](https://opendatacommons.org/licenses/odbl/) | `tools/fetch_osm.py`, `tools/build_map.py` → `data/torino.json` |
| Building heights (real eaves height within the City of Turin) | Arpa Piemonte - Geoportale, "Edifici 3D 2017" | [CC BY 2.5 Italia](http://webgis.arpa.piemonte.it/w-metadoc/_Licenze/Licenza_map_service.pdf) | `tools/fetch_heights.py` → number of levels in `data/torino.json` |

`data/torino.json` is a derivative work of this data: it stays under ODbL and the Arpa Piemonte attribution must be shown.
In the game the attribution appears on the title screen and in the HUD.

When a source is added (textures, 3D models, terrain models), add a row here.
