/*
  Simple campus routing on Leaflet using campus.geojson
  - Builds a graph from LineString/MultiLineString features that look like walkable/driveable paths
  - Click to set Start and End; computes shortest path (Dijkstra) along the graph
*/

const state = {
  map: null,
  geojson: null,
  graph: null, // { nodes: Map(key->{lat,lng,neighbors:Map(neiKey,weight)}), bounds: L.LatLngBounds }
  startKey: null,
  endKey: null,
  startMarker: null,
  endMarker: null,
  routeLine: null,
  mode: 'start', // 'start' or 'end'
};

/**
 * Name
 *   initMap
 * Author: Ethan Michalik
 * Description
 *   Initializes the Leaflet map, loads campus.geojson, builds the routing graph,
 *   displays the network, fits bounds, and attaches UI/event handlers.
 * In params
 *   None
 * Returns
 *   void
 */
function initMap() {
  state.map = L.map('map');

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  fetch('campus.geojson')
    .then(r => r.json())
    .then(data => {
      state.geojson = data;
      const graph = buildGraphFromGeoJSON(data);
      state.graph = graph;

      // Show the path network on the map (light gray)
      L.geoJSON(graph.displayFeatures, {
        style: { color: '#808080', weight: 2, opacity: 0.7 }
      }).addTo(state.map);

      if (graph.bounds && graph.bounds.isValid()) {
        state.map.fitBounds(graph.bounds.pad(0.05));
      } else if (data.bbox) {
        const [minX, minY, maxX, maxY] = data.bbox;
        state.map.fitBounds([[minY, minX], [maxY, maxX]]);
      } else {
        state.map.setView([39.255, -76.712], 15);
      }

      attachHandlers();
    })
    .catch(err => {
      console.error('Failed to load campus.geojson', err);
      alert('Could not load campus.geojson. Make sure the file is present in the same folder.');
    });
}

/**
 * Name
 *   attachHandlers
 * Author: Ethan Michalik
 * Description
 *   Wires up button click handlers and map click handler for setting start/end points
 *   and clearing the current route.
 * In params
 *   None
 * Returns
 *   void
 */
function attachHandlers() {
  const modeBtn = document.getElementById('mode-btn');
  const modeLabel = document.getElementById('mode-label');
  const clearBtn = document.getElementById('clear-btn');

  modeBtn.addEventListener('click', () => {
    if (state.mode === 'start') {
      state.mode = 'end';
      modeBtn.textContent = 'Set Start';
      modeLabel.textContent = 'Click map to set: End';
    } else {
      state.mode = 'start';
      modeBtn.textContent = 'Set End';
      modeLabel.textContent = 'Click map to set: Start';
    }
  });

  clearBtn.addEventListener('click', clearAll);

  state.map.on('click', onMapClick);
}

/**
 * Name
 *   onMapClick
 * Author: Ethan Michalik
 * Description
 *   Handles map clicks by snapping the clicked location to the nearest node in the
 *   routing graph. Sets either the start or end marker depending on current mode
 *   and then attempts to compute a route.
 * In params
 *   e: Leaflet mouse event (contains latlng)
 * Returns
 *   void
 */
function onMapClick(e) {
  if (!state.graph) return;
  const { lat, lng } = e.latlng;
  const nearest = findNearestNode(lat, lng, state.graph);
  if (!nearest) {
    alert('No nearby path node found.');
    return;
  }

  if (state.mode === 'start') {
    state.startKey = nearest.key;
    placeMarker('start', nearest.lat, nearest.lng);
  } else {
    state.endKey = nearest.key;
    placeMarker('end', nearest.lat, nearest.lng);
  }

  tryRoute();
}

/**
 * Name
 *   clearAll
 * Author: Ethan Michalik
 * Description
 *   Clears the selected start/end nodes, removes markers and the current route
 *   polyline, and resets the distance label.
 * In params
 *   None
 * Returns
 *   void
 */
function clearAll() {
  state.startKey = null;
  state.endKey = null;
  if (state.startMarker) { state.map.removeLayer(state.startMarker); state.startMarker = null; }
  if (state.endMarker) { state.map.removeLayer(state.endMarker); state.endMarker = null; }
  if (state.routeLine) { state.map.removeLayer(state.routeLine); state.routeLine = null; }
  setDistanceLabel('');
}

