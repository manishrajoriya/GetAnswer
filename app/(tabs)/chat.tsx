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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { sendToGemini } from "@/utils/apiUtils";
import { deductCredits, loadCredits } from "@/utils/creditUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  status?: "sending" | "sent" | "error";
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
      timestamp: new Date(),
      status: "sending",
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInputText("");
    setIsLoading(true);
    Keyboard.dismiss();

    if (!await deductCredits(CREDITS_PER_GEMINI_REQUEST, credits, setCredits, 'Chat message')) return;

    try {
      const responseText = await sendToGemini(inputText.trim());
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date(),
        status: "sent",
      };
      setMessages((prevMessages) => [...prevMessages, responseMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prevMessages) => 
        prevMessages.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: "error" }
            : msg
        )
      );
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
      <Animatable.View
        animation={item.sender === "user" ? "fadeInRight" : "fadeInLeft"}
        duration={500}
        style={[
          styles.messageContainer,
          item.sender === "user" ? styles.userMessage : styles.aiMessage,
        ]}
      >
        <View style={styles.messageContent}>
          <Text style={styles.messageText}>{formattedText}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.sender === "user" && (
              <View style={styles.messageStatus}>
                {item.status === "sending" && (
                  <ActivityIndicator size="small" color="#666" />
                )}
                {item.status === "error" && (
                  <Ionicons name="alert-circle" size={16} color="#ff4444" />
                )}
                {item.status === "sent" && (
                  <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
                )}
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copyToClipboard(formattedText)}
        >
          <Ionicons name="copy-outline" size={16} color="#666" />
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  return (
    <LinearGradient
      colors={["#4c669f", "#3b5998", "#192f6a"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Academic Chat</Text>
          <View style={styles.creditsContainer}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.creditsText}>{credits}</Text>
          </View>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses" size={48} color="#999" />
                <Text style={styles.emptyText}>
                  Start a conversation by typing your academic question
                </Text>
              </View>
            }
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your academic question..."
              placeholderTextColor="#999"
              editable={!isLoading}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="send" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 0.5,
  },
  creditsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  creditsText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  messageContainer: {
    maxWidth: width * 0.8,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#075e54",
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderBottomLeftRadius: 4,
  },
  messageContent: {
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: "white",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  messageTime: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  messageStatus: {
    marginLeft: 8,
  },
  copyButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    color: "white",
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: "#075e54",
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    marginTop: 16,
    paddingHorizontal: 32,
  },
} as const);