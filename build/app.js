/*
  Simple campus routing on Leaflet using campus.geojson (TypeScript port)
  - Builds a graph from LineString/MultiLineString features that look like walkable/driveable paths
  - Click to set Start and End; computes shortest path (_dijkstra) along the graph
*/
const _state = {
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
const _campusSuggestions = [
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
/** _initMap: Initializes the map and loads data */
function _initMap() {
    _state.map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minZoom: 16,
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(_state.map);
    fetch('./OSM-data/campus.geojson')
        .then(r => r.json())
        .then((data) => {
        _state.geojson = data;
        const graph = _buildGraphFromGeoJSON(data);
        _state.graph = graph;
        // Show the path network on the map (light gray)
        L.geoJSON(graph.displayFeatures, {
            style: { color: '#808080', weight: 2, opacity: 0.7 }
        }).addTo(_state.map);
        if (graph.bounds && graph.bounds.isValid()) {
            _state.map.fitBounds(graph.bounds.pad(0.05));
        }
        else if (data.bbox) {
            const [minX, minY, maxX, maxY] = data.bbox;
            _state.map.fitBounds([[minY, minX], [maxY, maxX]]);
        }
        else {
            //_state.map.setView([39.255, -76.712], 15);
            _state.map.setView([40, -70], 15);
        }
        _attachHandlers();
    })
        .catch(err => {
        console.error('Failed to load campus.geojson', err);
        alert('Could not load campus.geojson. Make sure the file is present in the same folder.');
    });
}
/** _attachHandlers: wires up UI and map interactions */
function _attachHandlers() {
    const modeBtn = document.getElementById('mode-btn');
    const modeLabel = document.getElementById('mode-label');
    const clearBtn = document.getElementById('clear-btn');
    const startInput = document.getElementById('start-input');
    const endInput = document.getElementById('end-input');
    // Map click mode (disabled by default). When enabled the mode cycles between
    // setting start and end on each click — this preserves original behavior.
    _state.mapClickEnabled = false;
    modeBtn.addEventListener('click', () => {
        _state.mapClickEnabled = !_state.mapClickEnabled;
        modeBtn.textContent = `Map Click: ${_state.mapClickEnabled ? 'On' : 'Off'}`;
        modeLabel.textContent = _state.mapClickEnabled ? 'Click map to set Start / End' : 'Use the search fields and click Route.';
    });
    clearBtn.addEventListener('click', _clearAll);
    // Only allow Enter to trigger route if both inputs have values and not during suggestion selection
    startInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && startInput.value && endInput.value) {
            const startSug = document.getElementById('start-suggestions');
            const endSug = document.getElementById('end-suggestions');
            if (!startSug.innerHTML && !endSug.innerHTML) {
                _routeFromInputs();
            }
        }
    });
    endInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && startInput.value && endInput.value) {
            const startSug = document.getElementById('start-suggestions');
            const endSug = document.getElementById('end-suggestions');
            if (!startSug.innerHTML && !endSug.innerHTML) {
                _routeFromInputs();
            }
        }
    });
    // Suggestion handling (debounced)
    const startSuggestionsEl = document.getElementById('start-suggestions');
    const endSuggestionsEl = document.getElementById('end-suggestions');
    const feedbackEl = document.getElementById('search-feedback');
    const debouncedStart = _debounce((q) => _updateSuggestions(q, startSuggestionsEl, 'start'), 300);
    const debouncedEnd = _debounce((q) => _updateSuggestions(q, endSuggestionsEl, 'end'), 300);
    startInput.addEventListener('input', (e) => { feedbackEl.textContent = ''; debouncedStart(e.target.value); });
    endInput.addEventListener('input', (e) => { feedbackEl.textContent = ''; debouncedEnd(e.target.value); });
    // Close suggestions on outside click
    document.addEventListener('click', (ev) => {
        const target = ev.target;
        if (!target || !target.closest('.search-group')) {
            startSuggestionsEl.innerHTML = '';
            endSuggestionsEl.innerHTML = '';
        }
    });
    _state.map.on('click', (e) => {
        if (!_state.mapClickEnabled)
            return;
        // alternate setting start/end based on which is set already
        if (!_state.startKey)
            _state.mode = 'start';
        else if (!_state.endKey && _state.startKey)
            _state.mode = 'end';
        else {
            // both set: reset to start to begin a new route
            _clearAll();
            _state.mode = 'start';
        }
        _onMapClick(e);
    });
}
/** _routeFromInputs: geocode, snap to graph, route */
function _routeFromInputs() {
    const startStr = document.getElementById('start-input').value.trim();
    const endStr = document.getElementById('end-input').value.trim();
    const feedbackEl = document.getElementById('search-feedback');
    if (!startStr || !endStr) {
        alert('Please enter both Start and End locations.');
        return;
    }
    Promise.all([_geocodeNominatim(startStr), _geocodeNominatim(endStr)])
        .then(([s, e]) => {
        if (!s || !e) {
            const parts = [];
            if (!s)
                parts.push('Start');
            if (!e)
                parts.push('End');
            feedbackEl.textContent = `${parts.join(' and ')} location not found.`;
            return;
        }
        // Snap to nearest nodes in the graph
        if (!_state.graph)
            return;
        const nearestS = _findNearestNode(parseFloat(s.lat), parseFloat(s.lon), _state.graph);
        const nearestE = _findNearestNode(parseFloat(e.lat), parseFloat(e.lon), _state.graph);
        if (!nearestS || !nearestE) {
            alert('Could not find nearby path nodes for one or both locations.');
            return;
        }
        _state.startKey = nearestS.key;
        _state.endKey = nearestE.key;
        _placeMarker('start', nearestS.lat, nearestS.lng);
        _placeMarker('end', nearestE.lat, nearestE.lng);
        _tryRoute();
    })
        .catch(err => {
        console.error('Geocoding error', err);
        alert('Geocoding failed. See console for details.');
    });
}
/** _geocodeNominatim: forward geocoding, first result or null */
function _geocodeNominatim(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
    return fetch(url, { headers: { 'Accept-Language': 'en' } })
        .then(r => r.json())
        .then((results) => results && results.length ? results[0] : null)
        .catch(() => null);
}
import { validateInput, suggestBuildingsFromInput } from './inputValidate.js';
/** _suggestNominatim: suggestions using fuzzy matching */
function _suggestNominatim(q, limit = 5) {
    if (!q || q.trim().length === 0)
        return Promise.resolve([]);
    if (!Array.isArray(_campusSuggestions) || _campusSuggestions.length === 0) {
        return Promise.resolve([]);
    }
    // Use our imported functions for validation and suggestions
    const words = validateInput(q);
    const matches = suggestBuildingsFromInput(words, _campusSuggestions);
    return Promise.resolve(matches.slice(0, limit));
}
/** _updateSuggestions: render suggestion list */
function _updateSuggestions(query, listEl, which) {
    listEl.innerHTML = '';
    if (!query || query.trim().length === 0)
        return;
    _suggestNominatim(query, 6).then(results => {
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
            li.addEventListener('click', () => _selectSuggestion(r, which));
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter')
                _selectSuggestion(r, which); });
            listEl.appendChild(li);
        }
    }).catch(() => {
        const li = document.createElement('li');
        li.textContent = 'Error fetching suggestions';
        listEl.appendChild(li);
    });
}
/** _selectSuggestion: fill input and maybe route */
function _selectSuggestion(result, which) {
    const startInput = document.getElementById('start-input');
    const endInput = document.getElementById('end-input');
    const listEl = document.getElementById(which === 'start' ? 'start-suggestions' : 'end-suggestions');
    if (which === 'start') {
        startInput.value = result.display_name;
        startInput.dataset.lat = result.lat;
        startInput.dataset.lon = result.lon;
    }
    else {
        endInput.value = result.display_name;
        endInput.dataset.lat = result.lat;
        endInput.dataset.lon = result.lon;
    }
    listEl.innerHTML = '';
    if (startInput.dataset.lat && startInput.dataset.lon && endInput.dataset.lat && endInput.dataset.lon) {
        if (!_state.graph)
            return;
        const nearestS = _findNearestNode(parseFloat(startInput.dataset.lat), parseFloat(startInput.dataset.lon), _state.graph);
        const nearestE = _findNearestNode(parseFloat(endInput.dataset.lat), parseFloat(endInput.dataset.lon), _state.graph);
        const feedbackEl = document.getElementById('search-feedback');
        if (!nearestS || !nearestE) {
            feedbackEl.textContent = 'Could not find nearby path nodes for one or both selected places.';
            return;
        }
        _state.startKey = nearestS.key;
        _state.endKey = nearestE.key;
        _placeMarker('start', nearestS.lat, nearestS.lng);
        _placeMarker('end', nearestE.lat, nearestE.lng);
        _tryRoute();
    }
}
/** Simple _debounce helper */
function _debounce(fn, wait) {
    let t = null;
    const wrapped = function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
    return wrapped;
}
/** _onMapClick: handle click -> snap to node */
function _onMapClick(e) {
    if (!_state.graph)
        return;
    const { lat, lng } = e.latlng;
    const nearest = _findNearestNode(lat, lng, _state.graph);
    if (!nearest) {
        alert('No nearby path node found.');
        return;
    }
    if (_state.mode === 'start') {
        _state.startKey = nearest.key;
        _placeMarker('start', nearest.lat, nearest.lng);
    }
    else {
        _state.endKey = nearest.key;
        _placeMarker('end', nearest.lat, nearest.lng);
    }
    _tryRoute();
}
/** _clearAll: reset UI and _state */
function _clearAll() {
    _state.startKey = null;
    _state.endKey = null;
    if (_state.startMarker) {
        _state.map.removeLayer(_state.startMarker);
        _state.startMarker = null;
    }
    if (_state.endMarker) {
        _state.map.removeLayer(_state.endMarker);
        _state.endMarker = null;
    }
    if (_state.routeLine) {
        _state.map.removeLayer(_state.routeLine);
        _state.routeLine = null;
    }
    _setDistanceLabel('');
}
/** _placeMarker: place start/end markers */
function _placeMarker(which, lat, lng) {
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${which === 'start' ? '#22c55e' : '#ef4444'};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,.6);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
    const marker = L.marker([lat, lng], { icon });
    marker.addTo(_state.map);
    if (which === 'start') {
        if (_state.startMarker)
            _state.map.removeLayer(_state.startMarker);
        _state.startMarker = marker;
    }
    else {
        if (_state.endMarker)
            _state.map.removeLayer(_state.endMarker);
        _state.endMarker = marker;
    }
}
/** _setDistanceLabel: update UI */
function _setDistanceLabel(text) {
    const el = document.getElementById('distance-label');
    el.textContent = text;
}
/** _tryRoute: compute and draw shortest path */
function _tryRoute() {
    if (!_state.startKey || !_state.endKey || !_state.graph)
        return;
    if (_state.startKey === _state.endKey) {
        if (_state.routeLine) {
            _state.map.removeLayer(_state.routeLine);
            _state.routeLine = null;
        }
        _setDistanceLabel('Start and End are the same node.');
        return;
    }
    if (_state._routingInProgress)
        return;
    _state._routingInProgress = true;
    const { path, distance } = _dijkstra(_state.graph, _state.startKey, _state.endKey);
    if (!path || path.length === 0 || !isFinite(distance)) {
        if (_state.startMarker) {
            _state.map.removeLayer(_state.startMarker);
            _state.startMarker = null;
        }
        if (_state.endMarker) {
            _state.map.removeLayer(_state.endMarker);
            _state.endMarker = null;
        }
        _setDistanceLabel('No route found between the selected points.');
        _state._routingInProgress = false;
        return;
    }
    const latlngs = path.map(k => {
        const n = _state.graph.nodes.get(k);
        return [n.lat, n.lng];
    });
    if (_state.routeLine)
        _state.map.removeLayer(_state.routeLine);
    _state.routeLine = L.polyline(latlngs, { color: '#2563eb', weight: 6, opacity: 0.85, className: 'route-line' });
    _state.routeLine.addTo(_state.map);
    const pretty = _formatMeters(distance);
    _setDistanceLabel(`Distance: ${pretty}`);
    _state._routingInProgress = false;
}
/** _buildGraphFromGeoJSON: parse and build graph */
function _buildGraphFromGeoJSON(geojson) {
    const nodes = new Map();
    const bounds = L.latLngBounds([]);
    const displayFeatures = [];
    function nodeKey(lat, lng) {
        return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }
    function addNode(lat, lng) {
        const key = nodeKey(lat, lng);
        if (!nodes.has(key)) {
            nodes.set(key, { lat, lng, neighbors: new Map() });
        }
        bounds.extend([lat, lng]);
        return key;
    }
    function addEdge(aKey, bKey) {
        var _a, _b;
        if (aKey === bKey)
            return;
        const a = nodes.get(aKey);
        const b = nodes.get(bKey);
        const w = _haversine(a.lat, a.lng, b.lat, b.lng);
        a.neighbors.set(bKey, Math.min((_a = a.neighbors.get(bKey)) !== null && _a !== void 0 ? _a : Infinity, w));
        b.neighbors.set(aKey, Math.min((_b = b.neighbors.get(aKey)) !== null && _b !== void 0 ? _b : Infinity, w));
    }
    function shouldUseFeature(feat) {
        if (!feat || !feat.geometry)
            return false;
        const t = feat.geometry.type;
        if (t !== 'LineString' && t !== 'MultiLineString')
            return false;
        const p = (feat.properties || {});
        const tag = (p.highway || p.footway || p.path || p.sidewalk || p.cycleway || p.pedestrian || p.service || p.track || p.steps);
        if (p.power || p.fence_type || p.barrier)
            return false;
        if (typeof tag !== 'undefined')
            return true;
        return true;
    }
    function processLine(coords) {
        if (!coords || coords.length < 2)
            return;
        let prevKey = null;
        for (let i = 0; i < coords.length; i++) {
            const [lng, lat] = coords[i];
            const key = addNode(lat, lng);
            if (prevKey)
                addEdge(prevKey, key);
            prevKey = key;
        }
    }
    (geojson.features || []).forEach((feat) => {
        if (!shouldUseFeature(feat))
            return;
        const g = feat.geometry;
        if (g.type === 'LineString') {
            processLine(g.coordinates);
            displayFeatures.push(feat);
        }
        else if (g.type === 'MultiLineString') {
            for (const part of g.coordinates)
                processLine(part);
            displayFeatures.push(feat);
        }
    });
    return { nodes, bounds, displayFeatures };
}
/** _dijkstra: shortest path */
function _dijkstra(graph, startKey, endKey) {
    var _a, _b, _c;
    const dist = new Map();
    const prev = new Map();
    const visited = new Set();
    const pq = new _MinHeap();
    graph.nodes.forEach((_, k) => dist.set(k, Infinity));
    dist.set(startKey, 0);
    pq.push({ key: startKey, d: 0 });
    while (!pq.isEmpty()) {
        const { key: u } = pq.pop();
        if (visited.has(u))
            continue;
        visited.add(u);
        if (u === endKey)
            break;
        const uNode = graph.nodes.get(u);
        if (!uNode)
            continue;
        for (const [v, w] of uNode.neighbors) {
            if (visited.has(v))
                continue;
            const alt = ((_a = dist.get(u)) !== null && _a !== void 0 ? _a : Infinity) + w;
            if (alt < ((_b = dist.get(v)) !== null && _b !== void 0 ? _b : Infinity)) {
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
        if (u === startKey)
            break;
        u = prev.get(u);
    }
    return { path, distance: (_c = dist.get(endKey)) !== null && _c !== void 0 ? _c : Infinity };
}
/** Minimal binary min-heap for _dijkstra */
class _MinHeap {
    constructor() {
        this.a = [];
    }
    isEmpty() { return this.a.length === 0; }
    push(x) { this.a.push(x); this.bubbleUp(this.a.length - 1); }
    pop() {
        if (this.a.length === 1)
            return this.a.pop();
        const top = this.a[0];
        this.a[0] = this.a.pop();
        this.bubbleDown(0);
        return top;
    }
    bubbleUp(i) {
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.a[p].d <= this.a[i].d)
                break;
            [this.a[p], this.a[i]] = [this.a[i], this.a[p]];
            i = p;
        }
    }
    bubbleDown(i) {
        const n = this.a.length;
        while (true) {
            const l = 2 * i + 1, r = 2 * i + 2;
            let m = i;
            if (l < n && this.a[l].d < this.a[m].d)
                m = l;
            if (r < n && this.a[r].d < this.a[m].d)
                m = r;
            if (m === i)
                break;
            [this.a[m], this.a[i]] = [this.a[i], this.a[m]];
            i = m;
        }
    }
}
/** _findNearestNode: nearest by _haversine */
function _findNearestNode(lat, lng, graph) {
    let best = null;
    let bestD = Infinity;
    for (const [k, n] of graph.nodes) {
        const d = _haversine(lat, lng, n.lat, n.lng);
        if (d < bestD) {
            bestD = d;
            best = { key: k, lat: n.lat, lng: n.lng, d };
        }
    }
    return best;
}
/** _haversine: distance in meters */
function _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (x) => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.pow(Math.sin(dLon / 2), 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/** _formatMeters: pretty distance */
function _formatMeters(m) {
    if (m < 1000)
        return `${m.toFixed(0)} m`;
    return `${(m / 1000).toFixed(2)} km`;
}
// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initMap);
}
else {
    _initMap();
}
