import { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage"; // For persistent storage

const GOOGLE_CLOUD_VISION_API_KEY = ""; // Replace with actual API key
const GEMINI_API_KEY = ""; // Replace with actual API key
const CREDITS_PER_IMAGE = 1; // Credits deducted per image processing
const CREDITS_PER_GEMINI_REQUEST = 2; // Credits deducted per Gemini request

export default function OCRScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number>(0); // User's credit balance

  // Load credits from AsyncStorage on component mount
  useEffect(() => {
    const loadCredits = async () => {
      const storedCredits = await AsyncStorage.getItem("userCredits");
      setCredits(storedCredits ? parseInt(storedCredits, 10) : 10); // Default to 10 credits
    };
    loadCredits();
  }, []);

  // Save credits to AsyncStorage whenever they change
  useEffect(() => {
    AsyncStorage.setItem("userCredits", credits.toString());
  }, [credits]);

  const deductCredits = (amount: number) => {
    if (credits >= amount) {
      setCredits(credits - amount);
      return true;
    } else {
      Alert.alert("Insufficient Credits", "You don't have enough credits to perform this action.");
      return false;
    }
  };

  const pickImageSource = async () => {
    const source = await new Promise<"camera" | "gallery">((resolve) => {
      Alert.alert(
        "Choose Image Source",
        "Would you like to take a photo or choose from your gallery?",
        [
          { text: "Camera", onPress: () => resolve("camera") },
          { text: "Gallery", onPress: () => resolve("gallery") },
        ],
        { cancelable: true }
      );
    });

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera and gallery permissions are required!");
      return null;
    }

    let result;
    if (source === "camera") {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }

    return null;
  };

  const processImage = async (imageUri: string | null) => {
    if (!imageUri) return;

    // Check if user has enough credits
    if (!deductCredits(CREDITS_PER_IMAGE)) return;

    setLoading(true);
    setExtractedText("");
    setGeminiResponse(null);

    try {
      const base64Image = await convertImageToBase64(imageUri);
      const requestBody = {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      };

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        requestBody
      );

      const text = response.data.responses[0]?.fullTextAnnotation?.text || "No text detected.";
      setExtractedText(text);
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", "Failed to process image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendToGemini = async () => {
    if (!extractedText) {
      Alert.alert("Error", "No text extracted to send.");
      return;
    }

    // Check if user has enough credits
    if (!deductCredits(CREDITS_PER_GEMINI_REQUEST)) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: extractedText }] }],
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const responseText = response.data.candidates[0]?.content?.parts[0]?.text || "No response.";
      setGeminiResponse(responseText);
    } catch (error) {
      console.error("Error fetching Gemini response:", error);
      Alert.alert("Error", "Failed to get response from Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    Alert.alert("Clear All", "Are you sure you want to clear the image and text?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        onPress: () => {
          setImageUri(null);
          setExtractedText("");
          setGeminiResponse(null);
        },
      },
    ]);
  };

  const convertImageToBase64 = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.creditText}>Credits: {credits}</Text>

        <TouchableOpacity
          style={styles.pickImageButton}
          onPress={async () => {
            const uri = await pickImageSource();
            if (uri) await processImage(uri);
          }}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Pick an Image</Text>
        </TouchableOpacity>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Image source={require("../assets/images/icon.png")} style={styles.image} />
        )}

        {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}

        <Text style={styles.sectionTitle}>Extracted Text:</Text>
        <TextInput
          style={styles.textInput}
          multiline
          value={extractedText}
          onChangeText={setExtractedText}
          placeholder="Extracted text will appear here. You can edit it."
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.sendButton, { opacity: extractedText ? 1 : 0.5 }]}
          onPress={sendToGemini}
          disabled={!extractedText || loading}
        >
          <Text style={styles.buttonText}>Get Answer</Text>
        </TouchableOpacity>

        {geminiResponse && (
          <>
            <Text style={styles.sectionTitle}>Answer:</Text>
            <Text style={styles.responseText}>{geminiResponse}</Text>
          </>
        )}

        <TouchableOpacity style={styles.clearButton} onPress={clearAll} disabled={loading}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
  },
  creditText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#2196F3",
  },
  pickImageButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    width: "100%",
  },
  sendButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 20,
    width: "100%",
  },
  clearButton: {
    backgroundColor: "#ff4444",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
    width: "100%",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  clearButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  loader: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  textInput: {
    width: "100%",
    minHeight: 100,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  responseText: {
    backgroundColor: "#e8f5e9",
    padding: 10,
    borderRadius: 5,
    width: "100%",
    marginBottom: 20,
  },
});