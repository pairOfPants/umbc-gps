/*
  Simple campus routing on Leaflet using campus.geojson (TypeScript port)
  - Builds a graph from LineString/MultiLineString features that look like walkable/driveable paths
  - Click to set Start and End; computes shortest path (Dijkstra) along the graph
*/

// Minimal declarations to avoid installing Leaflet typings in this demo.
// If you install @types/leaflet, remove these and rely on real types instead.
declare const L: any;

type LatLngTuple = [number, number];

interface GraphNode {
  lat: number;
  lng: number;
  neighbors: Map<string, number>;
}

interface Graph {
  nodes: Map<string, GraphNode>;
  bounds: any; // L.LatLngBounds
  displayFeatures: any[]; // GeoJSON.Feature[]
}

interface NearestNodeResult {
  key: string;
  lat: number;
  lng: number;
  d: number;
}

interface State {
  map: any | null; // L.Map
  geojson: any | null; // GeoJSON.FeatureCollection
  graph: Graph | null;
  startKey: string | null;
  endKey: string | null;
  startMarker: any | null; // L.Marker
  endMarker: any | null; // L.Marker
  routeLine: any | null; // L.Polyline
  mode: 'start' | 'end';
  mapClickEnabled?: boolean;
  _routingInProgress?: boolean;
}

const state: State = {
  map: null,
  geojson: null,
  graph: null,
  startKey: null,
  endKey: null,
  startMarker: null,
  endMarker: null,
  routeLine: null,
  mode: 'start',
};

// Optional hard-coded campus suggestions. If you prefer fully local suggestions
// populate this array with { display_name, lat, lon } entries for common UMBC
// buildings. If non-empty, these will be matched first (simple substring match).
const campusSuggestions: Array<{ display_name: string; lat: string; lon: string; }> = [
  { display_name: 'Albin O. Kuhn Library & Gallery', lat: '39.2546', lon: '-76.7139' },
  { display_name: 'Engineering and Information Technology Building (EIT)', lat: '39.2529', lon: '-76.7139' },
  { display_name: 'Retriever Activities Center (RAC)', lat: '39.2542', lon: '-76.7164' },
  { display_name: 'University Center (UC)', lat: '39.2539', lon: '-76.7132' },
  { display_name: 'Fine Arts Building', lat: '39.2532', lon: '-76.7110' },
  { display_name: 'Performing Arts and Humanities Building (PAHB)', lat: '39.2537', lon: '-76.7122' },
  { display_name: 'Math/Psychology Building', lat: '39.2541', lon: '-76.7127' },
  { display_name: 'Biological Sciences Building', lat: '39.2547', lon: '-76.7117' },
  { display_name: 'Chemistry Building', lat: '39.2542', lon: '-76.7112' },
  { display_name: 'Physics Building', lat: '39.2540', lon: '-76.7107' },
  { display_name: 'Information Technology/Engineering (ITE)', lat: '39.2540', lon: '-76.7132' },
  { display_name: 'Public Policy Building', lat: '39.2552', lon: '-76.7132' },
  { display_name: 'Sondheim Hall', lat: '39.2545', lon: '-76.7122' },
  { display_name: 'Sherman Hall', lat: '39.2547', lon: '-76.7127' },
  { display_name: 'Administration Building', lat: '39.2547', lon: '-76.7132' },
  { display_name: 'The Commons', lat: '39.2542', lon: '-76.7137' },
  { display_name: 'Patapsco Hall', lat: '39.2522', lon: '-76.7132' },
  { display_name: 'Potomac Hall', lat: '39.2522', lon: '-76.7142' },
  { display_name: 'Chesapeake Hall', lat: '39.2522', lon: '-76.7152' },
  { display_name: 'Susquehanna Hall', lat: '39.2522', lon: '-76.7162' },
  { display_name: 'Erickson Hall', lat: '39.2512', lon: '-76.7132' },
  { display_name: 'Harbor Hall', lat: '39.2512', lon: '-76.7142' },
  { display_name: 'Walker Avenue Apartments', lat: '39.2502', lon: '-76.7132' },
  { display_name: 'West Hill Apartments', lat: '39.2502', lon: '-76.7142' },
  { display_name: 'Hillside Apartments', lat: '39.2502', lon: '-76.7152' },
  { display_name: 'Center Road Apartments', lat: '39.2502', lon: '-76.7162' },
  { display_name: 'True Grits Dining Hall', lat: '39.2517', lon: '-76.7137' },
  { display_name: 'UMBC Event Center', lat: '39.2512', lon: '-76.7172' },
  { display_name: 'Potomac Parking Garage', lat: '39.2527', lon: '-76.7147' },
  { display_name: 'Administration Parking Garage', lat: '39.2552', lon: '-76.7137' },
  { display_name: 'Commons Garage', lat: '39.2547', lon: '-76.7142' },
  { display_name: 'Walker Avenue Garage', lat: '39.2507', lon: '-76.7137' },
  { display_name: 'Fine Arts Parking Lot', lat: '39.2532', lon: '-76.7102' },
  { display_name: 'PAHB Parking Lot', lat: '39.2537', lon: '-76.7117' },
  { display_name: 'UMBC Police', lat: '39.2557', lon: '-76.7132' },
  { display_name: 'UMBC Bookstore', lat: '39.2542', lon: '-76.7137' },
  { display_name: 'UMBC Stadium', lat: '39.2492', lon: '-76.7152' },
  { display_name: 'UMBC Technology Center', lat: '39.2562', lon: '-76.7102' },
  { display_name: 'bwtech@UMBC North', lat: '39.2572', lon: '-76.7102' },
  { display_name: 'bwtech@UMBC South', lat: '39.2472', lon: '-76.7152' }
];

