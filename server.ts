import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the Google GenAI SDK client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required to simulate reactions.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const dimensionSchema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: "Sentiment/stance score from -100 (Strong opposition/hate) to 100 (Strong approval/love). 0 is neutral."
    },
    concerns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 highly realistic concerns or objections specific to this demographic segment."
    },
    benefits: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 realistic benefits, arguments, or practical values specific to this demographic segment."
    }
  },
  required: ["score", "concerns", "benefits"]
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    pitch: { type: Type.STRING },
    tagline: { type: Type.STRING, description: "A catchy, short description tagline summarizing the input" },
    category: { type: Type.STRING, description: "The type of copy provided (e.g., 'Startup Pitch', 'Ad Copy', 'Product Feature', 'Policy Proposal')" },
    synthesis: {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.INTEGER, description: "The aggregate population sentiment score from -100 to 100" },
        summary: { type: Type.STRING, description: "A detailed 2-3 sentence overview of the general public response." },
        keyTakeaway: { type: Type.STRING, description: "Advice for the speaker on how to adapt this pitch for wider US appeal." },
        winners: { type: Type.STRING, description: "The demographic groups that support this most and why." },
        losers: { type: Type.STRING, description: "The demographic groups that oppose/resist this most and why." }
      },
      required: ["overallScore", "summary", "keyTakeaway", "winners", "losers"]
    },
    ageGroup: {
      type: Type.OBJECT,
      properties: {
        '18-34': dimensionSchema,
        '35-54': dimensionSchema,
        '55+': dimensionSchema
      },
      required: ['18-34', '35-54', '55+']
    },
    education: {
      type: Type.OBJECT,
      properties: {
        'High School or less': dimensionSchema,
        'Some College / Associate': dimensionSchema,
        'Bachelor\'s Degree': dimensionSchema,
        'Postgraduate / Advanced': dimensionSchema
      },
      required: ['High School or less', 'Some College / Associate', 'Bachelor\'s Degree', 'Postgraduate / Advanced']
    },
    region: {
      type: Type.OBJECT,
      properties: {
        'Northeast': dimensionSchema,
        'Midwest': dimensionSchema,
        'South': dimensionSchema,
        'West': dimensionSchema
      },
      required: ['Northeast', 'Midwest', 'South', 'West']
    },
    gender: {
      type: Type.OBJECT,
      properties: {
        'Male': dimensionSchema,
        'Female': dimensionSchema
      },
      required: ['Male', 'Female']
    },
    maritalStatus: {
      type: Type.OBJECT,
      properties: {
        'Single': dimensionSchema,
        'Married': dimensionSchema,
        'Divorced': dimensionSchema,
        'Widowed': dimensionSchema
      },
      required: ['Single', 'Married', 'Divorced', 'Widowed']
    },
    verbatims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          age: { type: Type.INTEGER },
          gender: { type: Type.STRING, description: "Male or Female" },
          maritalStatus: { type: Type.STRING, description: "Single, Married, Divorced, or Widowed" },
          occupation: { type: Type.STRING },
          state: { type: Type.STRING },
          sentiment: { type: Type.INTEGER, description: "-100 to 100 sentiment score" },
          quote: { type: Type.STRING, description: "A realistic quote written in a highly personal, raw, authentic human voice explaining who they are and their direct reaction to the pitch." }
        },
        required: ["name", "age", "gender", "maritalStatus", "occupation", "state", "sentiment", "quote"]
      },
      description: "Provide exactly 12 to 14 highly diverse, realistic individual quotes representing distinct profiles from different regions, classes, and backgrounds."
    }
  },
  required: ["pitch", "tagline", "category", "synthesis", "ageGroup", "education", "region", "gender", "maritalStatus", "verbatims"]
};

