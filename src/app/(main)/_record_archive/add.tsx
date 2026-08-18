import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/services/api';
import { Camera, UploadCloud, XCircle } from 'lucide-react-native';

export default function AddRecordScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    serialNumber: '',
    pageNumber: '',
    category: '',
    description: '',
    tags: '',
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Axios multipart request
      const response = await api.post('/api/records', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Record uploaded successfully!');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Upload Failed', 'There was an error uploading the record. Please try again.');
      console.error(error);
    }
  });

  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // This allows basic cropping in the OS
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      await processImage(pickerResult.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      await processImage(pickerResult.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    try {
      // Compress the image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // Resize for consistency
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImageUri(manipResult.uri);
    } catch (e) {
      Alert.alert('Error processing image');
    }
  };

  const handleUpload = () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please take or select a picture first.');
      return;
    }
    if (!form.name || !form.serialNumber) {
      Alert.alert('Error', 'Name and Serial Number are required.');
      return;
    }

    const formData = new FormData();
    
    // Append file
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    // Append fields
    Object.keys(form).forEach(key => {
      formData.append(key, form[key as keyof typeof form]);
    });
    
    // Auto-attach current date if needed by backend, or backend handles it
    formData.append('date', new Date().toISOString());

    uploadMutation.mutate(formData);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ThemedText type="title">Add New Record</ThemedText>
        </View>

        <Card style={styles.imageCard}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <Button 
                title="Remove" 
                variant="danger" 
                leftIcon={<XCircle color="#FFF" size={18} />} 
                onPress={() => setImageUri(null)}
                style={styles.removeButton}
              />
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Button 
                title="Take Picture" 
                leftIcon={<Camera color="#FFF" size={20} />} 
                onPress={takePicture}
                style={styles.photoButton}
              />
              <Button 
                title="Choose from Gallery" 
                variant="secondary"
                onPress={pickImage}
              />
            </View>
          )}
        </Card>

        <Card>
          <TextInput
            label="Name *"
            placeholder="Document Name"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <TextInput
            label="Serial Number *"
            placeholder="e.g. SN-123456"
            value={form.serialNumber}
            onChangeText={(v) => setForm({ ...form, serialNumber: v })}
          />
          <View style={styles.row}>
            <TextInput
              label="Page Number"
              placeholder="e.g. 1"
              keyboardType="numeric"
              value={form.pageNumber}
              onChangeText={(v) => setForm({ ...form, pageNumber: v })}
              style={[styles.flex1, { marginRight: 8 }]}
            />
            <TextInput
              label="Category"
              placeholder="e.g. HR"
              value={form.category}
              onChangeText={(v) => setForm({ ...form, category: v })}
              style={[styles.flex1, { marginLeft: 8 }]}
            />
          </View>
          <TextInput
            label="Description"
            placeholder="Short description..."
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <TextInput
            label="Tags (comma separated)"
            placeholder="tag1, tag2"
            value={form.tags}
            onChangeText={(v) => setForm({ ...form, tags: v })}
          />
        </Card>

        <Button 
          title="Upload Record" 
          leftIcon={<UploadCloud color="#FFF" size={20} />} 
          onPress={handleUpload}
          isLoading={uploadMutation.isPending}
          style={styles.uploadButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  imageCard: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  imagePlaceholder: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    marginBottom: 12,
    width: '100%',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  uploadButton: {
    marginTop: 16,
    height: 56,
  }
});
