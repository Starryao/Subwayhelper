import { GoogleGenAI, Type } from "@google/genai";
import { MetroData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractMetroDataFromImage(base64Image: string, mimeType: string): Promise<MetroData[]> {
  const prompt = `
    Analyze this image of a metro passenger flow ranking table (地铁客流排行榜).
    Extract the following information for EACH entry in the table:
    1. The date of the data (usually in the title or top of the image in YYYY-MM-DD format).
    2. The city name.
    3. The passenger volume in ten thousands (万人).

    Rules:
    - Standardize city names by adding "市" suffix if missing (e.g., "上海" -> "上海市", "北京" -> "北京市").
    - If passenger volume is missing or invalid, use 0.
    - Convert passenger volume to a float number.
    - Output only a JSON array of objects with keys: "date", "city", "passenger_volume".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
              mimeType: mimeType,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
              city: { type: Type.STRING, description: "City name with '市' suffix" },
              passenger_volume: { type: Type.NUMBER, description: "Passenger volume in 万人" },
            },
            required: ["date", "city", "passenger_volume"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
}