// Helper function to extract and fetch URL content
async function extractAndFetchUrls(text: string): Promise<{ fetchedContext: string; urls: string[] }> {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = text.match(urlRegex) || [];
  if (urls.length === 0) {
    return { fetchedContext: "", urls: [] };
  }

  // Fetch up to 2 URLs to prevent abuse or long lag times
  const fetchPromises = urls.slice(0, 2).map(async (url) => {
    const cleanUrl = url.replace(/[.,;:()]+$/, "");
    try {
      console.log(`Analyzing Web Link: live fetching content from ${cleanUrl}...`);
      const response = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(6000), // 6 seconds timeout
      });

      if (!response.ok) {
        return `URL: ${cleanUrl}\nStatus: Could not fetch due to HTTP Error ${response.status}.`;
      }

      const html = await response.text();
      
      // Look for title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "Unknown Page Title";

      // Look for meta description
      const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) ||
                           html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i) ||
                           html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);
      const description = metaDescMatch ? metaDescMatch[1].trim() : "";

      // Simple body scraping: strip search/boilerplate/styles/scripts
      let bodyText = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
        .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (bodyText.length > 2500) {
        bodyText = bodyText.substring(0, 2500) + "... [truncated]";
      }

      return `--- WEB PAGE ANALYSIS FOR ${cleanUrl} ---
Title: ${title}
Meta Description: ${description}
Core Extracted Text Output:
${bodyText}
--------------------------------`;
    } catch (err: any) {
      console.error(`Failed to scrape ${cleanUrl}:`, err);
      return `URL: ${cleanUrl}\nStatus: Could not load live page contents due to network limits or bot blockers. Generic info returned. Error: ${err.message || err}`;
    }
  });

  const results = await Promise.all(fetchPromises);
  return {
    fetchedContext: results.join("\n\n"),
    urls: urls.map(u => u.replace(/[.,;:()]+$/, ""))
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Define server-side API route for population-scale reaction aggregation
  app.post("/api/react", async (req, res): Promise<any> => {
    try {
      const { pitch, agentCount } = req.body;
      if (!pitch || typeof pitch !== "string") {
        return res.status(400).json({ error: "The pitch parameter is required and must be a string." });
      }

      const populationSize = agentCount || 1000;
      console.log(`Processing reaction analysis for pitch (${~~pitch.length} chars) across ${populationSize} agents...`);

      // 1. Scrape links if any exist
      let fetchedInfo = "";
      const { fetchedContext, urls } = await extractAndFetchUrls(pitch);
      if (urls.length > 0) {
        fetchedInfo = fetchedContext;
        console.log(`Integrated page analysis metadata for ${urls.length} links.`);
      }

      const ai = getGeminiClient();

      const prompt = `You are a simulated representative of the USA population. We have a population database of ${populationSize.toLocaleString()} agents sourced from the actual NVIDIA Nemotron-Personas-USA dataset — real synthetic personas grounded in US Census distributions for age, sex, education level, occupation, marital status, city, and state.

The user has introduced a subject of examination.
Subject introduced:
"${pitch}"

${urls.length > 0 ? `WEB SCRAPER ACTIVE DETECTED: We extracted the following webpage content from the linked URLs:
${fetchedInfo}

ATTENTION: Realize that some external domains might block scraping or serve CAPTCHAs (resulting in a direct 'Could not load live page contents' error above). If this occurred, OR if the scraper results are minimal, you must use your full world knowledge of the domain, the URL path components, product model numbers, brand patterns, or YouTube ID references to deduce the subject's exact nature and simulate high-fidelity US cohort reactions.

IMPORTANT RULE FOR EXTRACTED PITCH RESPONSE:
The returning JSON 'pitch' property MUST be an elegant, concise 1-2 sentence descriptive summary explaining the exact website/product/channel/policy that was analysed (e.g., "Apple Vision Pro Spatial VR Headset listed on Amazon targeting premium entertainment consumers" or "YouTube video reviewing Devin AI, evaluating its impact on professional coders") rather than repeating raw HTML or URL links. Do NOT return raw HTML inside the returning JSON fields.` : ""}

For this subject, simulate the reaction of these segments based on the demographic dimensions available in the Nemotron dataset (age, education, region, gender, marital status) and assign scores from -100 (Strongly Hate / Oppose) to 100 (Strongly Love / Favor). Maintain high demographic realism:
- Highly educated or urban folks focus on efficiency, advanced technical capability, premium quality.
- Less educated or rural folks focus on affordability, inflation concerns, practical utility, traditional values.
- Different ages prioritize sustainability and tech (younger) vs security and traditional usage (older).
- Regional differences reflect economic realities: Northeast (finance, tech), Midwest (manufacturing, agriculture), South (energy, military, religion), West (tech, innovation, environment).
- Marital status influences priorities: married people focus on family stability and long-term value, single people on personal growth and flexibility, divorced/widowed on financial security.

Provide an in-depth analysis. You MUST output your response exactly conforming to the JSON schema. Explain the reasons and generate highly authentic individual human quotes (verbatims) reflecting these views. Let's think step by step.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are a sociological researcher and statistical simulator modeling ${populationSize.toLocaleString()} diverse US agents from the NVIDIA Nemotron-Personas-USA dataset reacting to copy, policies, products, and startups in parallel.`,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7,
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini API.");
      }

      const evaluationData = JSON.parse(responseText.trim());
      res.json(evaluationData);
    } catch (error: any) {
      console.error("Gemini API Error in /api/react:", error);
      res.status(500).json({
        error: error.message || "An unexpected error occurred while analyzing reactions."
      });
    }
  });

  // Vite development vs production static setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
