import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  StyleSheet,
  Animated,
  AlertButton,
  useColorScheme,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';

import { processImage, sendToGemini } from "../../utils/apiUtils";
import { deductCredits, loadCredits, addCredits, getCreditTransactions, CreditTransaction } from "../../utils/creditUtils";
import { saveToHistory, getHistory, HistoryItem } from "../../utils/historyUtils";
import { useTheme } from "../../utils/themeContext";

const CREDITS_PER_IMAGE = 1;
const CREDITS_PER_GEMINI_REQUEST = 2;

const lightColors = {
  primary: "#4c669f",
  secondary: "#3b5998",
  accent: "#192f6a",
  background: "#ffffff",
  text: "#000000",
  card: "#f5f5f5",
  border: "#e0e0e0",
};

const darkColors = {
  primary: "#1a237e",
  secondary: "#0d47a1",
  accent: "#000051",
  background: "#121212",
  text: "#ffffff",
  card: "#1e1e1e",
  border: "#333333",
};

export default function OCRScreen() {
  const { isDark, theme, setTheme } = useTheme();
  const colors = isDark ? darkColors : lightColors;
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadCredits(setCredits);
    loadHistory();
    loadTransactions();
  }, []);

  const loadHistory = async () => {
    try {
      const historyItems = await getHistory();
      setHistory(historyItems);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const transactionList = await getCreditTransactions();
      setTransactions(transactionList);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  useEffect(() => {
    AsyncStorage.setItem("userCredits", credits.toString());
  }, [credits]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: loading ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [loading]);

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Success', 'Text copied to clipboard!');
    } catch (error) {
      showError('Failed to copy text to clipboard');
    }
  };

  const showError = (message: string, retryCallback?: () => void) => {
    setError(message);
    const buttons: AlertButton[] = [
      {
        text: "OK",
        onPress: () => setError(null),
      },
    ];
    
    if (retryCallback) {
      buttons.push({
        text: "Retry",
        onPress: () => {
          setError(null);
          retryCallback();
        },
      });
    }

    Alert.alert("Error", message, buttons);
  };

  const pickImageSource = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || galleryStatus !== "granted") {
      showError("Camera and gallery permissions are required!");
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
    if (!await deductCredits(CREDITS_PER_IMAGE, credits, setCredits, 'Image processing')) return;

    setLoading(true);
    setExtractedText("");
    setGeminiResponse(null);
    setError(null);

    try {
      const text = await processImage(uri);
      setExtractedText(text);
      
      // Automatically send to Gemini if text is extracted successfully
      if (text.trim()) {
        await handleSendToGemini();
      } else {
        showError("No text could be extracted from the image. Please try again with a clearer image.");
      }
    } catch (error: any) {
      console.error("Error processing image:", error);
      showError(error?.message || "Failed to process image. Please try again with a clearer image.", () => handleProcessImage(uri));
    } finally {
      setLoading(false);
    }
  };

  const handleSendToGemini = async () => {
    if (!extractedText.trim()) {
      showError("No valid question found to analyze.");
      return;
    }

    // Check if the text looks like an academic question
    const academicKeywords = [
      'solve', 'calculate', 'prove', 'explain', 'derive', 'find',
      'show', 'demonstrate', 'analyze', 'compare', 'contrast',
      'define', 'describe', 'evaluate', 'interpret', 'justify',
      'what', 'why', 'how', 'when', 'where', 'which'
    ];
    
    const isAcademicQuestion = academicKeywords.some(keyword => 
      extractedText.toLowerCase().includes(keyword)
    );

    if (!isAcademicQuestion) {
      Alert.alert(
        "Non-Academic Question",
        "This appears to be a non-academic question. The AI tutor is designed to help with academic questions in subjects like Mathematics, Physics, Chemistry, Biology, and Computer Science. Would you like to proceed anyway?",
        [
          {
            text: "Yes, Proceed",
            onPress: async () => {
              if (!await deductCredits(CREDITS_PER_GEMINI_REQUEST, credits, setCredits, 'Gemini request')) return;
              await processGeminiRequest();
            }
          },
          {
            text: "No, Cancel",
            style: "cancel"
          }
        ]
      );
      return;
    }

    if (!await deductCredits(CREDITS_PER_GEMINI_REQUEST, credits, setCredits, 'Gemini request')) return;
    await processGeminiRequest();
  };

  const processGeminiRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await sendToGemini(extractedText);
      setGeminiResponse(response);
      
      await saveToHistory({
        imageUri,
        extractedText,
        response,
      });
      await loadHistory();
    } catch (error: any) {
      console.error("Error fetching Gemini response:", error);
      showError(error?.message || "Failed to get AI response. Please try again later.", handleSendToGemini);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async (amount: number) => {
    await addCredits(amount, credits, setCredits, 'Credit purchase');
    await loadTransactions();
    setShowCreditModal(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <LinearGradient 
        colors={[colors.primary, colors.secondary, colors.accent]} 
        style={styles.gradientBackground}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>GetAnswer</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={() => setShowCreditModal(true)}
                style={[styles.creditButton, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.creditText, { color: colors.text }]}>
                  Credits: {credits}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
                <Ionicons 
                  name={isDark ? "sunny" : "moon"} 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.content, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.imageButton, { backgroundColor: colors.primary }]}
              onPress={pickImageSource}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.buttonText}>Take Photo of Question</Text>
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {geminiResponse ? "Analyzing with AI..." : "Processing image..."}
                </Text>
              </View>
            )}

            {imageUri && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            )}

            {extractedText && (
              <View style={styles.textContainer}>
                <View style={styles.textHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Extracted Text
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(extractedText)}
                    style={styles.copyButton}
                  >
                    <Ionicons name="copy" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.textScroll}>
                  <Text style={[styles.text, { color: colors.text }]}>
                    {extractedText}
                  </Text>
                </ScrollView>
              </View>
            )}

            {geminiResponse && (
              <View style={styles.responseContainer}>
                <View style={styles.textHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    AI Analysis
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(geminiResponse)}
                    style={styles.copyButton}
                  >
                    <Ionicons name="copy" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.textScroll}>
                  <Text style={[styles.text, { color: colors.text }]}>
                    {geminiResponse}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>

          {history.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Queries:</Text>
              {history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.historyItem, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}
                  onPress={() => {
                    setImageUri(item.imageUri);
                    setExtractedText(item.extractedText);
                    setGeminiResponse(item.response);
                  }}
                >
                  <Text style={[styles.historyText, { color: colors.text }]} numberOfLines={2}>
                    {item.extractedText}
                  </Text>
                  <Text style={[styles.historyDate, { color: isDark ? '#ffffff80' : '#00000080' }]}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Modal
            visible={showCreditModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCreditModal(false)}
          >
            <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Credits</Text>
                <View style={styles.creditOptions}>
                  <TouchableOpacity 
                    style={[styles.creditOption, { backgroundColor: colors.primary }]}
                    onPress={() => handleAddCredits(5)}
                  >
                    <Text style={styles.creditOptionText}>5 Credits</Text>
                    <Text style={styles.creditOptionPrice}>$0.99</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.creditOption, { backgroundColor: colors.primary }]}
                    onPress={() => handleAddCredits(15)}
                  >
                    <Text style={styles.creditOptionText}>15 Credits</Text>
                    <Text style={styles.creditOptionPrice}>$2.99</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.creditOption, { backgroundColor: colors.primary }]}
                    onPress={() => handleAddCredits(30)}
                  >
                    <Text style={styles.creditOptionText}>30 Credits</Text>
                    <Text style={styles.creditOptionPrice}>$4.99</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={[styles.closeButton, { backgroundColor: colors.accent }]}
                  onPress={() => setShowCreditModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {transactions.length > 0 && (
            <View style={styles.transactionsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions:</Text>
              {transactions.slice(0, 5).map((transaction) => (
                <View 
                  key={transaction.id}
                  style={[styles.transactionItem, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}
                >
                  <View style={styles.transactionHeader}>
                    <Text style={[styles.transactionType, { color: colors.text }]}>
                      {transaction.type === 'add' ? '+' : '-'}{transaction.amount} Credits
                    </Text>
                    <Text style={[styles.transactionDate, { color: isDark ? '#ffffff80' : '#00000080' }]}>
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.transactionReason, { color: colors.text }]}>
                    {transaction.reason}
                  </Text>
                </View>
              ))}
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
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  creditButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creditText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  content: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  imageContainer: {
    width: "100%",
    height: 240,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    width: "100%",
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  copyButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  responseContainer: {
    width: "100%",
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  textScroll: {
    maxHeight: 300,
  },
  text: {
    color: "white",
    fontSize: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  historyContainer: {
    width: '100%',
    marginTop: 24,
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  historyText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  historyDate: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  creditOptions: {
    width: '100%',
    gap: 16,
  },
  creditOption: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  creditOptionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  creditOptionPrice: {
    color: 'white',
    fontSize: 16,
    marginTop: 8,
    opacity: 0.8,
  },
  closeButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsContainer: {
    width: '100%',
    marginTop: 24,
  },
  transactionItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  transactionReason: {
    fontSize: 14,
    opacity: 0.8,
  },
} as const);