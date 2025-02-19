// import * as InAppPurchases from "expo-in-app-purchases";
// import { addCredits } from "./creditUtils";

// const productIds = ["credits_50", "credits_100"]; // Replace with your actual Play Store product IDs

// export const setupIAP = async () => {
//   try {
//     await InAppPurchases.connectAsync();
//     const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);

//     if (responseCode === InAppPurchases.IAPResponseCode.OK) {
//       console.log("Products:", results);
//     }
//   } catch (error) {
//     console.error("Error setting up IAP:", error);
//   }
// };

// export const purchaseCredits = async (productId: string) => {
//   try {
//     await InAppPurchases.purchaseItemAsync(productId);
//   } catch (error) {
//     console.error("Error purchasing:", error);
//   }
// };

// // Listen for successful purchases
// InAppPurchases.setPurchaseListener(async ({ responseCode, results }) => {
//   if (responseCode === InAppPurchases.IAPResponseCode.OK) {
//     for (const purchase of results!) {
//       if (!purchase.acknowledged) {
//         if (purchase.productId === "credits_50") {
//           await addCredits(50, 0, () => {}); // Add 50 credits
//         } else if (purchase.productId === "credits_100") {
//           await addCredits(100, 0, () => {}); // Add 100 credits
//         }

//         // Acknowledge the purchase
//         await InAppPurchases.finishTransactionAsync(purchase, true);
//       }
//     }
//   }
// });
