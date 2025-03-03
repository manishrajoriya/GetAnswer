import React, { useState, useEffect } from "react";
import { View, Text, Button, Image, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Tesseract from "tesseract.js";

const OCRScreen = () => {
  const [imageUri, setImageUri] = useState("");
  const [extractedText, setExtractedText] = useState("");
  
  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
    })();
  }, []);

  // Pick an image from the gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      extractText(result.assets[0].uri);
    }
  };

  // Extract text from the image using Tesseract.js
  const extractText = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data } = await Tesseract.recognize(`data:image/jpeg;base64,${base64}`, "eng");

      setExtractedText(data.text);
    } catch (error) {
      console.error("OCR Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick an Image" onPress={pickImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      <Text style={styles.text}>Extracted Text: {extractedText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  image: { width: 300, height: 400, marginTop: 20 },
  text: { marginTop: 20, padding: 10, backgroundColor: "#eee" },
});

export default OCRScreen;
