import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing on Vercel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-vercel",
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  // Direct OPTIONS/CORS preflight handling
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Only POST is supported." });
  }

  try {
    const ai = getAiClient();
    const { sentences } = req.body;
    if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
      return res.status(400).json({ error: "sentences array is required." });
    }

    const prompt = `Translate the following series of Korean sentences into natural, cohesive English sentences that form an essay. 
Also, generate an appropriate title for this essay (either Korean or English).
The translations must maintain a 1-to-1 match with the index of the original Korean sentences.

Korean Sentences:
${sentences.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Respond with a JSON object containing 'title' and 'translations'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "An appropriate, creative, and neat title for the full essay (preferably in Korean or simple English).",
            },
            translations: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "The translated English sentences in the exact same order as the input Korean sentences.",
            },
          },
          required: ["title", "translations"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Unable to get text response from Gemini");
    }

    const result = JSON.parse(text.trim());
    
    // Add safety CORS header block just in case
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Vercel Serverless Gemini Generation Error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to generate English translation." 
    });
  }
}
