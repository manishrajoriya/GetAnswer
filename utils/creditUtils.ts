import type React from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Alert } from "react-native"

export const loadCredits = async (setCredits: React.Dispatch<React.SetStateAction<number>>) => {
  const storedCredits = await AsyncStorage.getItem("userCredits")
  setCredits(storedCredits ? Number.parseInt(storedCredits, 10) : 10) // Default to 10 credits
}

export const deductCredits = (
  amount: number,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>,
): boolean => {
  if (credits >= amount) {
    setCredits(credits - amount)
    return true
  } else {
    Alert.alert("Insufficient Credits", "You don't have enough credits for this action.")
    return false
  }
}

