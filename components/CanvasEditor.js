"use client";
import { useEffect, useRef, useState } from "react";
import { X, RotateCw } from "lucide-react";

// 4-Point Projective Homography Solver (ထောင့် ၄ ထောင့်အတိုင်း စာသားကို ၁၀၀% အထဲထည့်သွင်းပေးသည့် စနစ်)
function computeMatrix3D(w, h, p0, p1, p2, p3) {
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sy = p0.y - p1.y + p2.y - p3.y;

  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < 1e-5) {
    // Affine fallback
    const a = (p1.x - p0.x) / w;
    const b = (p3.x - p0.x) / h;
    const c = p0.x;
    const d = (p1.y - p0.y) / w;
    const e = (p3.y - p0.y) / h;
    const f = p0.y;
    return `matrix(${a}, ${d}, ${b}, ${e}, ${c}, ${f})`;
  }

  const g = (sx * dy2 - sy * dx2) / det;
  const h_val = (dx1 * sy - dy1 * sx) / det;

  const a = (p1.x - p0.x + g * p1.x) / w;
  const b = (p3.x - p0.x + h_val * p3.x) / h;
  const c = p0.x;
  const d = (p1.y - p0.y + g * p1.y) / w;
  const e = (p3.y - p0.y + h_val * p3.y) / h;
  const f = p0.y;

  return `matrix3d(${a}, ${d}, 0, ${g / w}, ${b}, ${e}, 0, ${h_val / h}, 0, 0, 1, 0, ${c}, ${f}, 0, 1)`;
}

