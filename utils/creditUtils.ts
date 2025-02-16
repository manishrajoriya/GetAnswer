import type React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export const loadCredits = async (setCredits: React.Dispatch<React.SetStateAction<number>>) => {
  const storedCredits = await AsyncStorage.getItem("userCredits");
  setCredits(storedCredits ? Number.parseInt(storedCredits, 10) : 10); // Default to 10 credits
};

export const deductCredits = (
  amount: number,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>
): boolean => {
  if (credits >= amount) {
    const newCredits = credits - amount;
    setCredits(newCredits);
    AsyncStorage.setItem("userCredits", newCredits.toString()); // Update storage
    return true;
  } else {
    Alert.alert("Insufficient Credits", "You don't have enough credits for this action.");
    return false;
  }
};

export const addCredits = async (
  amount: number,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>
) => {
  const newCredits = credits + amount;
  setCredits(newCredits);
  await AsyncStorage.setItem("userCredits", newCredits.toString()); // Save updated credits
  Alert.alert("Credits Added", `You have successfully added ${amount} credits.`);
};
