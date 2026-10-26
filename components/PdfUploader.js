"use client";
import { useState } from "react";
import { UploadCloud, FileText } from "lucide-react";

export default function PdfUploader({ onPagesLoaded }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    if (!file) return;

    if (file.type === "application/pdf") {
      setLoading(true);
      try {
        const pdfjsLib = await import("pdfjs-dist/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        const pagesArray = [];

        for (let i = 1; i <= totalPages; i++) {
          setProgress(`စာမျက်နှာ ${i} / ${totalPages} ကို ပြောင်းနေသည်...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
          pagesArray.push(canvas.toDataURL("image/png"));
        }

        onPagesLoaded(pagesArray);
      } catch (err) {
        alert("PDF ဖတ်၍မရပါ: " + err.message);
      }
      setLoading(false);
      setProgress("");
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => onPagesLoaded([e.target.result]);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl transition duration-200 cursor-pointer ${
        isDragging
          ? "border-blue-600 bg-blue-100/70 scale-[0.99]"
          : "border-blue-300 bg-white hover:bg-blue-50/50 shadow-sm"
      }`}
    >
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
        <UploadCloud className="w-8 h-8 animate-bounce" />
      </div>

      <label className="cursor-pointer text-center">
        <h3 className="text-base md:text-lg font-bold text-slate-800">
          PDF သို့မဟုတ် ပုံဖိုင်ကို ဤနေရာသို့ <span className="text-blue-600">ဆွဲထည့်ပါ (Drag & Drop)</span>
        </h3>
        <p className="text-xs md:text-sm text-slate-400 mt-1">သို့မဟုတ် ဖိုင်ရွေးချယ်ရန် ကလစ်နှိပ်ပါ</p>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => processFile(e.target.files[0])}
          className="hidden"
        />
      </label>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
          <FileText className="w-4 h-4 animate-spin" />
          <span>{progress}</span>
        </div>
      )}
    </div>
  );
}