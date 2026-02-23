import { GoogleGenAI, Type } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || 
                          error?.status === 'RESOURCE_EXHAUSTED' ||
                          error?.message?.includes('429') || 
                          error?.message?.includes('RESOURCE_EXHAUSTED');
                          
      if (isRateLimit && retries < maxRetries) {
        retries++;
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        console.warn(`Rate limited. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

export async function researchCompany(companyName: string) {
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a branding expert.

Search the web for the most accurate and up-to-date information about the company: ${companyName}.

Give me:
- Industry
- Brand personality
- Target audience
- Main brand colors (provide specific hex codes or color names)
- Design style patterns
- Typography style
- Marketing tone

Return in structured JSON.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          industry: { type: Type.STRING },
          personality: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          designStyle: { type: Type.STRING },
          typography: { type: Type.STRING },
          marketingTone: { type: Type.STRING }
        },
        required: ["industry", "personality", "targetAudience", "colors", "designStyle", "typography", "marketingTone"]
      }
    }
  }));
  return JSON.parse(response.text || "{}");
}

export async function generateLayoutIdeas(brandData: any) {
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional graphic designer.

Based on:
Industry: ${brandData.industry}
Personality: ${brandData.personality}
Colors: ${brandData.colors.join(', ')}
Image size: 1920x1080

Create 3 different photo layout ideas for an event frame.
Describe each layout clearly including:
- Background style
- Text placement
- Image placement
- Color usage
- Mood

Return as a JSON array of objects.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    }
  }));
  return JSON.parse(response.text || "[]");
}

export async function generateImage(layoutDescription: string, brandData: any, photoSize: string = "1440x700", hasLogo: boolean = false, eventTitle: string = "") {
  const prompt = `Generate an event photo booth frame layout.

CRITICAL LAYOUT RULES:
1. The center area MUST be a massive, completely empty solid WHITE rectangle (representing the photo cutout area: ${photoSize}).
2. This empty white rectangle must take up about 80% of the total image area.
3. The bottom border should be thick to accommodate text.
4. The top border should be thick, with a small rounded tab or cutout dipping into the white space in the top-center for a logo.
5. The left and right side borders should be thin.
6. Decorations, patterns, and graphics MUST be strictly confined to the colored borders.
${hasLogo ? '7. DO NOT generate any logos in the top tab area. Leave the top tab area blank for a custom logo.' : '7. Top logo area (small, in the top-center tab)'}
${eventTitle ? `8. DO NOT generate any text in the bottom area. Leave the bottom area blank for the custom text: "${eventTitle}".` : '8. Bottom event title area (large text in the bottom border)'}
9. The massive center solid white space MUST remain completely untouched and empty.
10. DO NOT generate any fake text or placeholder text anywhere.

Layout description:
${layoutDescription}

Brand Colors: ${brandData.colors.join(', ')}
Industry: ${brandData.industry}
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function editImage(base64Data: string, mimeType: string, promptText: string) {
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: promptText,
        },
      ],
    },
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image generated");
}
