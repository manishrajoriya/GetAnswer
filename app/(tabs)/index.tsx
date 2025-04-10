import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/themeContext';
import { loadCredits } from '../../utils/creditUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const lightColors = {
  primary: "#4c669f",
  secondary: "#3b5998",
  accent: "#192f6a",
  background: "#ffffff",
  text: "#000000",
  card: "#f5f5f5",
  border: "#e0e0e0",
};

const darkColors = {
  primary: "#1a237e",
  secondary: "#0d47a1",
  accent: "#000051",
  background: "#121212",
  text: "#ffffff",
  card: "#1e1e1e",
  border: "#333333",
};

interface UserData {
  name: string;
  email: string;
  avatar: string;
}

export default function ProfileScreen() {
  const { isDark, theme, setTheme } = useTheme();
  const colors = isDark ? darkColors : lightColors;
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(isDark);
  const [credits, setCredits] = useState<number>(0);
  const [userData, setUserData] = useState<UserData>({
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'https://via.placeholder.com/150',
  });

  useEffect(() => {
    loadUserData();
    loadCredits(setCredits);
    loadNotificationSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem('notifications');
      if (storedNotifications !== null) {
        setNotifications(JSON.parse(storedNotifications));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleAvatarChange = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions to change your avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const newUserData = {
          ...userData,
          avatar: result.assets[0].uri,
        };
        setUserData(newUserData);
        await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
      }
    } catch (error) {
      console.error('Error changing avatar:', error);
      Alert.alert('Error', 'Failed to change avatar. Please try again.');
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotifications(value);
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userData');
              await AsyncStorage.removeItem('userCredits');
              await AsyncStorage.removeItem('notifications');
              // Add any additional cleanup here
              // You might want to navigate to the login screen
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <LinearGradient 
        colors={[colors.primary, colors.secondary, colors.accent]} 
        style={styles.gradientBackground}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: userData.avatar }}
                style={styles.avatar}
              />
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={handleAvatarChange}
              >
                <Ionicons name="camera" size={20} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>{userData.name}</Text>
            <Text style={[styles.userEmail, { color: colors.text }]}>{userData.email}</Text>
          </View>

          {/* Stats Section */}
          <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>150</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Questions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{credits}</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Credits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>98%</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Accuracy</Text>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.settingsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            
            <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={24} color={colors.text} />
                <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notifications ? colors.accent : colors.border}
              />
            </View>

            <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
              <View style={styles.settingLeft}>
                <Ionicons name={darkMode ? "moon" : "sunny"} size={24} color={colors.text} />
                <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={darkMode ? colors.accent : colors.border}
              />
            </View>

            <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle" size={24} color={colors.text} />
                <Text style={[styles.settingText, { color: colors.text }]}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </View>

            <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
              <View style={styles.settingLeft}>
                <Ionicons name="information-circle" size={24} color={colors.text} />
                <Text style={[styles.settingText, { color: colors.text }]}>About</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.card }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color="#ff4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#075e54',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  logoutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
} as const);
