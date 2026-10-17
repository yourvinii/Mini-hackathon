import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeftRight,
  Sliders,
  Layers,
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';

/**
 * BeforeAfterSlider
 * 
 * An interactive, touch-enabled before/after satellite image comparison slider.
 * Features:
 * - Fluid pointer drag on desktop & touch gestures on mobile devices.
 * - Change mask overlay toggle with opacity adjustments.
 * - Keyboard accessibility (Left/Right arrows, Home/End).
 * - Preset view buttons (100% T1, 50/50 Split, 100% T2).
 * - Fullscreen / expanded modal mode.
 * - Clean metadata badges for acquisition dates & sources.
 */
export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Earlier Baseline (T1)',
  afterLabel = 'Later Current (T2)',
  beforeDate,
  afterDate,
  beforeBadge,
  afterBadge,
  maskImage,
  showMask = false,
  onToggleMask,
  maskOpacity = 0.85,
  onMaskOpacityChange,
  className = ''
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [internalShowMask, setInternalShowMask] = useState(showMask);
  const [internalMaskOpacity, setInternalMaskOpacity] = useState(maskOpacity);
  const [isExpanded, setIsExpanded] = useState(false);

  const containerRef = useRef(null);

  // Synchronize internal mask state with props if provided
  const activeShowMask = onToggleMask !== undefined ? showMask : internalShowMask;
  const activeMaskOpacity = onMaskOpacityChange !== undefined ? maskOpacity : internalMaskOpacity;

  const handleMaskToggle = (newVal) => {
    if (onToggleMask) {
      onToggleMask(newVal);
    } else {
      setInternalShowMask(newVal);
    }
  };

  const handleOpacityChange = (newVal) => {
    if (onMaskOpacityChange) {
      onMaskOpacityChange(newVal);
    } else {
      setInternalMaskOpacity(newVal);
    }
  };

  // Update slider position based on clientX
  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(Math.round(percent * 10) / 10);
  }, []);

  // Pointer event handlers for unified mouse & touch drag
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Graceful fallback if setPointerCapture not supported
    }
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
  };

  // Keyboard accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - (e.shiftKey ? 10 : 2)));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + (e.shiftKey ? 10 : 2)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  const formattedBeforeDate = beforeDate
    ? new Date(beforeDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  const formattedAfterDate = afterDate
    ? new Date(afterDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  const sliderContent = (
    <div className="flex flex-col gap-3">
      {/* Top Toolbar / Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Preset Position Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            id="btn-slider-t1-only"
            onClick={() => setSliderPosition(100)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              sliderPosition === 100
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show 100% Earlier Baseline Scene"
          >
            T1 Baseline Only
          </button>
          <button
            type="button"
            id="btn-slider-split"
            onClick={() => setSliderPosition(50)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              sliderPosition === 50
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Split view 50% / 50%"
          >
            50% Split
          </button>
          <button
            type="button"
            id="btn-slider-t2-only"
            onClick={() => setSliderPosition(0)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              sliderPosition === 0
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show 100% Later Current Scene"
          >
            T2 Current Only
          </button>
        </div>

        {/* Change Mask Toggle & Opacity */}
        <div className="flex items-center gap-3">
          {maskImage ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <button
                type="button"
                id="btn-toggle-mask"
                onClick={() => handleMaskToggle(!activeShowMask)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
                  activeShowMask
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
                title="Toggle change detection mask overlay"
              >
                <Layers className="w-3.5 h-3.5 text-rose-600" />
                <span>Change Mask</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeShowMask ? 'bg-rose-600 animate-pulse' : 'bg-slate-300'
                  }`}
                />
              </button>

              {activeShowMask && (
                <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-slate-200 text-[11px] text-slate-500">
                  <span>Opacity</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={activeMaskOpacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                    title={`Mask opacity: ${Math.round(activeMaskOpacity * 100)}%`}
                  />
                  <span className="font-mono text-[10px] w-7">
                    {Math.round(activeMaskOpacity * 100)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-600 italic">No mask available</span>
          )}

          {/* Expand / Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
            title={isExpanded ? 'Exit expanded view' : 'Expand comparison studio'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Comparison Stage */}
      <div
        ref={containerRef}
        id="interactive-before-after-stage"
        tabIndex={0}
        role="slider"
        aria-label="Multi-temporal before/after satellite image comparison divider"
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full aspect-[16/10] sm:aspect-video rounded-xl overflow-hidden border border-slate-200/90 bg-slate-950 select-none shadow-sm cursor-ew-resize group focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Layer 1: Background - After Image (T2 Current / Post-Event) */}
        <img
          src={afterImage}
          alt={afterLabel}
          draggable="false"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />

        {/* Layer 2: Change Mask Overlay (Toggled via button) */}
        {activeShowMask && maskImage && (
          <img
            src={maskImage}
            alt="Change Detection Mask Overlay"
            draggable="false"
            style={{ opacity: activeMaskOpacity }}
            className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none select-none transition-opacity duration-150"
          />
        )}

        {/* Layer 3: Foreground - Before Image (T1 Baseline), Clipped by Divider Position */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none select-none"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
          }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            draggable="false"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />

          {/* T1 Baseline Floating Badge */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold shadow-md border border-white/10">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span>T1 BASELINE</span>
              {formattedBeforeDate && (
                <span className="text-slate-300 font-normal">({formattedBeforeDate})</span>
              )}
            </div>
            {beforeBadge && (
              <div className="hidden sm:block text-[10px] text-slate-300 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
                {beforeBadge}
              </div>
            )}
          </div>
        </div>

        {/* T2 Current Floating Badge (Always visible on the right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/85 backdrop-blur-md text-emerald-300 text-[11px] font-bold shadow-md border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>T2 CURRENT</span>
            {formattedAfterDate && (
              <span className="text-emerald-200/80 font-normal">({formattedAfterDate})</span>
            )}
          </div>
          {afterBadge && (
            <div className="hidden sm:block text-[10px] text-emerald-200 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
              {afterBadge}
            </div>
          )}
        </div>

        {/* Center Split Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl pointer-events-none transition-shadow"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Draggable Circular Handle Pill */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-2xl border-2 border-emerald-600 flex items-center justify-center text-emerald-900 transition-transform ${
              isDragging
                ? 'scale-115 ring-4 ring-emerald-500/40 shadow-emerald-950/50'
                : 'group-hover:scale-105'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
          </div>
        </div>

        {/* Bottom Status Ribbon */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-mono shadow-md border border-white/10 pointer-events-none flex items-center gap-2">
          <span className="text-slate-300">T1: {Math.round(sliderPosition)}%</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-300">T2: {Math.round(100 - sliderPosition)}%</span>
        </div>
      </div>

      {/* Accessible Range Input Bar & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Drag Divider:
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={sliderPosition}
            onChange={(e) => setSliderPosition(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-ew-resize accent-emerald-600"
            aria-label="Before/After divider position percentage"
          />
          <button
            type="button"
            onClick={() => setSliderPosition(50)}
            className="p-1 rounded text-slate-400 hover:text-slate-700"
            title="Reset to 50% split"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 self-end sm:self-auto">
          <span>💡 Click or drag anywhere on the image, or use keyboard arrow keys.</span>
        </div>
      </div>
    </div>
  );

  // Fullscreen expanded modal overlay
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 sm:p-8 flex flex-col justify-center animate-in fade-in duration-200">
        <div className="max-w-6xl w-full mx-auto bg-white rounded-2xl p-6 border border-slate-300 shadow-2xl flex flex-col max-h-[95vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-700" />
              Expanded Satellite Multi-Temporal Comparison Studio
            </h2>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Close Studio
            </button>
          </div>
          {sliderContent}
        </div>
      </div>
    );
  }

  return <div className={className}>{sliderContent}</div>;
}
