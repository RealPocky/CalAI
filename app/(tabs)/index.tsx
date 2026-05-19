import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, Keyboard, Platform, Animated, KeyboardAvoidingView } from 'react-native';
// 🌟 เปลี่ยนมาใช้ไอคอนแบบ SVG ของ Lucide แทนIoniconsเพื่อweb
import { Plus, Target, Flame, ChevronLeft, ChevronUp, ChevronDown, Trash2, Edit2, X, MoreHorizontal, Dumbbell, Camera, Utensils } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import Slider from '@react-native-community/slider';
import Svg, { Circle } from 'react-native-svg'; // 🌟 ตัวช่วยสร้างกราฟวงกลมแบบ web-friendly

import { useAppContext } from '../../src/AppContext';

const incrementOptions = [100, 150, 200, 250, 500, 750, 1000, 1250, 1500, 1750, 2000];
const ITEM_HEIGHT = 50; 
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// 🌟 ตัวแปรแมปไอคอนมื้ออาหารแบบ SVG
const mealIcons = {
  'breakfast': { icon: () => <Text style={styles.mealEmoji}>🌅</Text>, color: '#FFB74D', bgColor: '#FFF8E1' },
  'lunch': { icon: () => <Text style={styles.mealEmoji}>☀️</Text>, color: '#FFCA28', bgColor: '#FFF3E0' },
  'dinner': { icon: () => <Text style={styles.mealEmoji}>🌙</Text>, color: '#5C6BC0', bgColor: '#E8EAF6' },
  'snack': { icon: () => <Text style={styles.mealEmoji}>🍎</Text>, color: '#EF5350', bgColor: '#FFEBEE' },
};