/**
 * Name
 *   placeMarker
 * Author: Ethan Michalik
 * Description
 *   Places a colored marker (green for start, red for end) at the given coordinates
 *   on the map. Replaces any existing marker of the same type.
 * In params
 *   which: string ('start' | 'end') — which marker to place
 *   lat: number — latitude
 *   lng: number — longitude
 * Returns
 *   void
 */
function placeMarker(which, lat, lng) {
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${which === 'start' ? '#22c55e' : '#ef4444'};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,.6);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
  const marker = L.marker([lat, lng], { icon });
  marker.addTo(state.map);

  if (which === 'start') {
    if (state.startMarker) state.map.removeLayer(state.startMarker);
    state.startMarker = marker;
  } else {
    if (state.endMarker) state.map.removeLayer(state.endMarker);
    state.endMarker = marker;
  }
}

/**
 * Name
 *   setDistanceLabel
 * Author: Ethan Michalik
 * Description
 *   Updates the distance label text in the UI.
 * In params
 *   text: string — text to display (e.g., formatted distance)
 * Returns
 *   void
 */
function setDistanceLabel(text) {
  const el = document.getElementById('distance-label');
  el.textContent = text;
}

/**
 * Name
 *   tryRoute
 * Author: Ethan Michalik
 * Description
 *   If both start and end nodes are selected, computes the shortest path via Dijkstra,
 *   draws the route on the map, and updates the total distance label.
 * In params
 *   None
 * Returns
 *   void
 */
function tryRoute() {
  if (!state.startKey || !state.endKey || !state.graph) return;
  if (state.startKey === state.endKey) {
    if (state.routeLine) { state.map.removeLayer(state.routeLine); state.routeLine = null; }
    setDistanceLabel('Start and End are the same node.');
    return;
  }

  const { path, distance } = dijkstra(state.graph, state.startKey, state.endKey);
  if (!path || path.length === 0 || !isFinite(distance)) {
    alert('No route found between the selected points.');
    return;
  }

  const latlngs = path.map(k => {
    const n = state.graph.nodes.get(k);
    return [n.lat, n.lng];
  });

  if (state.routeLine) state.map.removeLayer(state.routeLine);
  state.routeLine = L.polyline(latlngs, { color: '#2563eb', weight: 6, opacity: 0.85, className: 'route-line' });
  state.routeLine.addTo(state.map);

  const pretty = formatMeters(distance);
  setDistanceLabel(`Distance: ${pretty}`);
}

/**
 * Name
 *   buildGraphFromGeoJSON
 * Author: Ethan Michalik
 * Description
 *   Parses a GeoJSON FeatureCollection, extracts path-like LineStrings/MultiLineStrings,
 *   constructs a bidirectional weighted graph (meters via haversine), returns nodes,
 *   cumulative bounds, and the features to display.
 * In params
 *   geojson: GeoJSON FeatureCollection
 * Returns
 *   { nodes: Map<string,{lat:number,lng:number,neighbors:Map<string,number>}>,
 *     bounds: L.LatLngBounds,
 *     displayFeatures: Array<GeoJSON.Feature> }
 */