/** initMap: Initializes the map and loads data */
function initMap(): void {
  state.map = L.map('map');

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  fetch('campus.geojson')
    .then(r => r.json())
    .then((data: any) => {
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
        const [minX, minY, maxX, maxY] = data.bbox as [number, number, number, number];
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

/** attachHandlers: wires up UI and map interactions */
function attachHandlers(): void {
  const modeBtn = document.getElementById('mode-btn') as HTMLButtonElement;
  const modeLabel = document.getElementById('mode-label') as HTMLSpanElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const startInput = document.getElementById('start-input') as HTMLInputElement;
  const endInput = document.getElementById('end-input') as HTMLInputElement;

  // Map click mode (disabled by default). When enabled the mode cycles between
  // setting start and end on each click — this preserves original behavior.
  state.mapClickEnabled = false;
  modeBtn.addEventListener('click', () => {
    state.mapClickEnabled = !state.mapClickEnabled;
    modeBtn.textContent = `Map Click: ${state.mapClickEnabled ? 'On' : 'Off'}`;
    modeLabel.textContent = state.mapClickEnabled ? 'Click map to set Start / End' : 'Use the search fields and click Route.';
  });

  clearBtn.addEventListener('click', clearAll);

  // Only allow Enter to trigger route if both inputs have values and not during suggestion selection
  startInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && startInput.value && endInput.value) {
      const startSug = document.getElementById('start-suggestions') as HTMLUListElement;
      const endSug = document.getElementById('end-suggestions') as HTMLUListElement;
      if (!startSug.innerHTML && !endSug.innerHTML) {
        routeFromInputs();
      }
    }
  });
  endInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && startInput.value && endInput.value) {
      const startSug = document.getElementById('start-suggestions') as HTMLUListElement;
      const endSug = document.getElementById('end-suggestions') as HTMLUListElement;
      if (!startSug.innerHTML && !endSug.innerHTML) {
        routeFromInputs();
      }
    }
  });

  // Suggestion handling (debounced)
  const startSuggestionsEl = document.getElementById('start-suggestions') as HTMLUListElement;
  const endSuggestionsEl = document.getElementById('end-suggestions') as HTMLUListElement;
  const feedbackEl = document.getElementById('search-feedback') as HTMLDivElement;

  const debouncedStart = debounce((q: string) => updateSuggestions(q, startSuggestionsEl, 'start'), 300);
  const debouncedEnd = debounce((q: string) => updateSuggestions(q, endSuggestionsEl, 'end'), 300);

  startInput.addEventListener('input', (e: Event) => { feedbackEl.textContent = ''; debouncedStart((e.target as HTMLInputElement).value); });
  endInput.addEventListener('input', (e: Event) => { feedbackEl.textContent = ''; debouncedEnd((e.target as HTMLInputElement).value); });

  // Close suggestions on outside click
  document.addEventListener('click', (ev: MouseEvent) => {
    const target = ev.target as HTMLElement | null;
    if (!target || !target.closest('.search-group')) {
      startSuggestionsEl.innerHTML = '';
      endSuggestionsEl.innerHTML = '';
    }
  });

  state.map.on('click', (e: any) => {
    if (!state.mapClickEnabled) return;
    // alternate setting start/end based on which is set already
    if (!state.startKey) state.mode = 'start';
    else if (!state.endKey && state.startKey) state.mode = 'end';
    else {
      // both set: reset to start to begin a new route
      clearAll();
      state.mode = 'start';
    }
    onMapClick(e);
  });
}