export default function DashboardScreen() {
  const router = useRouter();
  
  const { 
    mealsData, addFoodToMeal, removeFoodFromMeal,
    waterIntake, setWaterIntake, waterGoal, setWaterGoal, waterIncrement, setWaterIncrement,
    dailyTarget, activities, updateActivity, deleteActivity
  } = useAppContext();

  const mealsCategories: { id: MealId; name: string; target: number }[] = [
    { id: 'breakfast', name: 'อาหารเช้า', target: 580 },
    { id: 'lunch', name: 'อาหารกลางวัน', target: 650 },
    { id: 'dinner', name: 'อาหารเย็น', target: 500 },
    { id: 'snack', name: 'ของว่าง', target: 202 },
  ];

  // คำนวณสารอาหารหลักแบบ SVG/web-safe
  const allFoods = Object.values(mealsData).flat();
  const totalConsumed = allFoods.reduce((sum, item) => sum + item.calories, 0);
  const totalCarbs = allFoods.reduce((sum, item) => sum + item.carbs, 0);
  const totalProtein = allFoods.reduce((sum, item) => sum + item.protein, 0);
  const totalFat = allFoods.reduce((sum, item) => sum + item.fat, 0);
  const totalActivityBurned = activities.reduce((sum, item) => sum + item.calories, 0);

  // 🌟 การคำนวณสำหรับสร้างวงกลมกราฟแบบ SVG
  const radius = 60; // รัศมีวงกลม
  const strokeWidth = 10; // ความหนาเส้น
  const circumference = 2 * Math.PI * radius; // เส้นรอบวง
  const displayedDailyTarget = dailyTarget > 0 ? dailyTarget : 0;
  const remainingCalories = Math.max(displayedDailyTarget - totalConsumed + totalActivityBurned, 0);
  const calorieFillPercentage = displayedDailyTarget > 0 ? Math.max(0, Math.min((displayedDailyTarget - remainingCalories) / displayedDailyTarget, 1)) : 0;
  const animatedCalorieProgress = useRef(new Animated.Value(0)).current;
  const macroTargets = {
    protein: displayedDailyTarget > 0 ? Math.max(Math.round((displayedDailyTarget * 0.3) / 4), 1) : 120,
    carbs: displayedDailyTarget > 0 ? Math.max(Math.round((displayedDailyTarget * 0.45) / 4), 1) : 250,
    fat: displayedDailyTarget > 0 ? Math.max(Math.round((displayedDailyTarget * 0.25) / 9), 1) : 60,
  };
  const macroItems = [
    { key: 'protein', name: 'โปรตีน', value: totalProtein, target: macroTargets.protein, color: '#4CAF50', bgColor: '#E8F5E9' },
    { key: 'carbs', name: 'คาร์บ', value: totalCarbs, target: macroTargets.carbs, color: '#42A5F5', bgColor: '#E3F2FD' },
    { key: 'fat', name: 'ไขมัน', value: totalFat, target: macroTargets.fat, color: '#FB8C00', bgColor: '#FFF3E0' },
  ];

  useEffect(() => {
    Animated.timing(animatedCalorieProgress, {
      toValue: calorieFillPercentage,
      duration: displayedDailyTarget > 0 ? 900 : 250,
      useNativeDriver: false,
    }).start();
  }, [animatedCalorieProgress, calorieFillPercentage, displayedDailyTarget]);

  const strokeDashoffset = animatedCalorieProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // สถานะสำหรับโมดอลน้ำดื่ม
  const [waterModalVisible, setWaterModalVisible] = useState(false); 
  const [waterInputValue, setWaterInputValue] = useState(waterIntake.toString());
  const [settingsModalVisible, setSettingsModalVisible] = useState(false); 
  const [tempGoal, setTempGoal] = useState(waterGoal);
  const [tempIncrement, setTempIncrement] = useState(waterIncrement);
  const [showIncrementPicker, setShowIncrementPicker] = useState(false);
  const [activityListVisible, setActivityListVisible] = useState(false);
  const [activityEditVisible, setActivityEditVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pendingDeleteActivityId, setPendingDeleteActivityId] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityName, setEditingActivityName] = useState('');
  const [editingActivityCalories, setEditingActivityCalories] = useState('');
  const [mealActionVisible, setMealActionVisible] = useState(false);
  const [manualFoodVisible, setManualFoodVisible] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<MealId | null>(null);
  const [manualFoodName, setManualFoodName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  // ฟังก์ชันโมดอลน้ำดื่ม
  const openWaterModal = () => { setWaterInputValue(waterIntake.toString()); setWaterModalVisible(true); };
  const saveWaterIntake = () => { const val = parseInt(waterInputValue); if (!isNaN(val)) setWaterIntake(val); Keyboard.dismiss(); setWaterModalVisible(false); };
  const openSettingsModal = () => { setTempGoal(waterGoal); setTempIncrement(waterIncrement); setShowIncrementPicker(false); setSettingsModalVisible(true); };
  const saveSettings = () => { setWaterGoal(tempGoal); setWaterIncrement(tempIncrement); setSettingsModalVisible(false); };
  const resetSettings = () => { setTempGoal(2000); setTempIncrement(250); };
  const addGlassOfWater = () => { setWaterIntake(prev => Math.min(prev + waterIncrement, waterGoal)); };
  const removeGlassOfWater = () => { setWaterIntake(prev => Math.max(prev - waterIncrement, 0)); };
  const getSelectedMealName = () => mealsCategories.find(meal => meal.id === selectedMealId)?.name || 'มื้อนี้';
  const openMealActions = (mealId: MealId) => {
    setSelectedMealId(mealId);
    setMealActionVisible(true);
  };
  const scanSelectedMeal = () => {
    if (!selectedMealId) return;
    setMealActionVisible(false);
    router.push({ pathname: '/scanner', params: { mealId: selectedMealId } });
  };
  const openManualFood = () => {
    setMealActionVisible(false);
    setManualFoodName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setManualFoodVisible(true);
  };
  const saveManualFood = () => {
    if (!selectedMealId) return;
    addFoodToMeal(selectedMealId, {
      id: Date.now().toString(),
      name: manualFoodName.trim() || 'อาหาร',
      calories: Math.max(0, parseInt(manualCalories, 10) || 0),
      protein: Math.max(0, parseInt(manualProtein, 10) || 0),
      carbs: Math.max(0, parseInt(manualCarbs, 10) || 0),
      fat: Math.max(0, parseInt(manualFat, 10) || 0),
    });
    Keyboard.dismiss();
    setManualFoodVisible(false);
  };
  const openEditActivity = (activityId: string) => {
    const activity = activities.find(item => item.id === activityId);
    if (!activity) return;
    setEditingActivityId(activity.id);
    setEditingActivityName(activity.name);
    setEditingActivityCalories(activity.calories.toString());
    setActivityListVisible(false);
    setActivityEditVisible(true);
  };
  const saveActivityEdit = () => {
    if (!editingActivityId) return;
    updateActivity(editingActivityId, {
      name: editingActivityName.trim() || 'ออกกำลังกาย',
      calories: parseInt(editingActivityCalories, 10) || 0,
    });
    setActivityEditVisible(false);
    setEditingActivityId(null);
  };
  const handleDeleteActivity = (activityId: string) => {
    setPendingDeleteActivityId(activityId);
    setDeleteConfirmVisible(true);
  };
  const confirmDeleteActivity = () => {
    if (!pendingDeleteActivityId) return;
    deleteActivity(pendingDeleteActivityId);
    setPendingDeleteActivityId(null);
    setDeleteConfirmVisible(false);
  };
  const cancelDeleteActivity = () => {
    setPendingDeleteActivityId(null);
    setDeleteConfirmVisible(false);
  };

  const totalGlasses = Math.ceil(waterGoal / waterIncrement);
  const fullGlasses = Math.floor(waterIntake / waterIncrement);
  const remainderWater = waterIntake % waterIncrement;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.dateText}>{today}</Text>
          <Text style={styles.pageTitle}>ไดอารี่ & แดชบอร์ด</Text>
        </View>

        {/* 🌟 1. ส่วนแคลอรี่หลัก: สร้างกราฟวงกลมใหม่แบบ SVG/web-safe */}
        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.card}>
          <View style={styles.calorieHeader}>
            <Text style={styles.sectionTitle}>แคลอรี่</Text>
            <Text style={styles.calorieSubText}>ที่ควรได้รับ = เป้าหมาย - อาหาร + กิจกรรม</Text>
          </View>

          <View style={styles.calorieBody}>
            <View style={styles.circleContainer}>
              {/* วาดวงกลมกราฟแบบ SVG สำหรับเว็บ */}
              <Svg width="140" height="140" viewBox="0 0 140 140">
                {/* วงกลมพื้นหลังสีอ่อน */}
                <Circle cx="70" cy="70" r={radius} stroke="#E8F5E9" strokeWidth={strokeWidth} fill="none" />
                {/* วงกลมความคืบหน้าสีเขียว */}
                <AnimatedCircle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#4CAF50" // สีเขียวหลัก
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="70, 70"
                />
              </Svg>
              {/* ข้อความตรงกลางวงกลม */}
              <View style={styles.circleTextOverlay}>
                <Text style={styles.circleLabel}>ที่ควรได้รับ</Text>
                <Text style={styles.circleNumber}>{remainingCalories.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.calorieDetails}>
              <View style={styles.detailRow}>
                {/* ไอคอนธง SVG/web-safe */}
                <View style={[styles.detailIconBg, { backgroundColor: '#E8F5E9' }]}><Target size={20} color="#4CAF50" /></View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>เป้าหมาย</Text>
                  <Text style={styles.detailValue}>{displayedDailyTarget.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                {/* ไอคอนช้อนส้อม SVG/web-safe */}
                <View style={[styles.detailIconBg, { backgroundColor: '#FFF3E0' }]}><Flame size={20} color="#FF9800" /></View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>อาหาร</Text>
                  <Text style={styles.detailValue}>{totalConsumed.toLocaleString()}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.detailRow} activeOpacity={0.75} onPress={() => setActivityListVisible(true)}>
                <View style={[styles.detailIconBg, { backgroundColor: '#E3F2FD' }]}><Dumbbell size={20} color="#42A5F5" /></View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>กิจกรรม</Text>
                  <Text style={styles.detailValue}>{totalActivityBurned.toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </MotiView>

        {/* 2. สารอาหารหลัก (Mockup) */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} delay={100} style={styles.card}>
          <Text style={styles.sectionTitle}>สารอาหาร</Text>
          <View style={styles.macroContainer}>
            {macroItems.map(macro => {
              const progress = Math.min(macro.value / macro.target, 1);
              return (
                <View key={macro.key} style={styles.macroProgressRow}>
                  <View style={styles.macroProgressHeader}>
                    <Text style={styles.macroName}>{macro.name}</Text>
                    <Text style={styles.macroProgress}>{macro.value} <Text style={styles.macroTotal}>/ {macro.target} ก.</Text></Text>
                  </View>
                  <View style={[styles.macroBarTrack, { backgroundColor: macro.bgColor }]}>
                    <View style={[styles.macroBarFill, { width: `${progress * 100}%`, backgroundColor: macro.color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </MotiView>

        <View style={styles.mealsHeaderRow}>
          <Text style={styles.sectionTitle}>ทานไปแล้ว</Text>
          <Text style={styles.mealsTotalText}>🔥 {totalConsumed.toLocaleString()} kcal</Text>
        </View>
        
        {mealsCategories.map((meal, index) => {
          const addedFoods = mealsData[meal.id as keyof typeof mealsData] || [];
          const currentMealCal = addedFoods.reduce((sum, f) => sum + f.calories, 0);

          return (
            <View key={meal.id} style={{ marginBottom: 12 }}>
              <MotiView from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }} delay={200 + (index * 100)} style={styles.mealCard}>
                <View style={[styles.mealIconBg, { backgroundColor: mealIcons[meal.id as keyof typeof mealIcons].bgColor }]}>{mealIcons[meal.id as keyof typeof mealIcons].icon()}</View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealCalories}>
                    <Text style={styles.mealCurrentCal}>{currentMealCal}</Text> / {meal.target} kcal
                  </Text>
                </View>
                {/* ไอคอนบวกแบบ SVG/web-safe */}
                <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={() => openMealActions(meal.id)}>
                  <Plus size={24} color="#4CAF50" />
                </TouchableOpacity>
              </MotiView>

              {addedFoods.map(food => (
                <MotiView key={food.id} from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.foodItemRow}>
                  <View style={styles.foodItemDot} />
                  <Text style={styles.foodItemName} numberOfLines={1}>{food.name}</Text>
                  <Text style={styles.foodItemCal}>{food.calories} kcal</Text>
                  {/* ไอคอนถังขยะแบบ SVG/web-safe */}
                  <TouchableOpacity style={styles.deleteFoodBtn} onPress={() => removeFoodFromMeal(meal.id as keyof typeof mealsData, food.id)}>
                    <Trash2 size={18} color="#FF5252" />
                  </TouchableOpacity>
                </MotiView>
              ))}
            </View>
          );
        })}

        {/* 3. การดื่มน้ำ ( Mockup) */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} delay={600} style={styles.waterCard}>
          <View style={styles.waterTopRow}>
            <Text style={styles.waterTitle}>การดื่มน้ำ</Text>
            <View style={styles.waterActions}>
              {/* ไอคอนบวก/จุด/ดินสอ/กากบาท แบบ SVG/web-safe */}
              <TouchableOpacity style={styles.waterOutlineBtn} onPress={addGlassOfWater}><Plus size={22} color="#555" strokeWidth={2.5} /></TouchableOpacity>
              <TouchableOpacity style={styles.waterOutlineBtn} onPress={openSettingsModal}><MoreHorizontal size={22} color="#555" strokeWidth={2.5} /></TouchableOpacity>
            </View>
          </View>
          <View style={styles.waterMiddleRow}>
            <Text style={styles.waterCurrentText}>{waterIntake.toLocaleString()}</Text>
            <Text style={styles.waterUnitText}> มล.</Text>
            <TouchableOpacity onPress={openWaterModal} style={styles.waterEditIcon}><Edit2 size={20} color="#777" /></TouchableOpacity>
          </View>
          <Text style={styles.waterGoalText}>เป้าหมาย: {waterGoal.toLocaleString()} มล.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.glassesScroll}>
            <View style={styles.glassesContainer}>
              {Array.from({ length: totalGlasses }).map((_, idx) => {
                const isFull = idx < fullGlasses;
                const isPartial = idx === fullGlasses && remainderWater > 0;
                const isEmpty = !isFull && !isPartial;
                const fillPercentage = isPartial ? (remainderWater / waterIncrement) * 75 : 0; 
                return (
                  <TouchableOpacity key={idx} style={[ styles.glassBox, isFull && styles.glassBoxFull, isEmpty && styles.glassBoxEmpty, isPartial && styles.glassBoxEmpty ]} onPress={isFull ? removeGlassOfWater : addGlassOfWater} activeOpacity={0.7}>
                    {isFull && <View style={styles.glassFillComplete} />}
                    {isPartial && <MotiView style={[styles.glassFillPartial, { height: `${fillPercentage}%` }]} transition={{ type: 'timing', duration: 300 }} />}
                    {(isEmpty || isPartial) && <View style={styles.glassEmptyIconContainer}><Plus size={22} color="#BDBDBD" strokeWidth={2.5}/></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </MotiView>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 🌟 โมดอลต่างๆ แก้ไขไอคอนเป็น SVG/web-safe */}
      <Modal animationType="fade" transparent={true} visible={mealActionVisible} onRequestClose={() => setMealActionVisible(false)}>
        <TouchableOpacity style={styles.actionBackdrop} activeOpacity={1} onPress={() => setMealActionVisible(false)}>
          <View style={styles.foodActionSheet}>
            <View style={styles.foodActionHeader}>
              <Text style={styles.foodActionTitle}>{getSelectedMealName()}</Text>
              <TouchableOpacity onPress={() => setMealActionVisible(false)} style={styles.closeModalBtn}><X size={22} color="#888" /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.foodActionItem} onPress={scanSelectedMeal}>
              <View style={[styles.foodActionIcon, { backgroundColor: '#E8F5E9' }]}><Camera size={22} color="#2E7D32" /></View>
              <View style={styles.foodActionTextWrap}>
                <Text style={styles.foodActionText}>สแกนอาหารด้วยกล้อง</Text>
                <Text style={styles.foodActionSubText}>ถ่ายรูปแล้วให้ AI ช่วยประเมิน</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodActionItem} onPress={openManualFood}>
              <View style={[styles.foodActionIcon, { backgroundColor: '#FFF3E0' }]}><Utensils size={22} color="#FB8C00" /></View>
              <View style={styles.foodActionTextWrap}>
                <Text style={styles.foodActionText}>กรอกข้อมูลอาหารเอง</Text>
                <Text style={styles.foodActionSubText}>ใส่ชื่อ แคลอรี่ และสารอาหาร</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={manualFoodVisible} onRequestClose={() => setManualFoodVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.waterModalBackdrop}>
          <View style={styles.manualFoodCard}>
            <View style={styles.waterModalHeader}>
              <Text style={styles.waterModalTitle}>เพิ่มอาหารใน{getSelectedMealName()}</Text>
              <TouchableOpacity onPress={() => setManualFoodVisible(false)} style={styles.closeModalBtn}><X size={24} color="#888" /></TouchableOpacity>
            </View>
            <Text style={styles.manualLabel}>ชื่ออาหาร</Text>
            <TextInput style={styles.manualInput} value={manualFoodName} onChangeText={setManualFoodName} placeholder="เช่น ข้าวกะเพราไก่" placeholderTextColor="#BDBDBD" autoFocus />
            <Text style={styles.manualLabel}>แคลอรี่</Text>
            <TextInput style={styles.manualInput} value={manualCalories} onChangeText={setManualCalories} keyboardType="numeric" placeholder="0" placeholderTextColor="#BDBDBD" />
            <View style={styles.manualMacroRow}>
              <View style={styles.manualMacroField}>
                <Text style={styles.manualLabel}>โปรตีน</Text>
                <TextInput style={styles.manualInput} value={manualProtein} onChangeText={setManualProtein} keyboardType="numeric" placeholder="0" placeholderTextColor="#BDBDBD" />
              </View>
              <View style={styles.manualMacroField}>
                <Text style={styles.manualLabel}>คาร์บ</Text>
                <TextInput style={styles.manualInput} value={manualCarbs} onChangeText={setManualCarbs} keyboardType="numeric" placeholder="0" placeholderTextColor="#BDBDBD" />
              </View>
              <View style={styles.manualMacroField}>
                <Text style={styles.manualLabel}>ไขมัน</Text>
                <TextInput style={styles.manualInput} value={manualFat} onChangeText={setManualFat} keyboardType="numeric" placeholder="0" placeholderTextColor="#BDBDBD" />
              </View>
            </View>
            <TouchableOpacity style={styles.waterSaveBtn} onPress={saveManualFood}><Text style={styles.waterSaveBtnText}>บันทึกอาหาร</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={waterModalVisible} onRequestClose={() => setWaterModalVisible(false)}>
        <View style={styles.waterModalBackdrop}>
          <View style={styles.waterModalCard}>
            <View style={styles.waterModalHeader}>
              <Text style={styles.waterModalTitle}>แก้ไขปริมาณน้ำที่ดื่ม</Text>
              <TouchableOpacity onPress={() => setWaterModalVisible(false)} style={styles.closeModalBtn}><X size={24} color="#888" /></TouchableOpacity>
            </View>
            <TextInput style={styles.waterInput} keyboardType="numeric" value={waterInputValue} onChangeText={setWaterInputValue} autoFocus={true}/>
            <TouchableOpacity style={styles.waterSaveBtn} onPress={saveWaterIntake}><Text style={styles.waterSaveBtnText}>ตกลง</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={activityListVisible} onRequestClose={() => setActivityListVisible(false)}>
        <View style={styles.waterModalBackdrop}>
          <View style={styles.activityModalCard}>
            <View style={styles.waterModalHeader}>
              <Text style={styles.waterModalTitle}>กิจกรรมวันนี้</Text>
              <TouchableOpacity onPress={() => setActivityListVisible(false)} style={styles.closeModalBtn}><X size={24} color="#888" /></TouchableOpacity>
            </View>
            {activities.length === 0 ? (
              <Text style={styles.emptyActivityText}>ยังไม่มีกิจกรรมที่บันทึกไว้</Text>
            ) : (
              <ScrollView style={styles.activityList} showsVerticalScrollIndicator={false}>
                {activities.map(activity => (
                  <View key={activity.id} style={styles.activityListRow}>
                    <View style={styles.activityListInfo}>
                      <Text style={styles.activityListName} numberOfLines={1}>{activity.name}</Text>
                      <Text style={styles.activityListCalories}>{activity.calories.toLocaleString()} kcal</Text>
                    </View>
                    <View style={styles.activityActions}>
                      <TouchableOpacity style={styles.activityEditBtn} onPress={() => openEditActivity(activity.id)}>
                        <Edit2 size={18} color="#1E88E5" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.activityDeleteBtn} onPress={() => handleDeleteActivity(activity.id)}>
                        <Trash2 size={18} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={activityEditVisible} onRequestClose={() => setActivityEditVisible(false)}>
        <View style={styles.waterModalBackdrop}>
          <View style={styles.activityModalCard}>
            <View style={styles.waterModalHeader}>
              <Text style={styles.waterModalTitle}>แก้ไขกิจกรรม</Text>
              <TouchableOpacity onPress={() => setActivityEditVisible(false)} style={styles.closeModalBtn}><X size={24} color="#888" /></TouchableOpacity>
            </View>
            <Text style={styles.activityEditLabel}>ชื่อกิจกรรม</Text>
            <TextInput
              style={styles.activityEditInput}
              value={editingActivityName}
              onChangeText={setEditingActivityName}
              placeholder="ออกกำลังกาย"
              placeholderTextColor="#BDBDBD"
            />
            <Text style={styles.activityEditLabel}>แคลอรี่ที่เผาผลาญ</Text>
            <TextInput
              style={styles.activityEditInput}
              value={editingActivityCalories}
              onChangeText={setEditingActivityCalories}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#BDBDBD"
            />
            <TouchableOpacity style={styles.waterSaveBtn} onPress={saveActivityEdit}><Text style={styles.waterSaveBtnText}>บันทึก</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={deleteConfirmVisible} onRequestClose={cancelDeleteActivity}>
        <View style={styles.waterModalBackdrop}>
          <View style={styles.deleteConfirmCard}>
            <Text style={styles.deleteConfirmTitle}>ลบกิจกรรมนี้?</Text>
            <Text style={styles.deleteConfirmText}>รายการนี้จะถูกลบออกจากกิจกรรมวันนี้ และยอดแคลอรี่ที่เผาผลาญจะอัปเดตทันที</Text>
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity style={styles.cancelDeleteBtn} onPress={cancelDeleteActivity}>
                <Text style={styles.cancelDeleteText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDeleteActivity}>
                <Text style={styles.confirmDeleteText}>ลบ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={false} visible={settingsModalVisible} onRequestClose={() => setSettingsModalVisible(false)}>
        <SafeAreaView style={styles.settingsSafeArea}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.settingsBackBtn}><ChevronLeft size={28} color="#333" /></TouchableOpacity>
            <Text style={styles.settingsTitle}>ตั้งค่าการดื่มน้ำ</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.settingsContent}>
            <TouchableOpacity style={styles.settingsSectionRow} activeOpacity={0.7} onPress={() => setShowIncrementPicker(!showIncrementPicker)}>
              <Text style={styles.settingsSectionTitle}>ปริมาณที่บริโภค (มล.)</Text>
              <Text style={styles.settingsSectionValue}>{tempIncrement} {showIncrementPicker ? <ChevronUp size={14} color="#888" /> : <ChevronDown size={14} color="#888" />}</Text>
            </TouchableOpacity>
            {showIncrementPicker && (
              <MotiView from={{ opacity: 0, height: 0, translateY: -10 }} animate={{ opacity: 1, height: ITEM_HEIGHT * 4, translateY: 0 }} transition={{ type: 'timing', duration: 200 }} style={styles.pickerContainer}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{alignItems: 'center', width: '100%'}}>
                  {incrementOptions.map(val => (
                    <TouchableOpacity key={val} style={styles.pickerItem} onPress={() => { setTempIncrement(val); setShowIncrementPicker(false); }}>
                      <Text style={[styles.pickerText, tempIncrement === val && styles.pickerTextActive]}>{val}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </MotiView>
            )}
            <View style={styles.divider} />
            <View style={styles.settingsSectionRow}><Text style={styles.settingsSectionTitle}>เป้าหมายรายวัน</Text></View>
            <Text style={styles.goalPreviewText}>{tempGoal.toLocaleString()} มล. <Text style={styles.goalPreviewGlasses}>({Math.ceil(tempGoal / tempIncrement)} แก้ว)</Text></Text>
            <View style={styles.sliderContainer}>
              <Slider style={{ width: '100%', height: 40 }} minimumValue={1000} maximumValue={5000} step={100} value={tempGoal} onValueChange={setTempGoal} minimumTrackTintColor="#4CAF50" maximumTrackTintColor="#E8F5E9" thumbTintColor="#4CAF50" />
            </View>
          </View>
          <View style={styles.settingsFooter}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetSettings}><Text style={styles.resetBtnText}>รีเซ็ต</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveSettingsBtn} onPress={saveSettings}><Text style={styles.saveSettingsBtnText}>บันทึก</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAF9' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 20, marginBottom: 10 },
  dateText: { fontSize: 14, color: '#888', fontWeight: '500', marginBottom: 5 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20' },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  calorieHeader: { marginBottom: 10 },
  calorieSubText: { fontSize: 13, color: '#888', marginTop: 4, fontWeight: '500' },
  calorieBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // 🌟 สไตล์สำหรับวงกลมกราฟแบบ SVG
  circleContainer: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  circleTextOverlay: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  circleLabel: { fontSize: 14, color: '#888', marginBottom: 2, fontWeight: '500' },
  circleNumber: { fontSize: 32, fontWeight: 'bold', color: '#2E7D32' },
  calorieDetails: { flex: 1, marginLeft: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  detailIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  detailTextContainer: { marginLeft: 10 },
  detailLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  detailValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  macroContainer: { marginTop: 15 },
  macroItem: { alignItems: 'center', flex: 1 },
  macroProgressRow: { marginBottom: 14 },
  macroProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  macroBarTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: 999 },
  macroIconBg: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emoji: { fontSize: 28 },
  macroName: { fontSize: 14, color: '#666', fontWeight: '500', marginBottom: 4 },
  macroProgress: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  macroTotal: { fontSize: 12, color: '#888', fontWeight: 'normal' },
  mealsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  mealsTotalText: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
  mealCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 0, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  mealIconBg: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  mealEmoji: { fontSize: 24 },
  mealInfo: { flex: 1, marginLeft: 15 },
  mealName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  mealCalories: { fontSize: 14, color: '#888' },
  mealCurrentCal: { fontWeight: 'bold', color: '#111' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  foodItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginTop: 8, marginLeft: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  foodItemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFCA28', marginRight: 12 },
  foodItemName: { flex: 1, fontSize: 14, color: '#444', fontWeight: '500' },
  foodItemCal: { fontSize: 14, fontWeight: 'bold', color: '#111', marginRight: 15 },
  deleteFoodBtn: { padding: 4, backgroundColor: '#FFEBEE', borderRadius: 8 },

  actionBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', padding: 20, paddingBottom: 34 },
  foodActionSheet: { backgroundColor: '#FFF', borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18, elevation: 8 },
  foodActionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  foodActionTitle: { fontSize: 17, color: '#1B5E20', fontWeight: '800' },
  foodActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  foodActionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  foodActionTextWrap: { flex: 1 },
  foodActionText: { fontSize: 16, color: '#222', fontWeight: '800' },
  foodActionSubText: { fontSize: 13, color: '#777', fontWeight: '500', marginTop: 2 },
  manualFoodCard: { backgroundColor: '#FFF', width: '88%', padding: 24, borderRadius: 24 },
  manualLabel: { color: '#666', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  manualInput: { borderWidth: 1.5, borderColor: '#DDEEDD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: '#222', marginBottom: 14, fontWeight: '700' },
  manualMacroRow: { flexDirection: 'row', gap: 8 },
  manualMacroField: { flex: 1 },

  waterCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, paddingBottom: 30, marginBottom: 20, marginTop: 15, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  waterTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  waterTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  waterActions: { flexDirection: 'row' },
  waterOutlineBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: '#EAEAEA', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  waterMiddleRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  waterCurrentText: { fontSize: 52, fontWeight: 'bold', color: '#111' },
  waterUnitText: { fontSize: 22, color: '#777', fontWeight: '600' },
  waterEditIcon: { marginLeft: 12, marginBottom: 5 },
  waterGoalText: { fontSize: 16, color: '#888', marginBottom: 25 },
  glassesScroll: { flexDirection: 'row' },
  glassesContainer: { flexDirection: 'row', alignItems: 'center' },
  glassBox: { width: 42, height: 55, borderRadius: 8, marginRight: 10, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
  glassBoxEmpty: { backgroundColor: '#F2F2F2' },
  glassEmptyIconContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  glassBoxFull: { backgroundColor: '#BBDEFB' }, 
  glassFillComplete: { width: '100%', height: '75%', backgroundColor: '#64B5F6' },
  glassFillPartial: { width: '100%', backgroundColor: '#64B5F6', position: 'absolute', bottom: 0, zIndex: -1 },

  waterModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  waterModalCard: { backgroundColor: '#FFF', width: '85%', padding: 25, borderRadius: 24 },
  waterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  waterModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'center' },
  closeModalBtn: { marginLeft: 10 },
  waterInput: { borderWidth: 1.5, borderColor: '#66BB6A', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 15, fontSize: 18, color: '#333', marginBottom: 25 },
  waterSaveBtn: { backgroundColor: '#66BB6A', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  waterSaveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  activityModalCard: { backgroundColor: '#FFF', width: '88%', maxHeight: '75%', padding: 25, borderRadius: 24 },
  activityList: { maxHeight: 340 },
  activityListRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FBFF', borderRadius: 14, padding: 14, marginBottom: 10 },
  activityListInfo: { flex: 1, marginRight: 12 },
  activityListName: { fontSize: 16, color: '#222', fontWeight: '800', marginBottom: 4 },
  activityListCalories: { fontSize: 14, color: '#1E88E5', fontWeight: '700' },
  activityActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityEditBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' },
  activityDeleteBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFEBEE', alignItems: 'center', justifyContent: 'center' },
  emptyActivityText: { color: '#888', fontSize: 15, fontWeight: '600', textAlign: 'center', paddingVertical: 24 },
  activityEditLabel: { color: '#666', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  activityEditInput: { borderWidth: 1.5, borderColor: '#DDEEFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 18, color: '#222', marginBottom: 16, fontWeight: '700' },
  deleteConfirmCard: { backgroundColor: '#FFF', width: '84%', borderRadius: 22, padding: 24, alignItems: 'center' },
  deleteConfirmTitle: { fontSize: 20, color: '#222', fontWeight: '800', marginBottom: 8 },
  deleteConfirmText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  deleteConfirmActions: { flexDirection: 'row', width: '100%' },
  cancelDeleteBtn: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginRight: 8 },
  cancelDeleteText: { color: '#444', fontSize: 16, fontWeight: '800' },
  confirmDeleteBtn: { flex: 1, backgroundColor: '#FF3B30', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginLeft: 8 },
  confirmDeleteText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  settingsSafeArea: { flex: 1, backgroundColor: '#FFF' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  settingsBackBtn: { padding: 5 },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  settingsContent: { flex: 1, padding: 25 },
  settingsSectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsSectionTitle: { fontSize: 16, color: '#666', fontWeight: '500' },
  settingsSectionValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  pickerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pickerItem: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  pickerText: { fontSize: 18, color: '#BBB' },
  pickerTextActive: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 30 },
  goalPreviewText: { textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  goalPreviewGlasses: { fontSize: 18, color: '#888', fontWeight: 'normal' },
  sliderContainer: { backgroundColor: '#F9FAF9', padding: 20, borderRadius: 24 },
  settingsFooter: { flexDirection: 'row', padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  resetBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: '#DDD', marginRight: 10, alignItems: 'center' },
  resetBtnText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  saveSettingsBtn: { flex: 2, paddingVertical: 18, borderRadius: 16, backgroundColor: '#4CAF50', alignItems: 'center' },
  saveSettingsBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' }
});