function buildGraphFromGeoJSON(geojson) {
  const nodes = new Map(); // key -> {lat, lng, neighbors: Map(key, weight)}
  const bounds = L.latLngBounds([]);
  const displayFeatures = [];

  /**
   * Name
   *   nodeKey
   * Author: Ethan Michalik
   * Description
   *   Creates a stable string key for a lat/lng using fixed precision to merge
   *   nearly identical vertices.
   * In params
   *   lat: number — latitude
   *   lng: number — longitude
   * Returns
   *   string — unique-ish key like "lat,lng"
   */
  function nodeKey(lat, lng) {
    // fixed precision key to collapse near-identical vertices
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }

  /**
   * Name
   *   addNode
   * Author: Ethan Michalik
   * Description
   *   Ensures a node exists in the nodes map and extends the bounds; returns its key.
   * In params
   *   lat: number — latitude
   *   lng: number — longitude
   * Returns
   *   string — node key
   */
  function addNode(lat, lng) {
    const key = nodeKey(lat, lng);
    if (!nodes.has(key)) {
      nodes.set(key, { lat, lng, neighbors: new Map() });
    }
    bounds.extend([lat, lng]);
    return key;
  }

  /**
   * Name
   *   addEdge
   * Author: Ethan Michalik
   * Description
   *   Adds an undirected weighted edge between two node keys based on haversine distance.
   * In params
   *   aKey: string — key of first node
   *   bKey: string — key of second node
   * Returns
   *   void
   */
  function addEdge(aKey, bKey) {
    if (aKey === bKey) return;
    const a = nodes.get(aKey);
    const b = nodes.get(bKey);
    const w = haversine(a.lat, a.lng, b.lat, b.lng);
    a.neighbors.set(bKey, Math.min(a.neighbors.get(bKey) ?? Infinity, w));
    b.neighbors.set(aKey, Math.min(b.neighbors.get(aKey) ?? Infinity, w));
  }

  /**
   * Name
   *   shouldUseFeature
   * Author: Ethan Michalik
   * Description
   *   Heuristically filters GeoJSON features to include walkable/driveable paths
   *   (LineString/MultiLineString with relevant tags) and exclude obvious non-paths
   *   like power lines or barriers.
   * In params
   *   feat: GeoJSON.Feature
   * Returns
   *   boolean — whether the feature should be used in the graph/display
   */
  function shouldUseFeature(feat) {
    if (!feat || !feat.geometry) return false;
    const t = feat.geometry.type;
    if (t !== 'LineString' && t !== 'MultiLineString') return false;
    const p = (feat.properties || {});
    const tag = (p.highway || p.footway || p.path || p.sidewalk || p.cycleway || p.pedestrian || p.service || p.track || p.steps);
    // Heuristic: prefer features with one of these tags. If absent, still include if type is LineString and not clearly non-path (e.g., power lines)
    if (p.power || p.fence_type || p.barrier) return false;
    if (typeof tag !== 'undefined') return true;
    // If highway tag missing, include but lower display priority; still usable for connectivity.
    return true;
  }

  /**
   * Name
   *   processLine
   * Author: Ethan Michalik
   * Description
   *   Adds nodes for each coordinate in a LineString and connects consecutive
   *   coordinates with edges.
   * In params
   *   coords: Array<[lng:number, lat:number]>
   * Returns
   *   void
   */
  function processLine(coords) {
    if (!coords || coords.length < 2) return;
    let prevKey = null;
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      const key = addNode(lat, lng);
      if (prevKey) addEdge(prevKey, key);
      prevKey = key;
    }
  }

  (geojson.features || []).forEach(feat => {
    if (!shouldUseFeature(feat)) return;
    const g = feat.geometry;
    if (g.type === 'LineString') {
      processLine(g.coordinates);
      displayFeatures.push(feat);
    } else if (g.type === 'MultiLineString') {
      for (const part of g.coordinates) processLine(part);
      displayFeatures.push(feat);
    }
  });

  return { nodes, bounds, displayFeatures };
}

/**
 * Name
 *   dijkstra
 * Author: Ethan Michalik
 * Description
 *   Computes the shortest path on a weighted graph using Dijkstra's algorithm.
 * In params
 *   graph: { nodes: Map<string,{neighbors:Map<string,number>,lat:number,lng:number}> }
 *   startKey: string — starting node key
 *   endKey: string — destination node key
 * Returns
 *   { path: string[], distance: number } — node key path and total distance (meters)
 */
function dijkstra(graph, startKey, endKey) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  const pq = new MinHeap();
  graph.nodes.forEach((_, k) => dist.set(k, Infinity));
  dist.set(startKey, 0);
  pq.push({ key: startKey, d: 0 });

  while (!pq.isEmpty()) {
    const { key: u } = pq.pop();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === endKey) break;

    const uNode = graph.nodes.get(u);
    if (!uNode) continue;

    for (const [v, w] of uNode.neighbors) {
      if (visited.has(v)) continue;
      const alt = dist.get(u) + w;
      if (alt < dist.get(v)) {
        dist.set(v, alt);
        prev.set(v, u);
        pq.push({ key: v, d: alt });
      }
    }
  }

  const path = [];
  let u = endKey;
  if (!prev.has(u) && u !== startKey) {
    return { path: [], distance: Infinity };
  }
  while (u) {
    path.unshift(u);
    if (u === startKey) break;
    u = prev.get(u);
  }
  return { path, distance: dist.get(endKey) };
}

