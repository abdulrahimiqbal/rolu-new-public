import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing environment variable: GEMINI_API_KEY');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to fetch image data from a URL and convert it to base64
async function urlToGenerativePart(url: string, mimeType: string): Promise<{ inlineData: { data: string; mimeType: string } }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

/**
 * Evaluates an image using Google Gemini Pro Vision based on provided criteria.
 *
 * @param imageUrl The URL of the image to evaluate (e.g., from ImageKit).
 * @param criteriaPrompt The specific prompt instructing the AI on how to evaluate the image.
 * @param imageMimeType The MIME type of the image (e.g., 'image/jpeg', 'image/png'). Defaults to 'image/png'.
 * @returns The raw text response from the AI.
 */
export async function evaluateImage(
  imageUrl: string,
  criteriaPrompt: string,
  imageMimeType: string = 'image/png' // Default, adjust if needed or determine dynamically
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      // Safety settings can be adjusted if needed
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        // Add other categories as needed
      ],
    });

    // Fetch the image data from the URL provided by ImageKit
    const imagePart = await urlToGenerativePart(imageUrl, imageMimeType);

    const promptParts = [
      imagePart, // The image data
      { text: criteriaPrompt }, // The text prompt describing what to check
    ];

    console.log(`[AI Evaluator] Sending prompt to Gemini for image: ${imageUrl.substring(0, 50)}...`);

    const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });

    if (
      !result.response ||
      !result.response.candidates ||
      result.response.candidates.length === 0 ||
      !result.response.candidates[0].content ||
      !result.response.candidates[0].content.parts ||
      result.response.candidates[0].content.parts.length === 0 ||
      !result.response.candidates[0].content.parts[0].text
    ) {
      console.error('[AI Evaluator] Invalid response structure from Gemini:', JSON.stringify(result.response));
      throw new Error('Invalid response structure from AI');
    }

    const responseText = result.response.candidates[0].content.parts[0].text.trim();
    console.log(`[AI Evaluator] Received response from Gemini: "${responseText}"`);
    return responseText;

  } catch (error) {
    console.error('[AI Evaluator] Error evaluating image:', error);
    // Re-throw or handle specific errors as needed
    if (error instanceof Error) {
        throw new Error(`AI evaluation failed: ${error.message}`);
    } else {
        throw new Error('AI evaluation failed due to an unknown error.');
    }
  }
} 