// import type React from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { Alert, Platform } from "react-native";
// import * as Store from "react-native-iap";
// import {
//   AdMobRewarded,
//   setTestDeviceIDAsync,
// } from "expo-ads-admob";

// // 🔹 In-App Purchase Product ID
// const PRODUCT_ID = Platform.select({
//   ios: "your_ios_product_id",
//   android: "your_android_product_id",
// });

// // 🚀 Load user credits (default = 10)
// export const loadCredits = async (setCredits: React.Dispatch<React.SetStateAction<number>>) => {
//   try {
//     const storedCredits = await AsyncStorage.getItem("userCredits");
//     setCredits(storedCredits ? Number.parseInt(storedCredits, 10) : 10);
//   } catch (error) {
//     console.error("Error loading credits:", error);
//     setCredits(10); // Default fallback
//   }
// };

// // ⚡ Deduct credits (Ensure enough balance)
// export const deductCredits = async (
//   amount: number,
//   credits: number,
//   setCredits: React.Dispatch<React.SetStateAction<number>>
// ): Promise<boolean> => {
//   if (credits < amount) {
//     Alert.alert("Insufficient Credits", "You don't have enough credits for this action.");
//     return false;
//   }

//   try {
//     const newCredits = credits - amount;
//     setCredits(newCredits);
//     await AsyncStorage.setItem("userCredits", newCredits.toString());
//     return true;
//   } catch (error) {
//     console.error("Error deducting credits:", error);
//     Alert.alert("Error", "Something went wrong while deducting credits.");
//     return false;
//   }
// };

// // 🎁 Add credits (e.g., after watching ads)
// export const addCredits = async (
//   amount: number,
//   credits: number,
//   setCredits: React.Dispatch<React.SetStateAction<number>>
// ) => {
//   try {
//     const newCredits = credits + amount;
//     setCredits(newCredits);
//     await AsyncStorage.setItem("userCredits", newCredits.toString());
//     Alert.alert("Credits Added", `You have successfully added ${amount} credits.`);
//   } catch (error) {
//     console.error("Error adding credits:", error);
//     Alert.alert("Error", "Something went wrong while adding credits.");
//   }
// };

// // 🛒 Initialize IAP
// export const initIAP = async () => {
//   try {
//     await Store.initConnection();
//     console.log("✅ IAP Connection Established");
//   } catch (error) {
//     console.error("❌ IAP Error:", error);
//   }
// };

// // 💳 Purchase Credits via IAP
// export const purchaseCredits = async (setCredits: (credits: number) => void, credits: number) => {
//   try {
//     const purchase = await Store.requestPurchase({ sku: PRODUCT_ID });
//     if (purchase) {
//       addCredits(50, credits, setCredits); // Grant 50 credits on successful purchase
//       Alert.alert("Purchase Successful", "You have received 50 credits.");
//     }
//   } catch (error) {
//     console.error("❌ Purchase Error:", error);
//     Alert.alert("Purchase Failed", "Something went wrong.");
//   }
// };

// // 🎬 Show Rewarded Ad for Free Credits
// export const showRewardedAd = async (setCredits: (credits: number) => void, credits: number) => {
//   try {
//     await setTestDeviceIDAsync("EMULATOR"); // Use test ads in development
//     await AdMobRewarded.setAdUnitID("your-admob-unit-id"); // Set your AdMob Rewarded Ad Unit ID
//     await AdMobRewarded.requestAdAsync();
//     await AdMobRewarded.showAdAsync();

//     AdMobRewarded.addEventListener("rewardedVideoDidRewardUser", () => {
//       addCredits(10, credits, setCredits); // Reward 10 credits for watching an ad
//     });

//     AdMobRewarded.addEventListener("rewardedVideoDidClose", () => {
//       console.log("🔻 Ad Closed");
//     });
//   } catch (error) {
//     console.error("❌ Ad Error:", error);
//     Alert.alert("Ad Error", "Failed to load rewarded ad.");
//   }
// };
