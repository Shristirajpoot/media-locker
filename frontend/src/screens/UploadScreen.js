import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../api/client';
import { Camera, Coins, Image as ImageIcon, Sparkles, X } from 'lucide-react-native';

export default function UploadScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8, // Basic client-side compression before upload
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image first.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title.');
      return;
    }
    const unlockPrice = parseInt(price, 10);
    if (isNaN(unlockPrice) || unlockPrice <= 0) {
      Alert.alert('Error', 'Please enter a valid coin price greater than 0.');
      return;
    }

    setLoading(true);

    // Prepare multipart form data
    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('price', unlockPrice.toString());

    // File name and extension parsing
    const uri = image.uri;
    const fileType = uri.substring(uri.lastIndexOf('.') + 1);
    
    // Format file object for Multer
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: `upload-${Date.now()}.${fileType}`,
      type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
    });

    try {
      await apiClient.post('/api/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success 🎉', 'Your image has been published and monetized!', [
        { text: 'Back to Feed', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Upload request failed', e.response?.data || e.message);
      const errMsg = e.response?.data?.error || 'Failed to upload image. Please try again.';
      Alert.alert('Upload Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Monetize Image</Text>
          <Text style={styles.screenSubtitle}>Upload an image and set a price. Other users will see a blurred preview until they pay.</Text>

          {/* Image Picker Box */}
          <TouchableOpacity
            style={[styles.imagePicker, image && styles.imagePickerActive]}
            activeOpacity={0.8}
            onPress={pickImage}
          >
            {image ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.clearImageBtn} onPress={() => setImage(null)}>
                  <X color="#ffffff" size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickerPlaceholder}>
                <View style={styles.pickerIconCircle}>
                  <ImageIcon color="#9ca3af" size={32} />
                </View>
                <Text style={styles.pickerText}>Select Image from Library</Text>
                <Text style={styles.pickerSubtext}>Supports JPG, PNG, WEBP (Max 10MB)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.form}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Secret Sunset"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide some details to entice unlocks..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Unlock Price (Coins)</Text>
            <View style={styles.priceInputContainer}>
              <Coins color="#f59e0b" size={20} style={styles.priceIcon} />
              <TextInput
                style={styles.priceInput}
                placeholder="25"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, !image && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={loading || !image}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <View style={styles.uploadBtnContent}>
                  <Sparkles color="#0f172a" size={20} style={styles.btnIcon} />
                  <Text style={styles.uploadButtonText}>Publish & Monetize</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginBottom: 24,
  },
  imagePicker: {
    width: '100%',
    height: 240,
    backgroundColor: '#1e1e24',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  imagePickerActive: {
    borderColor: '#f59e0b',
    borderStyle: 'solid',
  },
  pickerPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  pickerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2d2d34',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  pickerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  clearImageBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    paddingBottom: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 28,
  },
  priceIcon: {
    marginRight: 10,
  },
  priceInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  uploadButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonDisabled: {
    backgroundColor: '#4b5563',
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
});
