"use client";
import { useState, useRef, useEffect } from "react";
import { Menu, X, UploadCloud, RefreshCw, BookOpen, Loader2, Download, Keyboard, Edit3, ArrowLeft } from "lucide-react";
import CanvasEditor from "../components/CanvasEditor";
import FloatingToolbox from "../components/FloatingToolbox";
import jsPDF from "jspdf";

export default function Home() {
  const [pages, setPages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // View Mode
  const [viewMode, setViewMode] = useState("reader");
  const [editingPageIndex, setEditingPageIndex] = useState(0);

  // Brush States
  const [activeTool, setActiveTool] = useState("brush");
  const [isBrushEnabled, setIsBrushEnabled] = useState(true);
  const [brushColor, setBrushColor] = useState("#FFFFFF");
  const [brushSize, setBrushSize] = useState(40);
  const [brushOpacity, setBrushOpacity] = useState(1);

  // Inpaint States
  const [removeBrushMode, setRemoveBrushMode] = useState("pencil");
  const [removeBrushSize, setRemoveBrushSize] = useState(30);
  const [isProcessingRemove, setIsProcessingRemove] = useState(false);

  // Text Boxes State
  const [textBoxes, setTextBoxes] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);

  // Custom Fonts
  const [customFonts, setCustomFonts] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("saved_custom_fonts");
    if (saved) {
      setCustomFonts(JSON.parse(saved));
    }
  }, []);

  const [undoCount, setUndoCount] = useState(0);
  const canvasRef = useRef(null);

  const activeBox = textBoxes.find((b) => b.id === activeTextId) || null;

  const updateActiveBox = (field, value) => {
    if (!activeTextId) return;
    setTextBoxes((prev) =>
      prev.map((b) => (b.id === activeTextId ? { ...b, [field]: value } : b))
    );
  };

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setUndoCount((prev) => prev + 1);
        return;
      }

      if (e.key.toLowerCase() === "b") {
        setActiveTool("brush");
        setIsBrushEnabled((prev) => !prev);
      } else if (e.key.toLowerCase() === "t") {
        setActiveTool("text");
        setIsBrushEnabled(false);
        handleAddNewTextBox();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [textBoxes]);

  const triggerUndo = () => {
    setUndoCount((prev) => prev + 1);
  };

  // PDF Upload
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") return;

    setLoading(true);
    setProgress(0);
    setPages([]);

    try {
      const pdfjsLib = await import("pdfjs-dist/build/pdf");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);

      const loadedPages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        loadedPages.push(canvas.toDataURL("image/jpeg", 0.95));
        setProgress(i);
      }
      setPages(loadedPages);
      setViewMode("reader");
    } catch (err) {
      alert("Failed to read PDF: " + err.message);
    }
    setLoading(false);
  };

  const startEditingPage = (idx) => {
    setEditingPageIndex(idx);
    setViewMode("editor");
    setIsBrushEnabled(true);
    setTextBoxes([]);
    setActiveTextId(null);
  };

  // Save Page and return to Reader (Perspective Transform နှင့် Alignment အပြည့်အစုံ ရေးဆွဲသည်)
  const saveAndBackToReader = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      textBoxes.forEach((box) => {
        ctx.save();

        const pins = box.pins || { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, br: { x: 0, y: 0 }, bl: { x: 0, y: 0 } };
        const offsetX = (pins.tl.x + pins.tr.x + pins.bl.x + pins.br.x) / 4;
        const offsetY = (pins.tl.y + pins.tr.y + pins.bl.y + pins.br.y) / 4;

        // Center Point သို့ ရွှေ့မည်
        ctx.translate(box.x + offsetX + (box.width ? box.width / 2 : 50), box.y + offsetY + (box.height ? box.height / 2 : 25));

        if (box.rotation) {
          ctx.rotate((box.rotation * Math.PI) / 180);
        }

        // Perspective Skew ပါဝင်ပါက ပုံပေါ်သို့ ကွက်တိထည့်သွင်းခြင်း
        if (box.isPerspectiveEnabled) {
          const skewX = ((pins.tr.x - pins.tl.x + pins.br.x - pins.bl.x) * 0.1 * Math.PI) / 180;
          const skewY = ((pins.bl.y - pins.tl.y + pins.br.y - pins.tr.y) * 0.1 * Math.PI) / 180;
          ctx.transform(1, Math.tan(skewY), Math.tan(skewX), 1, 0, 0);
        }

        if (box.type === "image" && box.imgSrc) {
          const stImg = new Image();
          stImg.src = box.imgSrc;
          ctx.drawImage(stImg, -box.width / 2, -box.height / 2, box.width, box.height);
        } else {
          ctx.font = `bold ${box.fontSize}px ${box.fontFamily}, Padauk, sans-serif`;
          ctx.textAlign = box.textAlign || "center";
          ctx.textBaseline = "middle";

          const lines = box.text.split("\n");
          const lineSpacingPx = box.fontSize * (box.lineHeight || 1.3);
          const totalHeight = lines.length * lineSpacingPx;
          let startY = -(totalHeight / 2) + lineSpacingPx / 2;

          lines.forEach((line) => {
            if (box.strokeWidth > 0) {
              ctx.lineWidth = box.strokeWidth * 2;
              ctx.strokeStyle = box.strokeColor;
              ctx.strokeText(line, 0, startY);
            }

            if (box.hasShadow) {
              ctx.shadowColor = box.shadowColor;
              ctx.shadowBlur = box.shadowBlur || 6;
              ctx.shadowOffsetX = box.shadowOffsetX;
              ctx.shadowOffsetY = box.shadowOffsetY;
            }

            ctx.fillStyle = box.textColor;
            ctx.fillText(line, 0, startY);

            startY += lineSpacingPx;
          });
        }

        ctx.restore();
      });

      const updatedImg = canvas.toDataURL("image/jpeg", 0.95);
      setPages((prev) => {
        const newPages = [...prev];
        newPages[editingPageIndex] = updatedImg;
        return newPages;
      });
    }
    setViewMode("reader");
  };

  // Default New Text Box (Default Alignment: Center)
  const handleAddNewTextBox = () => {
    const newId = Date.now();
    const newBox = {
      id: newId,
      type: "text",
      text: "စာရိုက်ပါ",
      x: 230,
      y: 180,
      width: 140,
      height: 60,
      fontFamily: "Padauk",
      fontSize: 24,
      textColor: "#000000",
      strokeColor: "#FFFFFF",
      strokeWidth: 0,
      textAlign: "center", // Default အနေဖြင့် အလယ်မှာ စာထားမည်
      letterSpacing: 0,
      lineHeight: 1.3,
      hasShadow: false,
      shadowColor: "#000000",
      shadowOffsetX: 3,
      shadowOffsetY: 3,
      shadowBlur: 6,
      rotation: 0,
      isPerspectiveEnabled: false,
      pins: {
        tl: { x: 0, y: 0 },
        tr: { x: 0, y: 0 },
        br: { x: 0, y: 0 },
        bl: { x: 0, y: 0 },
      },
      isFlippedX: false,
      isFlippedY: false,
      blendMode: "normal",
    };
    setTextBoxes((prev) => [...prev, newBox]);
    setActiveTextId(newId);
  };

  const handleAddImageLogo = (imgDataUrl) => {
    const newId = Date.now();
    const newImgBox = {
      id: newId,
      type: "image",
      imgSrc: imgDataUrl,
      x: 250,
      y: 200,
      width: 180,
      height: 180,
      rotation: 0,
      isPerspectiveEnabled: false,
      pins: {
        tl: { x: 0, y: 0 },
        tr: { x: 0, y: 0 },
        br: { x: 0, y: 0 },
        bl: { x: 0, y: 0 },
      },
      isFlippedX: false,
      isFlippedY: false,
      blendMode: "normal",
    };
    setTextBoxes((prev) => [...prev, newImgBox]);
    setActiveTextId(newId);
  };

  const handleDuplicateBox = (box) => {
    if (!box) return;
    const newId = Date.now();
    const duplicatedBox = {
      ...box,
      id: newId,
      x: box.x + 30,
      y: box.y + 30,
    };
    setTextBoxes((prev) => [...prev, duplicatedBox]);
    setActiveTextId(newId);
  };

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fontName = file.name.split(".")[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const newFont = new FontFace(fontName, event.target.result);
      newFont.load().then((loadedFont) => {
        document.fonts.add(loadedFont);
        const updated = [...customFonts, fontName];
        setCustomFonts(updated);
        localStorage.setItem("saved_custom_fonts", JSON.stringify(updated));
        updateActiveBox("fontFamily", fontName);
        alert(`Font "${fontName}" uploaded successfully!`);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteRemove = () => {
    if (canvasRef.current && canvasRef.current.executeRemove) {
      canvasRef.current.executeRemove();
    }
  };

  const exportPDF = async () => {
    if (pages.length === 0) return;
    const pdf = new jsPDF("p", "pt", "a4");

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(pages[i], "JPEG", 0, 0, pdfWidth, pdfHeight);
    }
    pdf.save("manhwa-translated-final.pdf");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Header Bar */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-4 py-2.5 flex justify-between items-center z-40">
        <div className="flex items-center space-x-3">
          {pages.length > 0 && viewMode === "reader" && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition text-slate-200"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {viewMode === "editor" && (
            <button
              onClick={saveAndBackToReader}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow transition"
            >
              <ArrowLeft className="w-4 h-4" /> Save & Back to Reader
            </button>
          )}

          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h1 className="text-sm md:text-base font-bold text-slate-100">
              {viewMode === "editor" ? `Editing Page ${editingPageIndex + 1}` : "Manhwa Studio"}
            </h1>
          </div>
        </div>

        {pages.length > 0 && (
          <div className="flex items-center gap-2">
            {viewMode === "editor" && (
              <div className="hidden lg:flex items-center gap-2 bg-neutral-800 border border-neutral-700 px-3 py-1 rounded-lg text-[11px] text-slate-400">
                <Keyboard className="w-3.5 h-3.5 text-blue-400" />
                <span>[T] Text Box | [B] Brush | [Ctrl+Z] Undo</span>
              </div>
            )}

            <button
              onClick={exportPDF}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow transition"
            >
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button
              onClick={() => { setPages([]); setViewMode("reader"); }}
              className="bg-neutral-800 hover:bg-neutral-700 text-xs px-3 py-1.5 rounded-lg text-slate-200 transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Upload New
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex relative overflow-hidden">
        {pages.length === 0 ? (
          <div className="flex-1 flex justify-center items-center p-4">
            <div className="w-full max-w-lg p-8 border-2 border-dashed border-neutral-700 bg-neutral-900/90 rounded-3xl text-center shadow-xl">
              <UploadCloud className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-white mb-1">Select Manhwa PDF File</h3>
              <p className="text-xs text-neutral-400 mb-6">Complete Translation Studio with Text & Photo/Logo Perspective</p>

              {loading ? (
                <div className="flex flex-col items-center gap-2 text-blue-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-semibold">Loading Pages... ({progress} / {totalPages})</span>
                </div>
              ) : (
                <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow transition inline-block text-sm">
                  Choose File
                  <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Sidebar */}
            <div
              className={`absolute z-30 top-0 left-0 h-full w-56 bg-neutral-900 border-r border-neutral-800 transition-all duration-300 flex flex-col ${
                isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
              }`}
            >
              <div className="p-3 border-b border-neutral-800 text-xs font-bold text-neutral-400 flex justify-between items-center">
                <span>Pages ({pages.length})</span>
                <button onClick={() => setIsSidebarOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                {pages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (viewMode === "editor") saveAndBackToReader();
                      startEditingPage(idx);
                      setIsSidebarOpen(false);
                    }}
                    className={`cursor-pointer rounded-md overflow-hidden border-2 transition ${
                      editingPageIndex === idx && viewMode === "editor" ? "border-blue-500 shadow-md" : "border-neutral-700 hover:border-slate-500"
                    }`}
                  >
                    <img src={img} alt={`Page ${idx + 1}`} className="w-full h-28 object-cover" />
                    <div className="text-[10px] text-center bg-neutral-800 text-slate-300 py-0.5">
                      Page {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reader View */}
            {viewMode === "reader" && (
              <div className="flex-1 h-[calc(100vh-50px)] overflow-y-auto flex flex-col items-center bg-black px-2 py-4 scrollbar-thin">
                <div className="w-full max-w-2xl space-y-4">
                  {pages.map((pageSrc, index) => (
                    <div key={index} className="relative group shadow-2xl rounded-lg overflow-hidden border border-neutral-800">
                      <img src={pageSrc} alt={`Page ${index + 1}`} className="w-full h-auto block" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          onClick={() => startEditingPage(index)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm scale-95 group-hover:scale-100 transition transform"
                        >
                          <Edit3 className="w-5 h-5" /> Edit This Page
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] px-2.5 py-1 rounded-full font-bold">
                        Page {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor View */}
            {viewMode === "editor" && (
              <div className="flex-1 h-[calc(100vh-50px)] overflow-y-auto flex flex-col items-center bg-black px-2 py-6 scrollbar-thin">
                <CanvasEditor
                  imageSrc={pages[editingPageIndex]}
                  activeTool={activeTool}
                  isBrushEnabled={isBrushEnabled}
                  brushColor={brushColor}
                  brushSize={brushSize}
                  brushOpacity={brushOpacity}
                  canvasRef={canvasRef}
                  undoTrigger={undoCount}
                  removeBrushMode={removeBrushMode}
                  removeBrushSize={removeBrushSize}
                  isProcessingRemove={isProcessingRemove}
                  setIsProcessingRemove={setIsProcessingRemove}
                  textBoxes={textBoxes}
                  setTextBoxes={setTextBoxes}
                  activeTextId={activeTextId}
                  setActiveTextId={setActiveTextId}
                  onDuplicateBox={handleDuplicateBox}
                />

                <FloatingToolbox
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  isBrushEnabled={isBrushEnabled}
                  setIsBrushEnabled={setIsBrushEnabled}
                  brushColor={brushColor}
                  setBrushColor={setBrushColor}
                  brushSize={brushSize}
                  setBrushSize={setBrushSize}
                  activeBox={activeBox}
                  updateActiveBox={updateActiveBox}
                  onAddNewTextBox={handleAddNewTextBox}
                  onAddImageLogo={handleAddImageLogo}
                  onDuplicateBox={handleDuplicateBox}
                  customFonts={customFonts}
                  onFontUpload={handleFontUpload}
                  onUndo={triggerUndo}
                  removeBrushMode={removeBrushMode}
                  setRemoveBrushMode={setRemoveBrushMode}
                  removeBrushSize={removeBrushSize}
                  setRemoveBrushSize={setRemoveBrushSize}
                  onExecuteRemove={handleExecuteRemove}
                  isProcessingRemove={isProcessingRemove}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}