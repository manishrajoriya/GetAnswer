import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { processImage, sendToGemini } from "../../utils/apiUtils";
import { deductCredits, loadCredits } from "../../utils/creditUtils";

const CREDITS_PER_IMAGE = 1;
const CREDITS_PER_GEMINI_REQUEST = 2;

export default function OCRScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    loadCredits(setCredits);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("userCredits", credits.toString());
  }, [credits]);

  const pickImageSource = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || galleryStatus !== "granted") {
      Alert.alert("Permission Required", "Camera and gallery permissions are required!");
      return;
    }

    Alert.alert("Choose Image Source", "Would you like to take a photo or choose from your gallery?", [
      {
        text: "Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            handleProcessImage(result.assets[0].uri); 
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            handleProcessImage(result.assets[0].uri); 
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleProcessImage = async (uri: string) => {
    if (!uri) return;
    if (!deductCredits(CREDITS_PER_IMAGE, credits, setCredits)) return;

    setLoading(true);
    setExtractedText("");
    setGeminiResponse(null);

    try {
      const text = await processImage(uri);
      setExtractedText(text);
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", "Failed to process image. Please check the API key and image format.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToGemini = async () => {
    if (!extractedText.trim()) {
      Alert.alert("Error", "No valid question found.");
      return;
    }
    if (!deductCredits(CREDITS_PER_GEMINI_REQUEST, credits, setCredits)) return;

    setLoading(true);

    try {
      const response = await sendToGemini(extractedText);
      setGeminiResponse(response);
    } catch (error) {
      console.error("Error fetching Gemini response:", error);
      Alert.alert("Error", "Failed to get response from Gemini.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#4c669f", "#3b5998", "#192f6a"]} style={styles.gradientBackground}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>GetAnswer</Text>
            <View style={styles.creditContainer}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.creditText}>{credits}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.pickImageButton} onPress={pickImageSource} disabled={loading}>
            <Ionicons name="image" size={24} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Choose Image</Text>
          </TouchableOpacity>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={80} color="#ffffff50" />
            </View>
          )}

          {loading && <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />}

          {extractedText && (
            <View style={styles.textContainer}>
              <Text style={styles.sectionTitle}>Extracted Text:</Text>
              <TextInput
                style={styles.textInput}
                multiline
                value={extractedText}
                onChangeText={setExtractedText}
                placeholder="Extracted text will appear here. You can edit it."
                placeholderTextColor="#ffffff80"
                editable={!loading}
              />
            </View>
          )}

          {extractedText && (
            <TouchableOpacity
              style={[styles.actionButton, !extractedText && styles.disabledButton]}
              onPress={handleSendToGemini}
              disabled={!extractedText || loading}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Get Answer</Text>
            </TouchableOpacity>
          )}

          {geminiResponse && (
            <View style={styles.responseContainer}>
              <Text style={styles.sectionTitle}>Response:</Text>
              <Text style={styles.responseText}>{geminiResponse}</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  creditContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  creditText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginLeft: 5,
  },
  pickImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "white",
    resizeMode: "contain",
  },
  placeholderImage: {
    width: 300,
    height: 300,
    marginBottom: 20,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  loader: {
    marginVertical: 20,
  },
  textContainer: {
    width: "100%",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
  },
  textInput: {
    width: "100%",
    minHeight: 100,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: "top",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "white",
  },
  responseContainer: {
    width: "100%",
    marginBottom: 20,
  },
  responseText: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 15,
    borderRadius: 10,
    color: "white",
  },
});