/** routeFromInputs: geocode, snap to graph, route */
function routeFromInputs(): void {
  const startStr = (document.getElementById('start-input') as HTMLInputElement).value.trim();
  const endStr = (document.getElementById('end-input') as HTMLInputElement).value.trim();
  const feedbackEl = document.getElementById('search-feedback') as HTMLDivElement;
  if (!startStr || !endStr) {
    alert('Please enter both Start and End locations.');
    return;
  }

  Promise.all([ geocodeNominatim(startStr), geocodeNominatim(endStr) ])
    .then(([s, e]) => {
      if (!s || !e) {
        const parts: string[] = [];
        if (!s) parts.push('Start');
        if (!e) parts.push('End');
        feedbackEl.textContent = `${parts.join(' and ')} location not found.`;
        return;
      }
      // Snap to nearest nodes in the graph
      if (!state.graph) return;
      const nearestS = findNearestNode(parseFloat(s.lat), parseFloat(s.lon), state.graph);
      const nearestE = findNearestNode(parseFloat(e.lat), parseFloat(e.lon), state.graph);
      if (!nearestS || !nearestE) {
        alert('Could not find nearby path nodes for one or both locations.');
        return;
      }
      state.startKey = nearestS.key;
      state.endKey = nearestE.key;
      placeMarker('start', nearestS.lat, nearestS.lng);
      placeMarker('end', nearestE.lat, nearestE.lng);
      tryRoute();
    })
    .catch(err => {
      console.error('Geocoding error', err);
      alert('Geocoding failed. See console for details.');
    });
}

/** geocodeNominatim: forward geocoding, first result or null */
function geocodeNominatim(q: string): Promise<any | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
  return fetch(url, { headers: { 'Accept-Language': 'en' } })
    .then(r => r.json())
    .then((results: any[]) => results && results.length ? results[0] : null)
    .catch(() => null);
}

/** suggestNominatim: suggestions */
function suggestNominatim(q: string, limit = 5): Promise<any[]> {
  if (!q || q.trim().length === 0) return Promise.resolve([]);
  const qlc = q.trim().toLowerCase();
  if (Array.isArray(campusSuggestions) && campusSuggestions.length > 0) {
    const matches = campusSuggestions.filter(s => s.display_name.toLowerCase().includes(qlc)).slice(0, limit);
    if (matches.length > 0) return Promise.resolve(matches as any[]);
  }

  let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}&addressdetails=1`;
  try {
    if (state.map && state.map.getBounds) {
      const b = state.map.getBounds();
      if (b && b.isValid()) {
        const southWest = b.getSouthWest();
        const northEast = b.getNorthEast();
        const viewbox = [southWest.lng, southWest.lat, northEast.lng, northEast.lat].join(',');
        url += `&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;
      }
    }
  } catch (err) {
    // ignore and call without viewbox
  }

  return fetch(url, { headers: { 'Accept-Language': 'en' } })
    .then(r => r.json())
    .then((results: any[]) => results || [])
    .catch(() => []);
}

/** updateSuggestions: render suggestion list */
function updateSuggestions(query: string, listEl: HTMLElement, which: 'start' | 'end'): void {
  listEl.innerHTML = '';
  if (!query || query.trim().length === 0) return;
  suggestNominatim(query, 6).then(results => {
    if (!results || results.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No suggestions';
      li.setAttribute('aria-disabled', 'true');
      listEl.appendChild(li);
      return;
    }
    for (const r of results) {
      const li = document.createElement('li');
      li.textContent = r.display_name;
      li.tabIndex = 0;
      li.addEventListener('click', () => selectSuggestion(r, which));
      li.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') selectSuggestion(r, which); });
      listEl.appendChild(li);
    }
  }).catch(() => {
    const li = document.createElement('li');
    li.textContent = 'Error fetching suggestions';
    listEl.appendChild(li);
  });
}