/**
 * Name
 *   MinHeap (class)
 * Author: Ethan Michalik
 * Description
 *   A minimal binary min-heap used as a priority queue for Dijkstra's algorithm,
 *   ordering items by their `d` (distance) property.
 * In params
 *   N/A (see individual methods)
 * Out params
 *   N/A (methods return values as specified below)
 */
class MinHeap {
  /**
   * Name
   *   constructor
   * Author: Ethan Michalik
   * Description
   *   Creates an empty min-heap.
   * In params
   *   None
   * Returns
   *   MinHeap instance
   */
  constructor() { this.a = []; }

  /**
   * Name
   *   isEmpty
   * Author: Ethan Michalik
   * Description
   *   Checks whether the heap contains any items.
   * In params
   *   None
   * Returns
   *   boolean — true if empty
   */
  isEmpty() { return this.a.length === 0; }

  /**
   * Name
   *   push
   * Author: Ethan Michalik
   * Description
   *   Inserts an item and restores heap order.
   * In params
   *   x: { d: number, [key: string]: any } — item with distance property `d`
   * Returns
   *   void
   */
  push(x) { this.a.push(x); this.bubbleUp(this.a.length - 1); }

  /**
   * Name
   *   pop
   * Author: Ethan Michalik
   * Description
   *   Removes and returns the item with the smallest `d` value.
   * In params
   *   None
   * Returns
   *   any — the top heap item
   */
  pop() {
    if (this.a.length === 1) return this.a.pop();
    const top = this.a[0];
    this.a[0] = this.a.pop();
    this.bubbleDown(0);
    return top;
  }

  /**
   * Name
   *   bubbleUp
   * Author: Ethan Michalik
   * Description
   *   Restores heap order by moving the element at index `i` up.
   * In params
   *   i: number — index to bubble up
   * Returns
   *   void
   */
  bubbleUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.a[p].d <= this.a[i].d) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }

  /**
   * Name
   *   bubbleDown
   * Author: Ethan Michalik
   * Description
   *   Restores heap order by moving the element at index `i` down.
   * In params
   *   i: number — index to bubble down
   * Returns
   *   void
   */
  bubbleDown(i) {
    const n = this.a.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let m = i;
      if (l < n && this.a[l].d < this.a[m].d) m = l;
      if (r < n && this.a[r].d < this.a[m].d) m = r;
      if (m === i) break;
      [this.a[m], this.a[i]] = [this.a[i], this.a[m]];
      i = m;
    }
  }
}

/**
 * Name
 *   findNearestNode
 * Author: Ethan Michalik
 * Description
 *   Finds the nearest graph node to the given lat/lng using haversine distance.
 * In params
 *   lat: number — latitude of query point
 *   lng: number — longitude of query point
 *   graph: { nodes: Map<string,{lat:number,lng:number}> }
 * Returns
 *   { key: string, lat: number, lng: number, d: number } | null — nearest node info or null
 */
function findNearestNode(lat, lng, graph) {
  let best = null;
  let bestD = Infinity;
  for (const [k, n] of graph.nodes) {
    const d = haversine(lat, lng, n.lat, n.lng);
    if (d < bestD) { bestD = d; best = { key: k, lat: n.lat, lng: n.lng, d }; }
  }
  return best;
}

/**
 * Name
 *   haversine
 * Author: Ethan Michalik
 * Description
 *   Computes the great-circle distance between two lat/lon points on Earth.
 * In params
 *   lat1: number — latitude of point 1
 *   lon1: number — longitude of point 1
 *   lat2: number — latitude of point 2
 *   lon2: number — longitude of point 2
 * Returns
 *   number — distance in meters
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Name
 *   formatMeters
 * Author: Ethan Michalik
 * Description
 *   Formats a meter value into a human-friendly string in meters or kilometers.
 * In params
 *   m: number — distance in meters
 * Returns
 *   string — formatted distance (e.g., "850 m" or "1.23 km")
 */
function formatMeters(m) {
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMap);
} else {
  initMap();
}
