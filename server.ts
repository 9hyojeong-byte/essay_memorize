import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Create Gemini client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Essay translation and title generation
  app.post("/api/generate-essay", async (req, res) => {
    try {
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
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate English translation." });
    }
  });

  // Serve static assets or use Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
