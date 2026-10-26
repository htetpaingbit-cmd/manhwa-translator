"use client";
import { useState, useEffect, useRef } from "react";
import { Move, Paintbrush, Stamp, Type, Sliders, Upload, CheckSquare, Square, Undo2, Pencil, Eraser, Sparkles, Loader2, Plus, Pipette, Palette, Baseline, Compass, Disc, Image as ImageIcon, Copy, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

export default function FloatingToolbox({
  activeTool,
  setActiveTool,
  isBrushEnabled,
  setIsBrushEnabled,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  activeBox,
  updateActiveBox,
  onAddNewTextBox,
  onAddImageLogo,
  onDuplicateBox,
  customFonts,
  onFontUpload,
  onUndo,
  removeBrushMode,
  setRemoveBrushMode,
  removeBrushSize,
  setRemoveBrushSize,
  onExecuteRemove,
  isProcessingRemove,
}) {
  const [position, setPosition] = useState({ x: 30, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });

  const [activeTextSubTab, setActiveTextSubTab] = useState("color");

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY,
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const pickColorFromScreen = async (field) => {
    if (window.EyeDropper) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        updateActiveBox(field, result.sRGBHex);
      } catch (e) {}
    } else {
      alert("Eyedropper is not supported in this browser");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => onAddImageLogo(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px`, minWidth: "320px", minHeight: "280px" }}
      className="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none"
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className="bg-slate-800/95 px-4 py-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-slate-700"
      >
        <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" /> Studio Tools
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-[11px] text-slate-200 transition"
          >
            <Undo2 className="w-3 h-3 text-amber-400" /> Undo
          </button>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Move className="w-3.5 h-3.5" /> Drag
          </div>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="grid grid-cols-3 bg-slate-800/50 p-1 gap-1 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTool("brush");
            setIsBrushEnabled(true);
          }}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
            activeTool === "brush" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5" /> Brush
        </button>
        <button
          onClick={() => {
            setActiveTool("remove");
            setIsBrushEnabled(false);
          }}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
            activeTool === "remove" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Stamp className="w-3.5 h-3.5" /> AI Inpaint
        </button>
        <button
          onClick={() => {
            setActiveTool("text");
            setIsBrushEnabled(false);
          }}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
            activeTool === "text" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Type className="w-3.5 h-3.5" /> Studio Layer
        </button>
      </div>

      {/* Panel Contents */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto text-xs scrollbar-thin">
        {/* BRUSH */}
        {activeTool === "brush" && (
          <div className="space-y-3">
            <div
              onClick={() => setIsBrushEnabled(!isBrushEnabled)}
              className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition ${
                isBrushEnabled ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold" : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {isBrushEnabled ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                <span>Brush Enabled (Active)</span>
              </div>
              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-white font-mono">[B]</span>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setBrushColor("#FFFFFF")} className="w-7 h-7 rounded-full bg-white border-2 border-slate-500" />
              <button onClick={() => setBrushColor("#000000")} className="w-7 h-7 rounded-full bg-black border-2 border-slate-500" />
              <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0" />
              <span className="text-[11px] text-slate-400 ml-auto">{brushColor}</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Brush Size</span>
                <span>{brushSize}px</span>
              </div>
              <input type="range" min="4" max="120" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-full accent-blue-500" />
            </div>
          </div>
        )}

        {/* AI INPAINT */}
        {activeTool === "remove" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setRemoveBrushMode("pencil")}
                className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                  removeBrushMode === "pencil" ? "bg-red-500 text-white" : "text-slate-400"
                }`}
              >
                <Pencil className="w-4 h-4" /> Pencil (Select)
              </button>
              <button
                onClick={() => setRemoveBrushMode("eraser")}
                className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                  removeBrushMode === "eraser" ? "bg-cyan-500 text-white" : "text-slate-400"
                }`}
              >
                <Eraser className="w-4 h-4" /> Eraser
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>{removeBrushMode === "pencil" ? "Pencil Size" : "Eraser Size"}</span>
                <span>{removeBrushSize}px</span>
              </div>
              <input type="range" min="5" max="80" value={removeBrushSize} onChange={(e) => setRemoveBrushSize(parseInt(e.target.value, 10))} className="w-full accent-cyan-400" />
            </div>

            <button
              onClick={onExecuteRemove}
              disabled={isProcessingRemove}
              className="w-full py-2.5 bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-black rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              {isProcessingRemove ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>REMOVE TEXT</span>
            </button>
          </div>
        )}

        {/* TEXT & LOGO STUDIO */}
        {activeTool === "text" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={onAddNewTextBox}
                className="py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1 text-[11px] active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Text [T]
              </button>

              <button
                onClick={() => activeBox && onDuplicateBox(activeBox)}
                disabled={!activeBox}
                className="py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1 text-[11px] active:scale-95 disabled:opacity-40"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>

              <label className="py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1 text-[11px] cursor-pointer active:scale-95">
                <ImageIcon className="w-3.5 h-3.5" /> + Photo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>

            {activeBox ? (
              <div className="space-y-3">
                <div className="flex items-center justify-around bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                  {activeBox.type !== "image" && (
                    <button
                      onClick={() => setActiveTextSubTab("font")}
                      className={`p-2 rounded-lg transition ${activeTextSubTab === "font" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                      title="Font & Rotation"
                    >
                      <Baseline className="w-4 h-4" />
                    </button>
                  )}
                  {activeBox.type !== "image" && (
                    <button
                      onClick={() => setActiveTextSubTab("color")}
                      className={`p-2 rounded-lg transition ${activeTextSubTab === "color" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                      title="Color & Stroke"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                  )}
                  {activeBox.type !== "image" && (
                    <button
                      onClick={() => setActiveTextSubTab("spacing")}
                      className={`p-2 rounded-lg transition ${activeTextSubTab === "spacing" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                      title="Spacing & Alignment"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTextSubTab("perspective")}
                    className={`p-2 rounded-lg transition ${activeTextSubTab === "perspective" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                    title="Perspective Mode"
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                  {activeBox.type !== "image" && (
                    <button
                      onClick={() => setActiveTextSubTab("shadow")}
                      className={`p-2 rounded-lg transition ${activeTextSubTab === "shadow" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
                      title="Shadow"
                    >
                      <Disc className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* SUB-PANEL: FONT */}
                {activeTextSubTab === "font" && activeBox.type !== "image" && (
                  <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Font Family</span>
                      <label className="text-[11px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Upload Font
                        <input type="file" accept=".ttf,.otf,.woff" onChange={onFontUpload} className="hidden" />
                      </label>
                    </div>
                    <select
                      value={activeBox.fontFamily}
                      onChange={(e) => updateActiveBox("fontFamily", e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white outline-none"
                    >
                      <option value="Padauk">Padauk (Myanmar Unicode)</option>
                      <option value="Impact">Impact (Comic Bold)</option>
                      <option value="Arial">Arial</option>
                      {customFonts.map((f, i) => (
                        <option key={i} value={f}>{f} (Custom)</option>
                      ))}
                    </select>

                    <div className="space-y-1 pt-1 border-t border-slate-700">
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span>Rotation</span>
                        <span>{activeBox.rotation || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={activeBox.rotation || 0}
                        onChange={(e) => updateActiveBox("rotation", parseInt(e.target.value, 10))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* SUB-PANEL: COLOR & STROKE */}
                {activeTextSubTab === "color" && activeBox.type !== "image" && (
                  <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-slate-400">Color</label>
                          <button onClick={() => pickColorFromScreen("textColor")} className="text-cyan-400">
                            <Pipette className="w-3 h-3" />
                          </button>
                        </div>
                        <input type="color" value={activeBox.textColor} onChange={(e) => updateActiveBox("textColor", e.target.value)} className="w-full h-8 rounded bg-slate-800 border border-slate-700 cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-slate-400">Stroke Color</label>
                          <button onClick={() => pickColorFromScreen("strokeColor")} className="text-cyan-400">
                            <Pipette className="w-3 h-3" />
                          </button>
                        </div>
                        <input type="color" value={activeBox.strokeColor} onChange={(e) => updateActiveBox("strokeColor", e.target.value)} className="w-full h-8 rounded bg-slate-800 border border-slate-700 cursor-pointer" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Stroke Amount</span>
                        <span>{activeBox.strokeWidth}px</span>
                      </div>
                      <input type="range" min="0" max="8" value={activeBox.strokeWidth} onChange={(e) => updateActiveBox("strokeWidth", parseInt(e.target.value, 10))} className="w-full accent-cyan-400" />
                    </div>
                  </div>
                )}

                {/* SUB-PANEL: SPACING & ALIGNMENT */}
                {activeTextSubTab === "spacing" && activeBox.type !== "image" && (
                  <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
                    {/* Text Alignment (Left, Center, Right) */}
                    <div>
                      <span className="text-slate-400 block mb-1.5 text-[11px]">Text Alignment</span>
                      <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                          onClick={() => updateActiveBox("textAlign", "left")}
                          className={`py-1.5 flex items-center justify-center rounded-lg transition ${
                            (activeBox.textAlign || "center") === "left" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                          }`}
                          title="Align Left"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateActiveBox("textAlign", "center")}
                          className={`py-1.5 flex items-center justify-center rounded-lg transition ${
                            (activeBox.textAlign || "center") === "center" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                          }`}
                          title="Align Center (Default)"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateActiveBox("textAlign", "right")}
                          className={`py-1.5 flex items-center justify-center rounded-lg transition ${
                            (activeBox.textAlign || "center") === "right" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                          }`}
                          title="Align Right"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span>Character Spacing</span>
                        <span>{activeBox.letterSpacing || 0}px</span>
                      </div>
                      <input type="range" min="-2" max="15" value={activeBox.letterSpacing || 0} onChange={(e) => updateActiveBox("letterSpacing", parseInt(e.target.value, 10))} className="w-full accent-cyan-400" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span>Line Spacing</span>
                        <span>{activeBox.lineHeight || 1.3}</span>
                      </div>
                      <input type="range" min="0.8" max="2.5" step="0.1" value={activeBox.lineHeight || 1.3} onChange={(e) => updateActiveBox("lineHeight", parseFloat(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                  </div>
                )}

                {/* SUB-PANEL: PERSPECTIVE */}
                {activeTextSubTab === "perspective" && (
                  <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
                    <div
                      onClick={() => updateActiveBox("isPerspectiveEnabled", !activeBox.isPerspectiveEnabled)}
                      className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition ${
                        activeBox.isPerspectiveEnabled
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      <span className="text-xs">4-Point Perspective Mode</span>
                      {activeBox.isPerspectiveEnabled ? (
                        <span className="text-xs text-cyan-400 font-bold">ON</span>
                      ) : (
                        <span className="text-xs text-slate-500 font-bold">OFF (Default)</span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      💡 Perspective Mode ဖွင့်ထားချိန်တွင် ထောင့် ၄ ခုရှိ အစက်များကို ဆွဲ၍ လွတ်လပ်စွာစောင်းနိုင်ပါသည်။ တစ်ထောင့်ကို ဆွဲရွှေ့ပါက အခြားထောင့်များ လုံးဝမလှုပ်တော့ပါ။
                    </p>
                  </div>
                )}

                {/* SUB-PANEL: SHADOW */}
                {activeTextSubTab === "shadow" && activeBox.type !== "image" && (
                  <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold">
                        <input type="checkbox" checked={activeBox.hasShadow} onChange={(e) => updateActiveBox("hasShadow", e.target.checked)} className="rounded text-cyan-400" />
                        Enable Shadow
                      </label>
                      {activeBox.hasShadow && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => pickColorFromScreen("shadowColor")} className="text-cyan-400">
                            <Pipette className="w-3 h-3" />
                          </button>
                          <input type="color" value={activeBox.shadowColor} onChange={(e) => updateActiveBox("shadowColor", e.target.value)} className="w-5 h-5 rounded bg-transparent border-0 cursor-pointer" />
                        </div>
                      )}
                    </div>

                    {activeBox.hasShadow && (
                      <div className="space-y-2 pt-1 border-t border-slate-700 text-[10px] text-slate-300">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-cyan-400 font-bold">Shadow Blur:</span>
                            <span>{activeBox.shadowBlur || 6}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="25"
                            value={activeBox.shadowBlur || 6}
                            onChange={(e) => updateActiveBox("shadowBlur", parseInt(e.target.value, 10))}
                            className="w-full accent-cyan-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-400">
                          <div>
                            <span>Position X: {activeBox.shadowOffsetX}px</span>
                            <input type="range" min="-15" max="15" value={activeBox.shadowOffsetX} onChange={(e) => updateActiveBox("shadowOffsetX", parseInt(e.target.value, 10))} className="w-full accent-cyan-400" />
                          </div>
                          <div>
                            <span>Position Y: {activeBox.shadowOffsetY}px</span>
                            <input type="range" min="-15" max="15" value={activeBox.shadowOffsetY} onChange={(e) => updateActiveBox("shadowOffsetY", parseInt(e.target.value, 10))} className="w-full accent-cyan-400" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4 text-xs">
                Click on a Text or Logo Box to customize
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}