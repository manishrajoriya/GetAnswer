import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hide the header for all screens
        tabBarStyle: {
          backgroundColor: "#ffffff", // Light background
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0", // Subtle border
          paddingBottom: 5,
          paddingTop: 5,
          height: 60, // Slightly taller tab bar
        },
        
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#1e90ff", // Bright blue for active tab
        tabBarInactiveTintColor: "#a0a0a0", // Gray for inactive tabs
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 4, // Add spacing between icon and label
        },
        tabBarIconStyle: {
          marginTop: 4, // Add spacing above the icon
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Chat Tab with Badge */}
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: "Chat",
          tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}