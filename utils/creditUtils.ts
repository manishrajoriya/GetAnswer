import type React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export interface CreditTransaction {
  id: string;
  type: 'deduct' | 'add' | 'restore';
  amount: number;
  reason: string;
  timestamp: number;
  status: 'success' | 'failed';
}

const CREDITS_KEY = "userCredits";
const TRANSACTIONS_KEY = "creditTransactions";
const DEFAULT_CREDITS = 10;

// 🚀 Load user credits
export const loadCredits = async (setCredits: React.Dispatch<React.SetStateAction<number>>) => {
  try {
    const storedCredits = await AsyncStorage.getItem(CREDITS_KEY);
    setCredits(storedCredits ? Number.parseInt(storedCredits, 10) : DEFAULT_CREDITS);
  } catch (error) {
    console.error("Error loading credits:", error);
    setCredits(DEFAULT_CREDITS); // Default fallback
  }
};

// 📜 Get credit transactions
export const getCreditTransactions = async (): Promise<CreditTransaction[]> => {
  try {
    const transactionsJson = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return transactionsJson ? JSON.parse(transactionsJson) : [];
  } catch (error) {
    console.error("Error loading transactions:", error);
    return [];
  }
};

// ⚡ Deduct credits with transaction history
export const deductCredits = async (
  amount: number,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>,
  reason: string
): Promise<boolean> => {
  if (credits < amount) {
    Alert.alert("Insufficient Credits", "You don't have enough credits for this action.");
    return false;
  }

  try {
    const newCredits = credits - amount;
    setCredits(newCredits);
    await AsyncStorage.setItem(CREDITS_KEY, newCredits.toString());

    // Record transaction
    const transactions = await getCreditTransactions();
    const transaction: CreditTransaction = {
      id: Date.now().toString(),
      type: 'deduct',
      amount,
      reason,
      timestamp: Date.now(),
      status: 'success'
    };
    transactions.push(transaction);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

    return true;
  } catch (error) {
    console.error("Error deducting credits:", error);
    Alert.alert("Error", "Something went wrong while deducting credits.");
    return false;
  }
};

// 🎁 Add credits with transaction history
export const addCredits = async (
  amount: number,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>,
  reason: string
) => {
  try {
    const newCredits = credits + amount;
    setCredits(newCredits);
    await AsyncStorage.setItem(CREDITS_KEY, newCredits.toString());

    // Record transaction
    const transactions = await getCreditTransactions();
    const transaction: CreditTransaction = {
      id: Date.now().toString(),
      type: 'add',
      amount,
      reason,
      timestamp: Date.now(),
      status: 'success'
    };
    transactions.push(transaction);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

    Alert.alert("Credits Added", `You have successfully added ${amount} credits.`);
  } catch (error) {
    console.error("Error adding credits:", error);
    Alert.alert("Error", "Something went wrong while adding credits.");
  }
};

// 🔄 Restore credits for failed transactions
export const restoreCredits = async (
  transactionId: string,
  credits: number,
  setCredits: React.Dispatch<React.SetStateAction<number>>
) => {
  try {
    const transactions = await getCreditTransactions();
    const transaction = transactions.find(t => t.id === transactionId);
    
    if (!transaction || transaction.type !== 'deduct') {
      throw new Error('Invalid transaction to restore');
    }

    const newCredits = credits + transaction.amount;
    setCredits(newCredits);
    await AsyncStorage.setItem(CREDITS_KEY, newCredits.toString());

    // Update transaction status
    const updatedTransactions = transactions.map(t => 
      t.id === transactionId ? { ...t, status: 'failed' } : t
    );
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updatedTransactions));

    Alert.alert("Credits Restored", `Your credits have been restored.`);
  } catch (error) {
    console.error("Error restoring credits:", error);
    Alert.alert("Error", "Something went wrong while restoring credits.");
  }
};