/** selectSuggestion: fill input and maybe route */
function selectSuggestion(result: any, which: 'start' | 'end'): void {
  const startInput = document.getElementById('start-input') as HTMLInputElement;
  const endInput = document.getElementById('end-input') as HTMLInputElement;
  const listEl = document.getElementById(which === 'start' ? 'start-suggestions' : 'end-suggestions') as HTMLElement;
  if (which === 'start') {
    startInput.value = result.display_name;
    (startInput as any).dataset.lat = result.lat;
    (startInput as any).dataset.lon = result.lon;
  } else {
    endInput.value = result.display_name;
    (endInput as any).dataset.lat = result.lat;
    (endInput as any).dataset.lon = result.lon;
  }
  listEl.innerHTML = '';
  if ((startInput as any).dataset.lat && (startInput as any).dataset.lon && (endInput as any).dataset.lat && (endInput as any).dataset.lon) {
    if (!state.graph) return;
    const nearestS = findNearestNode(parseFloat((startInput as any).dataset.lat), parseFloat((startInput as any).dataset.lon), state.graph);
    const nearestE = findNearestNode(parseFloat((endInput as any).dataset.lat), parseFloat((endInput as any).dataset.lon), state.graph);
    const feedbackEl = document.getElementById('search-feedback') as HTMLDivElement;
    if (!nearestS || !nearestE) {
      feedbackEl.textContent = 'Could not find nearby path nodes for one or both selected places.';
      return;
    }
    state.startKey = nearestS.key;
    state.endKey = nearestE.key;
    placeMarker('start', nearestS.lat, nearestS.lng);
    placeMarker('end', nearestE.lat, nearestE.lng);
    tryRoute();
  }
}

/** Simple debounce helper */
function debounce<F extends (...args: any[]) => void>(fn: F, wait: number): F {
  let t: any = null;
  const wrapped = function(this: any, ...args: Parameters<F>) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  } as unknown as F;
  return wrapped;
}

