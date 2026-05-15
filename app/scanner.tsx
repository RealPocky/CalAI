import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator, Alert, Animated, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
// 🌟 ใช้ SVG Icons แทนทั้งหมด
import { X, ChevronDown, Info, Camera as CameraIcon, Tag, Zap, ZapOff, Image as ImageIcon, Sparkles, Pencil } from 'lucide-react-native';
import { MotiView } from 'moti';

import { API_BASE_URL, useAppContext } from '../src/AppContext';

const { width, height } = Dimensions.get('window');
const scanAreaSize = width * 0.75;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null); 
  
  const { addFoodToMeal } = useAppContext();
  
  const [flashMode, setFlashMode] = useState(false);
  const [activeTab, setActiveTab] = useState('scan'); 
  const [currentMeal, setCurrentMeal] = useState('อาหารว่าง');
  const [isLoading, setIsLoading] = useState(false); 

  const [modalVisible, setModalVisible] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('0');
  const [editProtein, setEditProtein] = useState('0');
  const [editCarbs, setEditCarbs] = useState('0');
  const [editFat, setEditFat] = useState('0');

  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: scanAreaSize - 4, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 10) setCurrentMeal('อาหารเช้า');
    else if (currentHour >= 10 && currentHour < 14) setCurrentMeal('อาหารกลางวัน');
    else if (currentHour >= 14 && currentHour < 17) setCurrentMeal('อาหารว่าง');
    else if (currentHour >= 17 && currentHour < 22) setCurrentMeal('อาหารเย็น');
    else setCurrentMeal('อาหารว่าง');
  }, []);

  const analyzeImage = async (base64Image: string) => {
    setIsLoading(true); 
    try {
      const backendResponse = await fetch(`${API_BASE_URL}/api/analyze-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      if (!backendResponse.ok) throw new Error(`HTTP error! status: ${backendResponse.status}`);

      const foodData = await backendResponse.json();

      if (foodData.error) {
        Alert.alert("à¸­à¹Šà¸°! ðŸ§", foodData.error);
        return;
      }

      setEditName(foodData.name);
      setEditCalories(foodData.calories.toString());
      setEditProtein(foodData.protein.toString());
      setEditCarbs(foodData.carbs.toString());
      setEditFat(foodData.fat.toString());
      setModalVisible(true);
      return;

      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer unused",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct", 
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `วิเคราะห์รูปอาหารนี้ให้หน่อย ขอชื่อเมนูภาษาไทย, แคลอรี่โดยประมาณ, และโภชนาการ (โปรตีน, คาร์บ, ไขมัน) ตอบกลับมาเป็น JSON Format แบบนี้เท่านั้น: {"name": "ชื่ออาหาร", "calories": 000, "protein": 00, "carbs": 00, "fat": 00}
                  
                  ⚠️ แต่ถ้ารูปนี้ "ไม่ใช่อาหาร" ให้ตอบกลับเป็น JSON แบบนี้เท่านั้น: {"error": "นี่ไม่ใช่รูปอาหาร ลองสแกนใหม่อีกครั้งนะครับ 😅"}
                  ห้ามพิมพ์ข้อความอธิบายใดๆ นอกเหนือจาก JSON เด็ดขาด`
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
                }
              ]
            }
          ],
          temperature: 0.1, 
          max_tokens: 1024
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      const text = result.choices[0].message.content;
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const legacyFoodData = JSON.parse(cleanJson);

      if (foodData.error) {
        Alert.alert("อ๊ะ! 🧐", foodData.error);
        return; 
      }

      setEditName(foodData.name);
      setEditCalories(foodData.calories.toString());
      setEditProtein(foodData.protein.toString());
      setEditCarbs(foodData.carbs.toString());
      setEditFat(foodData.fat.toString());
      
      setModalVisible(true);

    } catch (error) {
      console.error("Parse/Groq Error:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ภาพไม่ชัดเจน หรือมีอะไรบังอยู่ ลองถ่ายใหม่อีกครั้งนะครับ");
    } finally {
      setIsLoading(false); 
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      if (isLoading) return; 
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5, skipProcessing: false });
        if (photo && photo.base64) analyzeImage(photo.base64); 
      } catch (error) {
        console.error("Error taking picture:", error);
      }
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, 
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      analyzeImage(result.assets[0].base64);
    }
  };

  const handleSaveToDiary = () => {
    const mealKeyMap: Record<string, 'breakfast' | 'lunch' | 'dinner' | 'snack'> = {
      'อาหารเช้า': 'breakfast',
      'อาหารกลางวัน': 'lunch',
      'อาหารเย็น': 'dinner',
      'อาหารว่าง': 'snack'
    };
    
    const selectedMealKey = mealKeyMap[currentMeal] || 'snack';

    const newFood = {
      id: Date.now().toString(), 
      name: editName,
      calories: parseInt(editCalories) || 0,
      protein: parseInt(editProtein) || 0,
      carbs: parseInt(editCarbs) || 0,
      fat: parseInt(editFat) || 0,
    };

    addFoodToMeal(selectedMealKey, newFood); 
    setModalVisible(false); 
    router.back(); 
  };

  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.warningText}>แอปจำเป็นต้องใช้กล้องเพื่อสแกนอาหารครับ 🥗</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionText}>อนุญาตให้ใช้กล้อง</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" enableTorch={flashMode}>
        <View pointerEvents="none" style={styles.massiveBorder} />
        <View pointerEvents="none" style={styles.scanFrameContainer}>
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <SafeAreaView style={styles.topSection}>
          <View style={styles.headerRow}>
            {/* 🌟 ไอคอน X */}
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
              <X size={24} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mealSelector}>
              <Text style={styles.mealText}>{currentMeal}</Text>
              {/* 🌟 ไอคอนลูกศร */}
              <ChevronDown size={16} color="#FFF" style={{ marginLeft: 5 }} />
            </TouchableOpacity>

            {/* 🌟 ไอคอน Info */}
            <TouchableOpacity style={styles.iconCircle}>
              <Info size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <SafeAreaView style={styles.bottomSection}>
          <View style={styles.tabsContainer}>
            {/* 🌟 ไอคอนกล้อง */}
            <TouchableOpacity style={[styles.tab, activeTab === 'scan' && styles.activeTab]} onPress={() => setActiveTab('scan')}>
              <CameraIcon size={20} color={activeTab === 'scan' ? '#4CAF50' : '#888'} />
              <Text style={[styles.tabText, activeTab === 'scan' && { color: '#4CAF50' }]}>สแกนอาหาร</Text>
            </TouchableOpacity>
            {/* 🌟 ไอคอนป้ายฉลาก */}
            <TouchableOpacity style={[styles.tab, activeTab === 'label' && styles.activeTab]} onPress={() => setActiveTab('label')}>
              <Tag size={20} color={activeTab === 'label' ? '#4CAF50' : '#888'} />
              <Text style={[styles.tabText, activeTab === 'label' && { color: '#4CAF50' }]}>ฉลากอาหาร</Text>
            </TouchableOpacity>
            {/* 🚫 ถอดปุ่มบาร์โค้ดออกตามรีเควส */}
          </View>

          <View style={styles.controlsRow}>
            {/* 🌟 ไอคอนแฟลช */}
            <TouchableOpacity style={styles.controlBtn} onPress={() => setFlashMode(!flashMode)}>
              {flashMode ? <Zap size={24} color="#FFF" /> : <ZapOff size={24} color="#FFF" />}
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.captureOuter} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            {/* 🌟 ไอคอนรูปภาพ */}
            <TouchableOpacity style={styles.controlBtn} onPress={pickImage}>
              <ImageIcon size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>AI กำลังวิเคราะห์เมนู...</Text>
            </MotiView>
          </View>
        )}
      </CameraView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <MotiView 
            from={{ opacity: 0, scale: 0.9, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              {/* 🌟 ไอคอนวิ้งๆ */}
              <Sparkles size={24} color="#FFD700" />
              <Text style={styles.modalTitle}>สแกนสำเร็จ!</Text>
            </View>

            <View style={styles.editableFieldContainer}>
              <TextInput 
                style={styles.editNameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="ชื่ออาหาร"
              />
              {/* 🌟 ไอคอนดินสอแก้ไข */}
              <Pencil size={16} color="#BBB" style={styles.editIcon} />
            </View>
            
            <View style={styles.editableFieldContainer}>
              <TextInput 
                style={styles.editCalorieInput}
                value={editCalories}
                onChangeText={setEditCalories}
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={styles.kcalText}>kcal</Text>
              <Pencil size={16} color="#BBB" style={[styles.editIcon, { marginBottom: 15 }]} />
            </View>

            <View style={styles.macroContainer}>
              <View style={styles.macroItem}>
                <View style={[styles.iconCircleBg, { backgroundColor: '#FFF8E1' }]}><Text style={styles.emojiIcon}>🍞</Text></View>
                <Text style={styles.macroLabel}>คาร์บ</Text>
                <TextInput style={styles.macroInput} value={editCarbs} onChangeText={setEditCarbs} keyboardType="numeric" />
              </View>

              <View style={styles.macroItem}>
                <View style={[styles.iconCircleBg, { backgroundColor: '#FFEBEE' }]}><Text style={styles.emojiIcon}>🥩</Text></View>
                <Text style={styles.macroLabel}>โปรตีน</Text>
                <TextInput style={styles.macroInput} value={editProtein} onChangeText={setEditProtein} keyboardType="numeric" />
              </View>

              <View style={styles.macroItem}>
                <View style={[styles.iconCircleBg, { backgroundColor: '#E3F2FD' }]}><Text style={styles.emojiIcon}>🥑</Text></View>
                <Text style={styles.macroLabel}>ไขมัน</Text>
                <TextInput style={styles.macroInput} value={editFat} onChangeText={setEditFat} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={handleSaveToDiary}>
              <Text style={styles.closeModalText}>เพิ่มลงไดอารี่</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 15 }} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#888', fontWeight: 'bold' }}>ยกเลิก</Text>
            </TouchableOpacity>

          </MotiView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F0F4F0' },
  warningText: { fontSize: 18, color: '#333', marginBottom: 20, fontWeight: 'bold' },
  permissionButton: { backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  permissionText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  massiveBorder: { position: 'absolute', top: '50%', left: '50%', width: scanAreaSize + 2 * height, height: scanAreaSize + 2 * height, marginLeft: -(scanAreaSize / 2) - height, marginTop: -(scanAreaSize / 2) - height, borderRadius: 24 + height, borderColor: 'rgba(0,0,0,0.6)', borderWidth: height },
  scanFrameContainer: { position: 'absolute', top: '50%', left: '50%', width: scanAreaSize, height: scanAreaSize, marginLeft: -scanAreaSize / 2, marginTop: -scanAreaSize / 2, borderRadius: 24, overflow: 'hidden' },
  scanLine: { width: '100%', height: 3, backgroundColor: '#4CAF50', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 5 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#FFF', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 24 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 24 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 24 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 24 },

  topSection: { position: 'absolute', top: 0, width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  mealSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  mealText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  bottomSection: { position: 'absolute', bottom: 0, width: '100%', paddingBottom: 40 },
  tabsContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20, marginBottom: 30 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginHorizontal: 5 },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, borderBottomWidth: 0 },
  tabText: { color: '#888', marginTop: 8, fontSize: 12, fontWeight: 'bold' },

  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 40 },
  controlBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFF' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  loadingBox: { backgroundColor: '#FFF', padding: 30, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
  loadingText: { fontSize: 18, fontWeight: 'bold', color: '#1B5E20', marginTop: 15 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#FFF', width: width * 0.9, borderRadius: 35, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.4, shadowRadius: 25, elevation: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', marginLeft: 10 },
  
  editableFieldContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 5, marginBottom: 15, width: '100%' },
  editNameInput: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', flex: 1 },
  editCalorieInput: { fontSize: 50, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginRight: 5, padding: 0 },
  editIcon: { position: 'absolute', right: 0 },
  
  kcalText: { fontSize: 22, color: '#888', fontWeight: 'normal', marginBottom: 10 },
  
  macroContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 30, marginTop: 10 },
  macroItem: { alignItems: 'center', flex: 1 },
  iconCircleBg: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emojiIcon: { fontSize: 28 },
  macroLabel: { color: '#888', fontSize: 13, marginBottom: 6, fontWeight: '500' },
  macroInput: { backgroundColor: '#F5F5F5', borderRadius: 8, width: 50, textAlign: 'center', paddingVertical: 5, fontSize: 16, fontWeight: 'bold', color: '#333' },
  
  closeModalBtn: { backgroundColor: '#4CAF50', width: '100%', paddingVertical: 18, borderRadius: 30, alignItems: 'center', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  closeModalText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
