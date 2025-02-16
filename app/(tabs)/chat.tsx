import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import * as Clipboard from "expo-clipboard";
import { sendToGemini } from "@/utils/apiUtils"; // Ensure this import is correct
import { loadCredits } from "@/utils/creditUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Message {
  id: string;
  text: string;
  sender: "user" | "other";
}

const CREDITS_PER_GEMINI_REQUEST = 2;

const { width } = Dimensions.get("window");

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
   const [credits, setCredits] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
    loadCredits(setCredits);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("userCredits", credits.toString());
  }, [credits]);
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInputText("");
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const responseText = await sendToGemini(inputText.trim());
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "other",
      };
      setMessages((prevMessages) => [...prevMessages, responseMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied!", "The message has been copied to your clipboard.");
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const formattedText = item.text
      .replace(/\\n/g, "\n")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\\"/g, '"');

    return (
      <TouchableOpacity
        onPress={() => copyToClipboard(formattedText)}
        activeOpacity={0.7}
      >
        <Animatable.View
          animation={item.sender === "user" ? "fadeInRight" : "fadeInLeft"}
          duration={500}
          style={[
            styles.messageBubble,
            item.sender === "user" ? styles.userMessage : styles.otherMessage,
          ]}
        >
          <Text style={styles.messageText}>{formattedText}</Text>
        </Animatable.View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={["#4c669f", "#3b5998", "#192f6a"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 25}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          <Animatable.View
            animation="fadeInUp"
            duration={500}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a question..."
              placeholderTextColor="#999"
              editable={!isLoading}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Get</Text>
              )}
            </TouchableOpacity>
          </Animatable.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16, // Add padding at the top for better spacing
  },
  messageBubble: {
    maxWidth: width * 0.8,
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#dcf8c6",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#075e54",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});