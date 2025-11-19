'use client'

import { useMemo, useRef, useState, useEffect } from "react";
import {
  LogOut,
  Bookmark,
  Route,
  Clock,
  Accessibility as A11yIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  GripVertical,
  BookOpenText,
  Settings,
  Contrast,
  Text,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MapRoutePage({ onBackToSplash }) {
  const [leftPct, setLeftPct] = useState(50);
  const [activeStep, setActiveStep] = useState(1);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [confirmRoute, setConfirmRoute] = useState(null);
  const [startInput, setStartInput] = useState("");
  const [destInput, setDestInput] = useState("");

  // bottom bar modals
  const [open, setOpen] = useState(null); // 'how', 'a11y', 'settings'

  // shared a11y prefs
  const [highContrast, setHighContrast] = useState(false);
  const [textScale, setTextScale] = useState(1);

  const containerRef = useRef(null);

  const brand = useMemo(
    () => ({ gold: "#FFCB05", black: "#000000", ink: "#111111" }),
    []
  );

  // load/persist prefs
  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem("letsleave:prefs") || "{}");
    if (typeof prefs.highContrast === "boolean") setHighContrast(prefs.highContrast);
    if (typeof prefs.textScale === "number") setTextScale(prefs.textScale);
  }, []);
  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem("letsleave:prefs") || "{}");
    localStorage.setItem(
      "letsleave:prefs",
      JSON.stringify({ ...prefs, highContrast, textScale })
    );
  }, [highContrast, textScale]);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const fullyCollapseLeft = () => setLeftPct(0);
  const fullyCollapseRight = () => setLeftPct(100);
  const resetSplit = () => setLeftPct(50);

  const startDrag = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const startLeft = leftPct;

    const onMove = (ev) => {
      const clientX = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0;
      const delta = ((clientX - startX) / rect.width) * 100;
      setLeftPct((_) => clamp(startLeft + delta, 0, 100));
    };

    const stop = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", stop);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", stop);
  };

  const steps = [
    { id: 1, text: "Start at Commons Lot" },
    { id: 2, text: "Head north on Center Rd" },
    { id: 3, text: "Turn right toward ILSB ramp" },
    { id: 4, text: "Take elevator to Level 2" },
    { id: 5, text: "Exit to Quad" },
    { id: 6, text: "Arrive at Engineering Building" },
  ];

  const savedRoutesList = [
    { id: "rt1", name: "Commons → ENG", start: "Commons Lot", dest: "Engineering Building" },
    { id: "rt2", name: "Parking → Library", start: "Lot 22 Parking", dest: "AOK Library" },
    { id: "rt3", name: "The Quad → CMSC446", start: "Main Quad", dest: "ITE 106" },
    { id: "rt4", name: "return home", start: "your location", dest: "Chesapeake Hall 205" },
  ];

  // close with ESC (both saved routes + confirm)
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        setConfirmRoute(null);
        setShowSavedRoutes(false);
        setOpen(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const pillPosStyle = useMemo(() => {
    if (leftPct <= 6) return { left: 16, transform: "translateY(-50%)" };
    if (leftPct >= 94) return { right: 16, transform: "translateY(-50%)" };
    return { left: "50%", transform: "translate(-50%, -50%)" };
  }, [leftPct]);

  const loadConfirmedRoute = () => {
    if (!confirmRoute) return;
    setStartInput(confirmRoute.start);
    setDestInput(confirmRoute.dest);
    setConfirmRoute(null);
    setShowSavedRoutes(false);
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        background: brand.gold,
        fontSize: `calc(16px * ${textScale})`,
        filter: highContrast ? "contrast(1.12) saturate(1.05)" : undefined,
      }}
    >
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-6 py-3" style={{ background: brand.black }}>
        <div className="flex gap-3 w-full max-w-[700px]">
          <input
            type="text"
            placeholder="Start location"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 bg-white focus:outline-none"
          />
          <input
            type="text"
            placeholder="Destination"
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setShowSavedRoutes(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold border"
            style={{ background: brand.black, color: brand.gold, borderColor: "#2b2b2b" }}
          >
            <Bookmark className="h-4 w-4" /> Saved routes
          </button>
          <button
            onClick={onBackToSplash}
            aria-label="Logout"
            className="rounded-full p-2 border border-gray-600 hover:bg-white/10"
            style={{ color: brand.gold }}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* MAIN SPLIT */}
      <div
        ref={containerRef}
        className="relative flex-1 grid overflow-hidden"
        style={{ gridTemplateColumns: `${leftPct}% 12px ${100 - leftPct}%` }}
      >
        {/* LEFT — map stand-in */}
        <div className="relative overflow-hidden z-0">
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: "url(/assets/campus-map.png)" }}
            aria-label="Example campus map"
          />
        </div>

        {/* DIVIDER */}
        <div
          className="relative cursor-col-resize select-none z-[60]"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          onDoubleClick={resetSplit}
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/60 rounded" />
          <div className="group absolute top-1/2 -translate-y-1/2" style={pillPosStyle}>
            <div
              className="
                flex items-center gap-2 border shadow-xl rounded-full overflow-hidden
                transition-all duration-200
                w-11 group-hover:w-[176px] h-11 relative z-[5]
              "
              style={{ background: brand.gold, borderColor: "#8c6a00", borderWidth: 2 }}
            >
              <div className="h-11 w-11 grid place-items-center shrink-0">
                <GripVertical className="h-6 w-6 text-black/70" />
              </div>
              <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  onClick={(e) => { e.stopPropagation(); fullyCollapseLeft(); }}
                  aria-label="Collapse map"
                  title="Collapse map"
                  className="p-2 rounded-full hover:bg-black/10"
                >
                  <ChevronLeft className="h-4 w-4 text-black" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); resetSplit(); }}
                  aria-label="Reset split"
                  title="Reset"
                  className="p-2 rounded-full hover:bg-black/10"
                >
                  <RotateCcw className="h-4 w-4 text-black" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); fullyCollapseRight(); }}
                  aria-label="Collapse directions"
                  title="Collapse directions"
                  className="p-2 rounded-full hover:bg-black/10"
                >
                  <ChevronRight className="h-4 w-4 text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — directions */}
        <div className="relative overflow-hidden z-0 flex items-center justify-center" style={{ background: "#0f172a" }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex flex-col w-[94%] max-w-[1200px] h-full"
          >
            <div className="sticky top-0 px-4 pt-5 pb-3 bg-black/50 shadow rounded-t-xl">
              <div className="w-full rounded-xl border border-white/10 shadow bg-black/85 text-white px-4 py-3 flex items-center gap-3">
                <Route className="h-4 w-4" />
                <span className="font-semibold">Example route</span>
                <span className="ml-auto inline-flex items-center gap-3 text-xs opacity-90">
                  <Clock className="h-3.5 w-3.5" /> ~ 12 min
                  <A11yIcon className="h-3.5 w-3.5" /> step-free
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-4 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {steps.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveStep(s.id)}
                    className={`text-left rounded-xl shadow-sm p-4 transition border ${
                      activeStep === s.id
                        ? "bg-white/15 border-white/40"
                        : "bg-white/10 border-white/20 hover:bg-white/15"
                    }`}
                    style={{ color: "rgba(255,255,255,0.92)" }}
                  >
                    {idx + 1}. {s.text}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* FOOTER with working buttons */}
      <footer className="flex-none w-full px-6 py-3 text-white" style={{ background: brand.ink }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <button onClick={() => setOpen("how")} className="hover:underline inline-flex items-center gap-2">
              <BookOpenText className="h-4 w-4" /> How it works
            </button>
            <button onClick={() => setOpen("a11y")} className="hover:underline inline-flex items-center gap-2">
              <A11yIcon className="h-4 w-4" /> Accessibility
            </button>
            <button onClick={() => setOpen("settings")} className="hover:underline inline-flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </button>
          </div>
          <div className="text-sm opacity-60">© {new Date().getFullYear()} Let’s Leave</div>
        </div>
      </footer>

      {/* SAVED ROUTES + CONFIRM */}
      <AnimatePresence>
        {showSavedRoutes && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
              onClick={() => { setShowSavedRoutes(false); setConfirmRoute(null); }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed z-[100] rounded-2xl shadow-xl p-6 w-[92vw] max-w-[420px] border-2 text-white"
              style={{
                background: brand.black,
                borderColor: brand.gold,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Saved Routes</h2>
                <button onClick={() => { setShowSavedRoutes(false); setConfirmRoute(null); }} className="hover:opacity-80">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                {savedRoutesList.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setConfirmRoute(r)}
                    className="w-full text-left p-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition"
                  >
                    {r.name}
                    <div className="text-xs opacity-70 mt-1">
                      Start: {r.start} • Destination: {r.dest}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence>
              {confirmRoute && (
                <>
                  <motion.div
                    className="fixed inset-0 z-[110]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                  <motion.div
                    className="fixed z-[120] rounded-xl shadow-xl p-5 w-[92vw] max-w-[420px] border text-white"
                    style={{
                      background: "#0b0b0b",
                      borderColor: brand.gold,
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                    initial={{ opacity: 0, scale: 0.9, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 6 }}
                  >
                    <div className="mb-4">
                      <div className="font-semibold mb-1">Load this route?</div>
                      <div className="text-sm opacity-90">{confirmRoute.name}</div>
                      <div className="text-xs opacity-70 mt-1">
                        Start: {confirmRoute.start} • Destination: {confirmRoute.dest}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmRoute(null)}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={loadConfirmedRoute}
                        className="px-3 py-2 rounded-lg font-semibold"
                        style={{ background: brand.gold, color: "#111" }}
                      >
                        Load
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>

      {/* BOTTOM BAR MODALS */}
      <AnimatePresence>
        {open === "how" && (
          <Modal onClose={() => setOpen(null)} title="How it works">
            <ul className="list-disc pl-5 space-y-2">
              <li>Drag the center handle to resize map vs. directions.</li>
              <li>Use ◄ ► on the handle to snap either side closed.</li>
              <li>Enter Start/Destination at the top; saved routes can auto-fill.</li>
              <li>Adjust text size and contrast for accessibility anytime.</li>
              <li>
                <strong>Tip:</strong> Add a <em>room number after a building</em> (e.g., “Engineering 236”)
                and we’ll route you to the <strong>correct floor</strong> of that building.
              </li>
            </ul>
          </Modal>
        )}
        {open === "a11y" && (
          <Modal onClose={() => setOpen(null)} title="Accessibility">
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2">
                  <Contrast className="h-4 w-4" /> High contrast
                </span>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                />
              </label>

              <div>
                <div className="mb-2 inline-flex items-center gap-2">
                  <Text className="h-4 w-4" /> Text size
                </div>
                <div className="flex gap-2">
                  {[1, 1.1, 1.25].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTextScale(s)}
                      className={`px-3 py-2 rounded-lg border ${
                        textScale === s
                          ? "bg-white text-black"
                          : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                      }`}
                    >
                      {s === 1 ? "100%" : s === 1.1 ? "110%" : "125%"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}
        {open === "settings" && (
          <Modal onClose={() => setOpen(null)} title="Settings">
            <div className="space-y-3">
              <button
                onClick={resetSplit}
                className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20"
              >
                Reset panel split
              </button>
              <button
                onClick={() => { setStartInput(""); setDestInput(""); }}
                className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20"
              >
                Clear start/destination
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("letsleave:prefs");
                  setHighContrast(false);
                  setTextScale(1);
                }}
                className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20"
              >
                Reset accessibility preferences
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Reusable modal */
function Modal({ title, children, onClose }) {
  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="fixed z-[100] rounded-2xl shadow-xl p-6 w-[92vw] max-w-[560px] border-2 text-white"
        style={{
          background: "#0b0b0b",
          borderColor: "#FFCB05",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="hover:opacity-80">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  );
}
