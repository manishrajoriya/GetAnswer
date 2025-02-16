import type React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

// 🚀 Load user credits (default = 10)
export const loadCredits = async (setCredits: React.Dispatch<React.SetStateAction<number>>) => {
  try {
    const storedCredits = await AsyncStorage.getItem("userCredits");
    setCredits(storedCredits ? Number.parseInt(storedCredits, 10) : 10);
  } catch (error) {
    console.error("Error loading credits:", error);
    setCredits(10); // Default fallback
  }
};

// ⚡ Deduct credits (Ensure enough balance)
export const deductCredits = async (
  amount: number,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>
): Promise<boolean> => {
  if (credits < amount) {
    Alert.alert("Insufficient Credits", "You don't have enough credits for this action.");
    return false;
  }

  try {
    const newCredits = credits - amount;
    setCredits(newCredits);
    await AsyncStorage.setItem("userCredits", newCredits.toString());
    return true;
  } catch (error) {
    console.error("Error deducting credits:", error);
    Alert.alert("Error", "Something went wrong while deducting credits.");
    return false;
  }
};

// 🎁 Add credits (e.g., after watching ads)
export const addCredits = async (
  amount: number,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>
) => {
  try {
    const newCredits = credits + amount;
    setCredits(newCredits);
    await AsyncStorage.setItem("userCredits", newCredits.toString());
    Alert.alert("Credits Added", `You have successfully added ${amount} credits.`);
  } catch (error) {
    console.error("Error adding credits:", error);
    Alert.alert("Error", "Something went wrong while adding credits.");
  }
};
