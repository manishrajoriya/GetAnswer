// import { AdMobRewarded } from "expo-ads-admob";
// import { addCredits } from "./creditUtils";

// export const showRewardedAd = async (credits: number, setCredits: React.Dispatch<React.SetStateAction<number>>) => {
//   try {
//     await AdMobRewarded.setAdUnitID("ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy"); // Replace with your Ad Unit ID
//     await AdMobRewarded.requestAdAsync();
//     await AdMobRewarded.showAdAsync();

//     // Give credits after ad is watched
//     AdMobRewarded.addEventListener("rewardedVideoUserDidEarnReward", async () => {
//       await addCredits(5, credits, setCredits); // Give 5 credits per ad
//     });

//   } catch (error) {
//     console.error("Error showing rewarded ad:", error);
//   }
// };
