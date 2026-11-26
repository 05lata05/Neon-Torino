// Gameplay geometry from the same decoded roads and ground-plane projection as the GLB.
// No invented lane counts, turn restrictions or stops.
export function buildGameplayData(data, roads, origin, toLocal) {
  const nodes = [];
  const nodeIds = new Map();
  const streets = [];
  const edges = [];

  function nodeAt(point) {
    const key = point.join(',');
    if (!nodeIds.has(key)) {
      nodeIds.set(key, nodes.length);
      nodes.push(toLocal(point));
    }
    return nodeIds.get(key);
  }

  for (const road of roads) {
    if (road.cls === 'X') continue; // pedestrian ways, as in the browser vehicle graph
    const street = streets.length;
    streets.push({
      class: road.cls,
      name: road.name,
      lanes: road.lanes || null,
      oneway: road.oneway,
      maxSpeedKmh: road.maxSpeedKmh ?? null,
    });
    let from = nodeAt(road.pts[0]);
    for (const point of road.pts.slice(1)) {
      const to = nodeAt(point);
      if (from !== to) {
        if (road.oneway !== -1) edges.push([from, to, street]);
        if (road.oneway !== 1) edges.push([to, from, street]);
      }
      from = to;
    }
  }

  const stops = rows => rows.map(([x, y, name]) => ({ name, position: toLocal([x, y]) }));
  const furniture = (rows = []) => rows.map(([osmNodeId, x, y]) => ({ osmNodeId, position: toLocal([x, y]) }));
  return {
    version: 1,
    coordinates: { units: 'metres', axes: ['east', 'south'], originMapMetres: origin },
    attribution: '© OpenStreetMap contributors (ODbL)',
    roadGraph: { nodes, streets, edges },
    tramTracks: data.TW.map(points => points.map(toLocal)),
    tramLines: data.TR.map(([line, points]) => ({ line, points: points.map(toLocal) })),
    tramStops: stops(data.TS),
    busStops: stops(data.BS),
    streetFurniture: {
      trees: furniture(data.SF?.trees),
      streetLamps: furniture(data.SF?.streetLamps),
      benches: furniture(data.SF?.benches),
      wasteBins: furniture(data.SF?.wasteBins),
    },
  };
}
