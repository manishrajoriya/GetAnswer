import axios from "axios"
import * as FileSystem from "expo-file-system"

const GOOGLE_CLOUD_VISION_API_KEY = "AIzaSyCH7Dui21bAhQj3Btca01f8uwqAg6Pl6Ic" // Replace with actual API key
const GEMINI_API_KEY = "AIzaSyC6kyFZzFdB_XJfibAjsp3IVjGT6v3XlVg" // Replace with actual API key

export const processImage = async (imageUri: string): Promise<string> => {
  try {
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    const requestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }

    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      requestBody,
      { headers: { "Content-Type": "application/json" } },
    )

    if (!response.data.responses?.[0]?.fullTextAnnotation?.text) {
      throw new Error("No text detected in the image");
    }

    return response.data.responses[0].fullTextAnnotation.text;
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to process image. Please try again with a clearer image.");
  }
}

export const sendToGemini = async (extractedText: string): Promise<string> => {
  try {
    const formattedPrompt = `You are an expert tutor and problem solver. Please analyze the following question or text and provide a helpful, educational response. Your response should:

1. Understand the context and intent of the question
2. Provide a clear and comprehensive answer
3. If it's a problem to solve, break it down into steps
4. If it's a concept to explain, provide detailed explanation
5. Include relevant examples or analogies where helpful
6. Make the response easy to understand

Format your response in a clear, organized way. If the question is unclear, ask for clarification or make reasonable assumptions.

Content to analyze:
"${extractedText}"`

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: formattedPrompt }] }],
      },
      { headers: { "Content-Type": "application/json" } },
    )

    if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("No response received from Gemini");
    }

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error getting Gemini response:", error);
    throw new Error("Failed to get AI response. Please try again later.");
  }
}




// gemini-2.0-flash-lite-preview-02-05
