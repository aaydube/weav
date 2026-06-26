// app/trigger/geminiNode.ts
import { task } from "@trigger.dev/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runGeminiTask = task({
  id: "run-gemini",
  run: async (payload: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    images?: string[];
  }) => {
    // GEMINI_API_KEY must be set in your Trigger.dev dashboard environment variables
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

    // Use a valid model name — "gemini-3.1-pro" does not exist
    const modelName = payload.model || "gemini-1.5-pro";

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: payload.systemPrompt,
    });

    console.log(`Executing Gemini prompt with model: ${modelName}`);
    console.log(`Prompt: ${payload.prompt}`);

    const contents: any[] = [payload.prompt];

    if (payload.images && payload.images.length > 0) {
      for (const imageUrl of payload.images) {
        if (!imageUrl) continue;
        try {
          let base64Data: string;
          let mimeType = "image/jpeg";

          if (imageUrl.startsWith("data:")) {
            const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            } else {
              throw new Error("Invalid base64 image URL format");
            }
          } else {
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString("base64");
            const contentType = response.headers.get("content-type");
            if (contentType) {
              mimeType = contentType;
            }
          }

          contents.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
        } catch (e) {
          console.error(`Failed to include image ${imageUrl} in Gemini payload:`, e);
        }
      }
    }

    const result = await model.generateContent(contents);

    return {
      output: result.response.text(),
    };
  },
});