export default function CanvasEditor({
  imageSrc,
  activeTool,
  isBrushEnabled,
  brushColor,
  brushSize,
  brushOpacity,
  canvasRef,
  undoTrigger,
  removeBrushMode,
  removeBrushSize,
  isProcessingRemove,
  setIsProcessingRemove,
  textBoxes,
  setTextBoxes,
  activeTextId,
  setActiveTextId,
}) {
  const canvasElementRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, visible: false });
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const [dragInfo, setDragInfo] = useState(null);

  useEffect(() => {
    if (!imageSrc || !canvasElementRef.current) return;

    const canvas = canvasElementRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const targetWidth = 700;
      const scale = targetWidth / img.naturalWidth;
      const targetHeight = Math.round(img.naturalHeight * scale);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = targetWidth;
        maskCanvas.height = targetHeight;
        maskCanvas.style.width = `${targetWidth}px`;
        maskCanvas.style.height = `${targetHeight}px`;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      canvasRef.current = canvas;

      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
      historyIndexRef.current = 0;
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!undoTrigger || !canvasElementRef.current) return;
    const canvas = canvasElementRef.current;
    const ctx = canvas.getContext("2d");

    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const previousState = historyRef.current[historyIndexRef.current];
      ctx.putImageData(previousState, 0, 0);
    }
  }, [undoTrigger]);

  const getCoordinates = (e) => {
    const canvas = canvasElementRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      screenX: clientX - rect.left,
      screenY: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (activeTool === "text") return;
    if (activeTool === "brush" && !isBrushEnabled) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    if (activeTool === "brush") {
      const ctx = canvasElementRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = brushOpacity;
      ctx.strokeStyle = brushColor;
    } else if (activeTool === "remove") {
      const maskCtx = maskCanvasRef.current.getContext("2d");
      maskCtx.beginPath();
      maskCtx.moveTo(x, y);
      maskCtx.lineCap = "round";
      maskCtx.lineJoin = "round";
      maskCtx.lineWidth = removeBrushSize;

      if (removeBrushMode === "pencil") {
        maskCtx.globalCompositeOperation = "source-over";
        maskCtx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      } else {
        maskCtx.globalCompositeOperation = "destination-out";
      }
    }
  };

  const draw = (e) => {
    const { x, y, screenX, screenY } = getCoordinates(e);
    setCursorPos({ x: screenX, y: screenY, visible: true });

    if (!isDrawing) return;

    if (activeTool === "brush" && isBrushEnabled) {
      const ctx = canvasElementRef.current.getContext("2d");
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (activeTool === "remove") {
      const maskCtx = maskCanvasRef.current.getContext("2d");
      maskCtx.lineTo(x, y);
      maskCtx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === "brush") {
      const canvas = canvasElementRef.current;
      const ctx = canvas.getContext("2d");
      ctx.closePath();

      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const nextIndex = historyIndexRef.current + 1;
      historyRef.current = historyRef.current.slice(0, nextIndex);
      historyRef.current.push(currentState);
      historyIndexRef.current = nextIndex;
    } else if (activeTool === "remove") {
      const maskCtx = maskCanvasRef.current.getContext("2d");
      maskCtx.closePath();
    }
  };

  const executeRemove = () => {
    const canvas = canvasElementRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    setIsProcessingRemove(true);

    setTimeout(() => {
      const ctx = canvas.getContext("2d");
      const maskCtx = maskCanvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;

      const imgData = ctx.getImageData(0, 0, width, height);
      const maskData = maskCtx.getImageData(0, 0, width, height);
      const src = imgData.data;
      const mask = maskData.data;

      let minX = width, minY = height, maxX = 0, maxY = 0;
      let hasMask = false;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (mask[idx + 3] > 10) {
            hasMask = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasMask) {
        setIsProcessingRemove(false);
        return;
      }

      const pad = 25;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(width - 1, maxX + pad);
      maxY = Math.min(height - 1, maxY + pad);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = (y * width + x) * 4;

          if (mask[idx + 3] > 10) {
            let rTop = 0, gTop = 0, bTop = 0, distTop = 999;
            let rBottom = 0, gBottom = 0, bBottom = 0, distBottom = 999;
            let rLeft = 0, gLeft = 0, bLeft = 0, distLeft = 999;
            let rRight = 0, gRight = 0, bRight = 0, distRight = 999;

            for (let sy = y - 1; sy >= 0; sy--) {
              const sIdx = (sy * width + x) * 4;
              if (mask[sIdx + 3] === 0) {
                rTop = src[sIdx]; gTop = src[sIdx + 1]; bTop = src[sIdx + 2];
                distTop = y - sy;
                break;
              }
            }

            for (let sy = y + 1; sy < height; sy++) {
              const sIdx = (sy * width + x) * 4;
              if (mask[sIdx + 3] === 0) {
                rBottom = src[sIdx]; gBottom = src[sIdx + 1]; bBottom = src[sIdx + 2];
                distBottom = sy - y;
                break;
              }
            }

            for (let sx = x - 1; sx >= 0; sx--) {
              const sIdx = (y * width + sx) * 4;
              if (mask[sIdx + 3] === 0) {
                rLeft = src[sIdx]; gLeft = src[sIdx + 1]; bLeft = src[sIdx + 2];
                distLeft = x - sx;
                break;
              }
            }

            for (let sx = x + 1; sx < width; sx++) {
              const sIdx = (y * width + sx) * 4;
              if (mask[sIdx + 3] === 0) {
                rRight = src[sIdx]; gRight = src[sIdx + 1]; bRight = src[sIdx + 2];
                distRight = sx - x;
                break;
              }
            }

            const wTop = 1 / Math.max(1, distTop);
            const wBottom = 1 / Math.max(1, distBottom);
            const wLeft = 1 / Math.max(1, distLeft);
            const wRight = 1 / Math.max(1, distRight);
            const totalW = wTop + wBottom + wLeft + wRight;

            src[idx] = Math.round((rTop * wTop + rBottom * wBottom + rLeft * wLeft + rRight * wRight) / totalW);
            src[idx + 1] = Math.round((gTop * wTop + gBottom * wBottom + gLeft * wLeft + gRight * wRight) / totalW);
            src[idx + 2] = Math.round((bTop * wTop + bBottom * wBottom + bLeft * wLeft + bRight * wRight) / totalW);
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      maskCtx.clearRect(0, 0, width, height);

      const currentState = ctx.getImageData(0, 0, width, height);
      const nextIndex = historyIndexRef.current + 1;
      historyRef.current = historyRef.current.slice(0, nextIndex);
      historyRef.current.push(currentState);
      historyIndexRef.current = nextIndex;

      setIsProcessingRemove(false);
    }, 350);
  };

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.executeRemove = executeRemove;
    }
  });

  // Handle Dragging
  const handleBoxMouseDown = (e, id, type, pinKey = null) => {
    e.stopPropagation();
    setActiveTextId(id);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const box = textBoxes.find((b) => b.id === id);
    if (!box) return;

    setDragInfo({
      type,
      pinKey,
      id,
      startX: clientX,
      startY: clientY,
      initX: box.x,
      initY: box.y,
      initFontSize: box.fontSize,
      initRotation: box.rotation || 0,
      initPins: {
        tl: { ...(box.pins?.tl || { x: 0, y: 0 }) },
        tr: { ...(box.pins?.tr || { x: 0, y: 0 }) },
        br: { ...(box.pins?.br || { x: 0, y: 0 }) },
        bl: { ...(box.pins?.bl || { x: 0, y: 0 }) },
      },
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragInfo) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragInfo.startX;
      const dy = clientY - dragInfo.startY;

      setTextBoxes((prev) =>
        prev.map((box) => {
          if (box.id !== dragInfo.id) return box;

          if (dragInfo.type === "move") {
            return { ...box, x: dragInfo.initX + dx, y: dragInfo.initY + dy };
          } else if (dragInfo.type === "scale") {
            const newSize = Math.max(12, Math.min(95, Math.round(dragInfo.initFontSize + (dx + dy) * 0.25)));
            return { ...box, fontSize: newSize };
          } else if (dragInfo.type === "rotate") {
            const newRotation = Math.round(dragInfo.initRotation + dx * 0.5);
            return { ...box, rotation: newRotation };
          } else if (dragInfo.type === "pin") {
            const k = dragInfo.pinKey;
            // ၁၀၀% သီးခြားလွတ်လပ်စွာ ရွေ့ခြင်း (ကျန် ၃ ထောင့် လုံးဝ ၁ မီလီမီတာမျှ မလှုပ်ပါ)
            return {
              ...box,
              pins: {
                ...box.pins,
                [k]: {
                  x: dragInfo.initPins[k].x + dx,
                  y: dragInfo.initPins[k].y + dy,
                },
              },
            };
          }
          return box;
        })
      );
    };

    const handleMouseUp = () => setDragInfo(null);

    if (dragInfo) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [dragInfo]);

  const deleteTextBox = (e, id) => {
    e.stopPropagation();
    setTextBoxes((prev) => prev.filter((b) => b.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  return (
    <div className="w-full flex justify-center pb-24">
      <div
        ref={containerRef}
        className={`relative bg-white shadow-2xl rounded-lg overflow-hidden border border-neutral-700 select-none ${
          activeTool === "text" ? "cursor-default" : "cursor-none"
        }`}
        onMouseEnter={() => setCursorPos((p) => ({ ...p, visible: true }))}
        onMouseLeave={() => setCursorPos((p) => ({ ...p, visible: false }))}
      >
        <canvas ref={canvasElementRef} style={{ display: "block" }} />

        <canvas
          ref={maskCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute top-0 left-0 w-full h-full ${
            activeTool === "text" ? "pointer-events-none" : "pointer-events-auto"
          }`}
          style={{ display: "block" }}
        />

        {/* Text Boxes Container */}
        {textBoxes.map((box) => {
          const isActive = box.id === activeTextId;
          const isPerspOn = Boolean(box.isPerspectiveEnabled);
          const pins = box.pins || { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, br: { x: 0, y: 0 }, bl: { x: 0, y: 0 } };

          const boxW = box.width || 180;
          const boxH = box.height || 75;

          // ထောင့် ၄ ခု၏ အတိအကျ Coordinates များ
          const pTL = { x: pins.tl.x, y: pins.tl.y };
          const pTR = { x: boxW + pins.tr.x, y: pins.tr.y };
          const pBR = { x: boxW + pins.br.x, y: boxH + pins.br.y };
          const pBL = { x: pins.bl.x, y: boxH + pins.bl.y };

          // ထောင့် ၄ ခုအတိုင်း စာသားကို ၁၀၀% အထဲထည့်သွင်းပေးသည့် 3D Matrix
          const matrixStyle = isPerspOn
            ? computeMatrix3D(boxW, boxH, pTL, pTR, pBR, pBL)
            : `scaleX(${box.isFlippedX ? -1 : 1}) scaleY(${box.isFlippedY ? -1 : 1})`;

          return (
            <div
              key={box.id}
              style={{
                left: `${box.x}px`,
                top: `${box.y}px`,
                position: "absolute",
                transform: `rotate(${box.rotation || 0}deg)`,
                transformOrigin: "center center",
              }}
            >
              {/* Delete Button (အလယ်ထိပ်တည့်တည့်တွင် ကပ်ထားသည်) */}
              {isActive && (
                <button
                  onClick={(e) => deleteTextBox(e, box.id)}
                  style={{
                    left: `${isPerspOn ? (pTL.x + pTR.x) / 2 : boxW / 2}px`,
                    top: `${isPerspOn ? (pTL.y + pTR.y) / 2 - 16 : -14}px`,
                  }}
                  className="absolute -translate-x-1/2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-xl transition z-50 border border-white"
                  title="Delete"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Rotate & Scale Handles (Perspective ပိတ်ထားချိန်တွင်သာ ပေါ်မည်) */}
              {isActive && !isPerspOn && (
                <>
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, box.id, "rotate")}
                    onTouchStart={(e) => handleBoxMouseDown(e, box.id, "rotate")}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-amber-400 rounded-full cursor-grab active:cursor-grabbing border-2 border-white shadow flex items-center justify-center text-slate-900 z-40"
                    title="Rotate"
                  >
                    <RotateCw className="w-3 h-3" />
                  </div>
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, box.id, "scale")}
                    onTouchStart={(e) => handleBoxMouseDown(e, box.id, "scale")}
                    className="absolute -bottom-2 -right-2 w-5 h-5 bg-cyan-400 rounded-full cursor-se-resize flex items-center justify-center shadow-md border-2 border-white z-40"
                    title="Resize"
                  />
                </>
              )}

              {/* --------------------------------------------------------------------------------- */}
              {/* TRANSFORMED CONTAINER: စာသားသည် ထောင့် ၄ ခုအတွင်း ၁၀၀% ကွက်တိ အထဲတွင်သာ ရှိနေမည် */}
              {/* --------------------------------------------------------------------------------- */}
              <div
                style={{
                  width: `${boxW}px`,
                  height: `${boxH}px`,
                  transform: matrixStyle,
                  transformOrigin: "0 0",
                  mixBlendMode: box.blendMode,
                }}
                onMouseDown={(e) => handleBoxMouseDown(e, box.id, "move")}
                onTouchStart={(e) => handleBoxMouseDown(e, box.id, "move")}
                className={`relative cursor-move select-none p-2 flex items-center justify-center ${
                  isActive
                    ? isPerspOn
                      ? "border-2 border-dashed border-cyan-400 bg-cyan-400/10"
                      : "border-2 border-dashed border-cyan-400"
                    : "hover:border border-transparent"
                }`}
              >
                {box.type === "image" ? (
                  <img
                    src={box.imgSrc}
                    alt="Logo"
                    style={{ width: "100%", height: "100%" }}
                    className="object-contain pointer-events-none select-none block"
                  />
                ) : (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.stopPropagation();
                    }}
                    onBlur={(e) => {
                      const text = e.target.innerText;
                      setTextBoxes((prev) =>
                        prev.map((b) => (b.id === box.id ? { ...b, text } : b))
                      );
                    }}
                    style={{
                      fontFamily: `${box.fontFamily}, Padauk, sans-serif`,
                      fontSize: `${box.fontSize}px`,
                      color: box.textColor,
                      textAlign: box.textAlign || "center",
                      letterSpacing: `${box.letterSpacing || 0}px`,
                      lineHeight: `${box.lineHeight || 1.3}`,
                      WebkitTextStroke: box.strokeWidth > 0 ? `${box.strokeWidth}px ${box.strokeColor}` : "none",
                      textShadow: box.hasShadow
                        ? `${box.shadowOffsetX}px ${box.shadowOffsetY}px ${box.shadowBlur || 6}px ${box.shadowColor}`
                        : "none",
                      fontWeight: "bold",
                      whiteSpace: "pre-wrap",
                      outline: "none",
                      width: "100%",
                      wordBreak: "break-word",
                    }}
                  >
                    {box.text}
                  </div>
                )}
              </div>

              {/* --------------------------------------------------------------------------------- */}
              {/* 4 INDEPENDENT CORNER PINS: ထောင့် ၄ ခုစွန်းပေါ်တွင် ကွက်တိထိကပ်နေပြီး တစ်ထောင့်ရွှေ့ပါက ကျန် ၃ ထောင့် လုံးဝမလှုပ်ပါ */}
              {/* --------------------------------------------------------------------------------- */}
              {isActive && isPerspOn && (
                <>
                  {/* Top-Left Pin (Red) */}
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, box.id, "pin", "tl")}
                    onTouchStart={(e) => handleBoxMouseDown(e, box.id, "pin", "tl")}
                    style={{ left: `${pTL.x}px`, top: `${pTL.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 rounded-full cursor-pointer border-2 border-white shadow-xl z-50 hover:scale-125 transition-transform"
                    title="Top-Left Pin"
                  />
                  {/* Top-Right Pin (Green) */}
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, box.id, "pin", "tr")}
                    onTouchStart={(e) => handleBoxMouseDown(e, box.id, "pin", "tr")}
                    style={{ left: `${pTR.x}px`, top: `${pTR.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-500 rounded-full cursor-pointer border-2 border-white shadow-xl z-50 hover:scale-125 transition-transform"
                    title="Top-Right Pin"
                  />
                  {/* Bottom-Right Pin (Blue) */}
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, box.id, "pin", "br")}
                    onTouchStart={(e) => handleBoxMouseDown(e, box.id, "pin", "br")}
                    style={{ left: `${pBR.x}px`, top: `${pBR.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 rounded-full cursor-pointer border-2 border-white shadow-xl z-50 hover:scale-125 transition-transform"
                    title="Bottom-Right Pin"
                  />
                  {/* Bottom-Left Pin (Orange) */}
                  <div
                    onMouseDown={(e) => handleBoxMouseDown(e, box.id, "pin", "bl")}
                    onTouchStart={(e) => handleBoxMouseDown(e, box.id, "pin", "bl")}
                    style={{ left: `${pBL.x}px`, top: `${pBL.y}px` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-amber-500 rounded-full cursor-pointer border-2 border-white shadow-xl z-50 hover:scale-125 transition-transform"
                    title="Bottom-Left Pin"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Pointer Circle */}
        {cursorPos.visible && activeTool !== "text" && (
          <div
            className="pointer-events-none absolute rounded-full border-2 shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-50"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              width: `${activeTool === "brush" ? brushSize : removeBrushSize}px`,
              height: `${activeTool === "brush" ? brushSize : removeBrushSize}px`,
              borderColor: activeTool === "brush" ? "#3B82F6" : "#EF4444",
              backgroundColor: activeTool === "brush" ? "rgba(59, 130, 246, 0.2)" : "rgba(239, 68, 68, 0.2)",
            }}
          />
        )}
      </div>
    </div>
  );
}