# Crediti e licenze dei dati

| Dato | Fonte | Licenza | Dove si usa |
|---|---|---|---|
| Strade, edifici, aree, tram, fermate, negozi, alberi, landmark | © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | [ODbL](https://opendatacommons.org/licenses/odbl/) | `tools/fetch_osm.py`, `tools/build_map.py` → `data/torino.json` |
| Altezze degli edifici (quota di gronda reale per il Comune di Torino) | Arpa Piemonte - Geoportale, "Edifici 3D 2017" | [CC BY 2.5 Italia](http://webgis.arpa.piemonte.it/w-metadoc/_Licenze/Licenza_map_service.pdf) | `tools/fetch_heights.py` → numero di piani in `data/torino.json` |

`data/torino.json` è un'opera derivata da questi dati: resta sotto ODbL e va citata l'attribuzione di Arpa Piemonte.
Nel gioco l'attribuzione compare nella schermata iniziale e nell'HUD.

Quando si aggiunge una fonte (texture, modelli 3D, modelli del terreno), va aggiunta una riga qui.
