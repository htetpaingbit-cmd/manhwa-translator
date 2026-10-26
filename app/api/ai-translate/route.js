import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { imageBase64 } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key မရှိပါ" }, { status: 500 });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are a Manhwa Translator. Look at this manhwa image:
1. Extract ALL English text inside speech bubbles or narrations (OCR).
2. Translate each extracted English text into natural Burmese (Myanmar Unicode).
Respond ONLY with a JSON array in this exact format:
[
  { "english": "English text here", "burmese": "မြန်မာဘာသာပြန် ဒီမှာထည့်ပါ" }
]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: "image/png", data: cleanBase64 } }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    textResponse = textResponse.replace(/```json|```/g, "").trim();
    const result = JSON.parse(textResponse);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "OCR/Translation မအောင်မြင်ပါ" }, { status: 500 });
  }
}