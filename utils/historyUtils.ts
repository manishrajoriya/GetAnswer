import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryItem {
  id: string;
  imageUri: string | null;
  extractedText: string;
  response: string;
  timestamp: number;
}

const HISTORY_KEY = 'queryHistory';
const MAX_HISTORY_ITEMS = 50;

export const saveToHistory = async (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
  try {
    const history = await getHistory();
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    // Add new item to the beginning of the array
    history.unshift(newItem);

    // Keep only the last MAX_HISTORY_ITEMS items
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    return newItem;
  } catch (error) {
    console.error('Error saving to history:', error);
    throw error;
  }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
};

export const deleteHistoryItem = async (id: string) => {
  try {
    const history = await getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error deleting history item:', error);
    throw error;
  }
}; 