/** onMapClick: handle click -> snap to node */
function onMapClick(e: any): void {
  if (!state.graph) return;
  const { lat, lng } = e.latlng as { lat: number; lng: number };
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

/** clearAll: reset UI and state */
function clearAll(): void {
  state.startKey = null;
  state.endKey = null;
  if (state.startMarker) { state.map.removeLayer(state.startMarker); state.startMarker = null; }
  if (state.endMarker) { state.map.removeLayer(state.endMarker); state.endMarker = null; }
  if (state.routeLine) { state.map.removeLayer(state.routeLine); state.routeLine = null; }
  setDistanceLabel('');
}

/** placeMarker: place start/end markers */
function placeMarker(which: 'start' | 'end', lat: number, lng: number): void {
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

/** setDistanceLabel: update UI */
function setDistanceLabel(text: string): void {
  const el = document.getElementById('distance-label') as HTMLSpanElement;
  el.textContent = text;
}

/** tryRoute: compute and draw shortest path */
function tryRoute(): void {
  if (!state.startKey || !state.endKey || !state.graph) return;
  if (state.startKey === state.endKey) {
    if (state.routeLine) { state.map.removeLayer(state.routeLine); state.routeLine = null; }
    setDistanceLabel('Start and End are the same node.');
    return;
  }

  if (state._routingInProgress) return;
  state._routingInProgress = true;

  const { path, distance } = dijkstra(state.graph, state.startKey, state.endKey);
  if (!path || path.length === 0 || !isFinite(distance)) {
    if (state.startMarker) { state.map.removeLayer(state.startMarker); state.startMarker = null; }
    if (state.endMarker) { state.map.removeLayer(state.endMarker); state.endMarker = null; }
    setDistanceLabel('No route found between the selected points.');
    state._routingInProgress = false;
    return;
  }

  const latlngs: LatLngTuple[] = path.map(k => {
    const n = state.graph!.nodes.get(k)!;
    return [n.lat, n.lng];
  });

  if (state.routeLine) state.map.removeLayer(state.routeLine);
  state.routeLine = L.polyline(latlngs, { color: '#2563eb', weight: 6, opacity: 0.85, className: 'route-line' });
  state.routeLine.addTo(state.map);

  const pretty = formatMeters(distance);
  setDistanceLabel(`Distance: ${pretty}`);
  state._routingInProgress = false;
}

/** buildGraphFromGeoJSON: parse and build graph */
function buildGraphFromGeoJSON(geojson: any): Graph {
  const nodes: Map<string, GraphNode> = new Map();
  const bounds = L.latLngBounds([]);
  const displayFeatures: any[] = [];

  function nodeKey(lat: number, lng: number): string {
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
  }

  function addNode(lat: number, lng: number): string {
    const key = nodeKey(lat, lng);
    if (!nodes.has(key)) {
      nodes.set(key, { lat, lng, neighbors: new Map() });
    }
    bounds.extend([lat, lng]);
    return key;
    }

  function addEdge(aKey: string, bKey: string): void {
    if (aKey === bKey) return;
    const a = nodes.get(aKey)!;
    const b = nodes.get(bKey)!;
    const w = haversine(a.lat, a.lng, b.lat, b.lng);
    a.neighbors.set(bKey, Math.min(a.neighbors.get(bKey) ?? Infinity, w));
    b.neighbors.set(aKey, Math.min(b.neighbors.get(aKey) ?? Infinity, w));
  }

  function shouldUseFeature(feat: any): boolean {
    if (!feat || !feat.geometry) return false;
    const t = feat.geometry.type;
    if (t !== 'LineString' && t !== 'MultiLineString') return false;
    const p = (feat.properties || {});
    const tag = (p.highway || p.footway || p.path || p.sidewalk || p.cycleway || p.pedestrian || p.service || p.track || p.steps);
    if (p.power || p.fence_type || p.barrier) return false;
    if (typeof tag !== 'undefined') return true;
    return true;
  }

  function processLine(coords: Array<[number, number]>): void {
    if (!coords || coords.length < 2) return;
    let prevKey: string | null = null;
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      const key = addNode(lat, lng);
      if (prevKey) addEdge(prevKey, key);
      prevKey = key;
    }
  }

  (geojson.features || []).forEach((feat: any) => {
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

/** dijkstra: shortest path */
function dijkstra(graph: Graph, startKey: string, endKey: string): { path: string[]; distance: number } {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  const pq = new MinHeap<{ key: string; d: number }>();
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
      const alt = (dist.get(u) ?? Infinity) + w;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
        pq.push({ key: v, d: alt });
      }
    }
  }

  const path: string[] = [];
  let u: string | undefined = endKey;
  if (!prev.has(u) && u !== startKey) {
    return { path: [], distance: Infinity };
  }
  while (u) {
    path.unshift(u);
    if (u === startKey) break;
    u = prev.get(u);
  }
  return { path, distance: dist.get(endKey) ?? Infinity };
}

/** Minimal binary min-heap for Dijkstra */
class MinHeap<T extends { d: number }> {
  private a: T[] = [];
  isEmpty(): boolean { return this.a.length === 0; }
  push(x: T): void { this.a.push(x); this.bubbleUp(this.a.length - 1); }
  pop(): T {
    if (this.a.length === 1) return this.a.pop() as T;
    const top = this.a[0];
    this.a[0] = this.a.pop() as T;
    this.bubbleDown(0);
    return top;
  }
  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.a[p].d <= this.a[i].d) break;
      [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
      i = p;
    }
  }
  private bubbleDown(i: number): void {
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

/** findNearestNode: nearest by haversine */
function findNearestNode(lat: number, lng: number, graph: Graph): NearestNodeResult | null {
  let best: NearestNodeResult | null = null;
  let bestD = Infinity;
  for (const [k, n] of graph.nodes) {
    const d = haversine(lat, lng, n.lat, n.lng);
    if (d < bestD) { bestD = d; best = { key: k, lat: n.lat, lng: n.lng, d }; }
  }
  return best;
}

/** haversine: distance in meters */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** formatMeters: pretty distance */
function formatMeters(m: number): string {
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMap);
} else {
  initMap();
}
