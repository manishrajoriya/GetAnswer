import axios from "axios"
import * as FileSystem from "expo-file-system"

const GOOGLE_CLOUD_VISION_API_KEY = "AIzaSyCH7Dui21bAhQj3Btca01f8uwqAg6Pl6Ic" // Replace with actual API key
const GEMINI_API_KEY = "AIzaSyC6kyFZzFdB_XJfibAjsp3IVjGT6v3XlVg" // Replace with actual API key

export const processImage = async (imageUri: string): Promise<string> => {
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

  return response.data.responses[0]?.fullTextAnnotation?.text || "No text detected."
}

export const sendToGemini = async (extractedText: string): Promise<string> => {
  const formattedPrompt = `You are an expert tutor. Provide a clear and well-structured answer to the following exam question:\n\n"${extractedText}"`

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: formattedPrompt }] }],
    },
    { headers: { "Content-Type": "application/json" } },
  )
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response."
}




// gemini-2.0-flash-lite-preview-02-05
