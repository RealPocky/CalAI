import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, 
  KeyboardAvoidingView, Platform, Pressable, Modal, Dimensions, TouchableOpacity
} from 'react-native';
import { User, CheckCircle, X } from 'lucide-react-native';
import { MotiView, MotiText } from 'moti';
import { useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../../src/AppContext';

const { width } = Dimensions.get('window');

const activityOptions = [
  { label: '🏃‍♂️ กิจกรรมน้อย', description: 'ทำงานนั่งโต๊ะ, ไม่ได้ออกกำลังกายเลย', multiplier: 1.2 },
  { label: '🏊‍♂️ กิจกรรมเบา', description: 'เดินบ่อย, ออกกำลังกาย 1-3 วัน/สัปดาห์', multiplier: 1.375 },
  { label: '⚽ กิจกรรมปานกลาง', description: 'เล่นกีฬาหรือคาร์ดิโอให้เหงื่อออก 3-5 วัน/สัปดาห์', multiplier: 1.55 },
  { label: '🔥 กิจกรรมหนัก', description: 'เล่นเวทหนัก, ซ้อมกีฬาอย่างหนัก 6-7 วัน/สัปดาห์', multiplier: 1.725 },
  { label: '🏋️‍♂️ กิจกรรมหนักมาก', description: 'นักกีฬา หรือทำงานใช้แรงงานหนักมาก', multiplier: 1.9 },
];

const weightOptions = Array.from({length: 171}, (_, i) => (i + 30).toString()); 
const heightOptions = Array.from({length: 151}, (_, i) => (i + 100).toString()); 
const days = Array.from({length: 31}, (_, i) => i + 1);
const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const currentYear = new Date().getFullYear();
const dobYears = Array.from({length: 100}, (_, i) => currentYear - i); 
const targetYears = Array.from({length: 10}, (_, i) => currentYear + i); 

const WheelPicker = ({ items, selectedValue, onValueChange, itemHeight = 50 }: any) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = items.findIndex((item: any) => item.toString() === selectedValue.toString());
    return Math.max(0, idx);
  });

  useEffect(() => {
    if (scrollViewRef.current && activeIndex > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: activeIndex * itemHeight, animated: false });
      }, 50);
    }
  }, []);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(items.length - 1, Math.round(y / itemHeight)));
    if (index !== activeIndex) {
      setActiveIndex(index);
      onValueChange(items[index]); 
    }
  };

  return (
    <View style={{ height: itemHeight * 5, flex: 1, position: 'relative' }}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={Platform.OS === 'web' ? { scrollSnapType: 'y mandatory' } as any : { zIndex: 1 }}
      >
        <View style={{ height: itemHeight * 2 }} />
        {items.map((item: any, idx: number) => {
          const isSelected = idx === activeIndex;
          return (
            <View 
              key={idx} 
              style={[
                { height: itemHeight, justifyContent: 'center', alignItems: 'center' },
                Platform.OS === 'web' ? { scrollSnapAlign: 'center' } as any : {}
              ]}
            >
              <Text style={{ 
                fontSize: isSelected ? 22 : 18, 
                fontWeight: isSelected ? 'bold' : '500', 
                color: isSelected ? '#1B5E20' : '#BBB' 
              }}>
                {item}
              </Text>
            </View>
          );
        })}
        <View style={{ height: itemHeight * 2 }} />
      </ScrollView>
    </View>
  );
};

export default function ProfileScreen() {
  const { userProfile, setUserProfile, saveUserToBackend, setDailyTarget } = useAppContext();
  const gender = userProfile.gender;
  const weight = userProfile.weight;
  const heightValue = userProfile.height;
  const targetWeight = userProfile.targetWeight;
  const dob = userProfile.dob;
  const targetDate = userProfile.targetDate;
  const activityMultiplier = userProfile.activityLevel;

  const setGender = (gender: 'male' | 'female') => setUserProfile(prev => ({ ...prev, gender }));
  const setWeight = (weight: string) => setUserProfile(prev => ({ ...prev, weight }));
  const setHeightValue = (height: string) => setUserProfile(prev => ({ ...prev, height }));
  const setTargetWeight = (targetWeight: string) => setUserProfile(prev => ({ ...prev, targetWeight }));
  const setDob = (dob: Date | null) => setUserProfile(prev => ({ ...prev, dob }));
  const setTargetDate = (targetDate: Date | null) => setUserProfile(prev => ({ ...prev, targetDate }));
  const setActivityMultiplier = (activityLevel: number) => setUserProfile(prev => ({ ...prev, activityLevel }));
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'dob' | 'target'>('dob');
  const [tempDay, setTempDay] = useState(1);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempYear, setTempYear] = useState(currentYear);
  
  const [modalVisible, setModalVisible] = useState(false); 
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'weight' | 'height' | 'targetWeight'>('weight');
  const [tempMeasurement, setTempMeasurement] = useState('0');

  const isFocused = useIsFocused(); 

  const handleSaveAll = async () => {
    try {
      await saveUserToBackend();
      if (resultData.targetCalories > 0) setDailyTarget(resultData.targetCalories);
      alert('บันทึกข้อมูลเรียบร้อย! 🚀');
    } catch (e) { alert('บันทึกไม่สำเร็จ'); }
  };

  const calculatedAge = useMemo(() => {
    if (!dob) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
    return age;
  }, [dob]);

  const selectActivity = (multiplier: number) => {
    setActivityMultiplier(multiplier);
    setModalVisible(false);
  };

  const openDatePicker = (mode: 'dob' | 'target') => {
    setDatePickerMode(mode);
    const dateToUse = mode === 'dob' ? (dob || new Date()) : (targetDate || new Date());
    setTempDay(dateToUse.getDate());
    setTempMonth(dateToUse.getMonth());
    setTempYear(dateToUse.getFullYear());
    setShowDatePicker(true);
  };

  const handleConfirmDate = () => {
    const newDate = new Date(tempYear, tempMonth, tempDay);
    if (datePickerMode === 'dob') setDob(newDate);
    else setTargetDate(newDate);
    setShowDatePicker(false);
  };

  const resultData = useMemo(() => {
    if (!weight || !heightValue || !targetWeight || !targetDate || calculatedAge <= 0) {
      return { targetCalories: 0, daysLeft: 0, isDangerous: false, weightToLose: 0 }; 
    }
    const currentW = parseFloat(weight);
    const targetW = parseFloat(targetWeight);
    const h = parseFloat(heightValue);
    const weightToLose = currentW - targetW;
    if (weightToLose <= 0) return { targetCalories: 0, daysLeft: 0, isDangerous: false, weightToLose: 0 };
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { targetCalories: 0, daysLeft: 0, isDangerous: true, weightToLose };
    let bmr = (10 * currentW) + (6.25 * h) - (5 * calculatedAge);
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;
    const tdee = bmr * activityMultiplier;
    const totalDeficitNeeded = weightToLose * 7700;
    const dailyDeficitNeeded = totalDeficitNeeded / daysLeft;
    let targetCalories = Math.round(tdee - dailyDeficitNeeded);
    const minSafe = gender === 'male' ? 1500 : 1200;
    const isDangerous = targetCalories < minSafe;
    return { targetCalories, daysLeft, isDangerous, weightToLose };
  }, [gender, calculatedAge, weight, heightValue, targetWeight, activityMultiplier, targetDate]);

  // 🌟 Logic คำนวณ BMI และตำแหน่งลูกศรสำหรับ UI ใหม่
  const bmiValue = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(heightValue) / 100;
    if (w > 0 && h > 0) return w / (h * h);
    return 0;
  }, [weight, heightValue]);

  const bmiInfo = useMemo(() => {
    let category = '';
    let color = '';
    if (bmiValue < 18.5) { category = 'ผอม'; color = '#42A5F5'; }
    else if (bmiValue < 25) { category = 'ปกติ'; color = '#8BC34A'; }
    else if (bmiValue < 30) { category = 'ท้วม'; color = '#FFCA28'; }
    else { category = 'อ้วน'; color = '#EF5350'; }

    const h = parseFloat(heightValue) / 100;
    const idealWeight = 22 * (h * h);
    const currentW = parseFloat(weight);
    let diffText = '';
    if (bmiValue < 18.5) {
      diffText = `เพิ่มน้ำหนัก ${(idealWeight - currentW).toFixed(1)}kg เพื่อให้มีน้ำหนักที่เหมาะสม`;
    } else if (bmiValue >= 25) {
      diffText = `ลดน้ำหนัก ${(currentW - idealWeight).toFixed(1)}kg เพื่อให้มีน้ำหนักที่เหมาะสม`;
    } else {
      diffText = 'น้ำหนักของคุณอยู่ในเกณฑ์ที่เหมาะสมแล้ว! 🎉';
    }

    const minBmi = 12.0;
    const maxBmi = 40.0;
    let pos = ((bmiValue - minBmi) / (maxBmi - minBmi)) * 100;
    pos = Math.max(0, Math.min(pos, 100));

    return { category, color, diffText, markerPos: pos };
  }, [bmiValue, weight, heightValue]);


  return (
    <SafeAreaView style={styles.safeArea}>
      <MotiView animate={{ opacity: isFocused ? 1 : 0, translateY: isFocused ? 0 : 15 }} style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
            
            <View style={styles.header}>
              <Text style={styles.pageTitle}>ข้อมูลส่วนตัว 👤</Text>
              <Text style={styles.pageSubtitle}>วางแผนพิชิตหุ่นดีตามเป้าหมายของคุณ!</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ข้อมูลพื้นฐาน</Text>
              <Text style={styles.label}>เพศ</Text>
              <View style={styles.genderToggleContainer}>
                <MotiView style={styles.genderActiveBackground} animate={{ left: gender === 'male' ? '0%' : '50%' }} />
                <Pressable style={styles.genderToggleButton} onPress={() => setGender('male')}>
                  <User size={18} color={gender === 'male' ? '#FFF' : '#888'} />
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}> ชาย</Text>
                </Pressable>
                <Pressable style={styles.genderToggleButton} onPress={() => setGender('female')}>
                  <User size={18} color={gender === 'female' ? '#FFF' : '#888'} />
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}> หญิง</Text>
                </Pressable>
              </View>

              <TouchableOpacity style={styles.measurementRow} onPress={() => openDatePicker('dob')}>
                <Text style={styles.measurementLabel}>วันเกิด</Text>
                <Text style={styles.measurementValue}>
                  {dob ? dob.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'เลือก'}
                </Text>
              </TouchableOpacity>
              <View style={styles.dividerSmall} />

              <TouchableOpacity style={styles.measurementRow} onPress={() => setModalVisible(true)}>
                <Text style={styles.measurementLabel}>ระดับกิจกรรม</Text>
                <Text style={styles.measurementValue}>
                   {activityOptions.find(opt => opt.multiplier === activityMultiplier)?.label.split(' ')[1]}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>สัดส่วน & เป้าหมาย</Text>
              <TouchableOpacity style={styles.measurementRow} onPress={() => { setPickerType('weight'); setTempMeasurement(weight); setPickerVisible(true); }}>
                <Text style={styles.measurementLabel}>น้ำหนักปัจจุบัน (กก.)</Text>
                <Text style={styles.measurementValue}>{weight}</Text>
              </TouchableOpacity>
              <View style={styles.dividerSmall} />
              <TouchableOpacity style={styles.measurementRow} onPress={() => { setPickerType('height'); setTempMeasurement(heightValue); setPickerVisible(true); }}>
                <Text style={styles.measurementLabel}>ส่วนสูง (ซม.)</Text>
                <Text style={styles.measurementValue}>{heightValue}</Text>
              </TouchableOpacity>
              <View style={styles.dividerSmall} />
              <TouchableOpacity style={styles.measurementRow} onPress={() => { setPickerType('targetWeight'); setTempMeasurement(targetWeight); setPickerVisible(true); }}>
                <Text style={styles.measurementLabel}>น้ำหนักเป้าหมาย (กก.)</Text>
                <Text style={[styles.measurementValue, { color: '#4CAF50' }]}>{targetWeight}</Text>
              </TouchableOpacity>
              <View style={styles.dividerSmall} />

              <TouchableOpacity style={[styles.measurementRow, { backgroundColor: '#F1F8E9', borderRadius: 12, paddingHorizontal: 10, marginTop: 10 }]} onPress={() => openDatePicker('target')}>
                <Text style={[styles.measurementLabel, { color: '#2E7D32', fontWeight: 'bold' }]}>📅 ภายในวันที่</Text>
                <Text style={[styles.measurementValue, { color: '#2E7D32' }]}>
                  {targetDate ? targetDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'เลือกวัน'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, resultData.isDangerous && { borderColor: '#FF5252', borderWidth: 2 }]}>
              
              {/* 🌟 ส่วนดัชนีมวลกาย (BMI) แบบใหม่ตามภาพเป๊ะๆ */}
              <Text style={styles.sectionTitle}>ดัชนีมวลกาย (BMI)</Text>
              <View style={styles.bmiHeader}>
                <Text style={styles.bmiNumberText}>{bmiValue.toFixed(1)}</Text>
                <View style={[styles.bmiBadge, { backgroundColor: bmiInfo.color }]}>
                  <Text style={styles.bmiBadgeText}>{bmiInfo.category}</Text>
                </View>
              </View>

              {/* หลอดสี BMI พร้อมลูกศรชี้ */}
              <View style={styles.bmiBarContainer}>
                {/* ลูกศรชี้ตำแหน่ง (Animate ไปตามค่า BMI) */}
                <MotiView
                  animate={{ left: `${bmiInfo.markerPos}%` }}
                  transition={{ type: 'spring', damping: 15 }}
                  style={styles.bmiMarker}
                >
                  <View style={styles.triangleDown} />
                </MotiView>

                {/* หลอด 4 สี */}
                <View style={styles.bmiColorBar}>
                  <View style={{ flex: 23.2, backgroundColor: '#42A5F5' }} />
                  <View style={{ flex: 22.8, backgroundColor: '#8BC34A' }} />
                  <View style={{ flex: 18.2, backgroundColor: '#FFCA28' }} />
                  <View style={{ flex: 35.7, backgroundColor: '#EF5350' }} />
                </View>

                {/* ตัวเลขกำกับสเกล */}
                <View style={styles.bmiScaleLabels}>
                  <Text style={[styles.scaleLabelText, { left: '0%' }]}>12.0</Text>
                  <Text style={[styles.scaleLabelText, { left: '23.2%', transform: [{translateX: -12}] }]}>18.5</Text>
                  <Text style={[styles.scaleLabelText, { left: '46.0%', transform: [{translateX: -12}] }]}>24.9</Text>
                  <Text style={[styles.scaleLabelText, { left: '64.2%', transform: [{translateX: -12}] }]}>30.0</Text>
                  <Text style={[styles.scaleLabelText, { right: '0%' }]}>40.0</Text>
                </View>
              </View>

              {/* กล่องคำแนะนำน้ำหนักที่เหมาะสม */}
              <View style={styles.bmiSuggestionBox}>
                <Text style={styles.sparkleIcon}>✨</Text>
                <Text style={styles.suggestionText}>{bmiInfo.diffText}</Text>
              </View>

              <View style={styles.dividerSmall} />

              <View style={[styles.journeyHeader, { marginTop: 20 }]}>
                <Text style={styles.sectionTitle}>แผนการของคุณ ✨</Text>
                <Text style={styles.diffWeightText}>ลดอีก {resultData.weightToLose.toFixed(1)} กก.</Text>
              </View>
              <View style={styles.planSummary}>
                <View style={styles.planBox}>
                  <Text style={styles.planLabel}>เวลาที่เหลือ</Text>
                  <Text style={styles.planValue}>{resultData.daysLeft} วัน</Text>
                </View>
                <View style={styles.planBox}>
                  <Text style={styles.planLabel}>ความเร็ว</Text>
                  <Text style={styles.planValue}>
                    {resultData.daysLeft > 0 ? (resultData.weightToLose / (resultData.daysLeft / 7)).toFixed(1) : 0} กก./สัปดาห์
                  </Text>
                </View>
              </View>
              <View style={styles.dailyBudgetSection}>
                <Text style={styles.dailyBudgetLabel}>ต้องทานวันละ</Text>
                <MotiText key={resultData.targetCalories} animate={{ scale: [0.9, 1.1, 1] }} style={[styles.dailyCalorieText, { color: resultData.isDangerous ? '#FF5252' : '#2E7D32' }]}>
                  {resultData.targetCalories > 0 ? resultData.targetCalories.toLocaleString() : '0'}
                  <Text style={[styles.smallKcal, { color: resultData.isDangerous ? '#FF5252' : '#666' }]}> kcal</Text>
                </MotiText>
                {resultData.isDangerous && <Text style={styles.warningText}>⚠️ แผนนี้บีบคั้นเกินไป อาจเป็นอันตรายต่อสุขภาพ</Text>}
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} activeOpacity={0.8} onPress={handleSaveAll}>
              <CheckCircle size={22} color="#FFF" />
              <Text style={styles.saveButtonText}>บันทึกข้อมูลส่วนตัว</Text>
            </TouchableOpacity>
            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal animationType="fade" transparent visible={showDatePicker}>
          <View style={styles.pickerModalBackdrop}>
            <Pressable style={{ flex: 1, width: '100%' }} onPress={() => setShowDatePicker(false)} />
            <MotiView from={{ translateY: 400 }} animate={{ translateY: 0 }} transition={{ type: 'timing', duration: 250 }} style={styles.pickerModalCard}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={styles.cancelText}>ยกเลิก</Text></TouchableOpacity>
                <Text style={styles.modalTitle}>{datePickerMode === 'dob' ? 'วันเกิดของคุณ' : 'ภายในวันที่'}</Text>
                <TouchableOpacity onPress={handleConfirmDate}><Text style={styles.confirmText}>ตกลง</Text></TouchableOpacity>
              </View>
              
              <View style={styles.datePickerContainer}>
                <View style={styles.globalHighlightBar} pointerEvents="none" />
                <WheelPicker items={days} selectedValue={tempDay} onValueChange={setTempDay} />
                <WheelPicker items={thaiMonths} selectedValue={thaiMonths[tempMonth]} onValueChange={(val: any) => setTempMonth(thaiMonths.indexOf(val))} />
                <WheelPicker 
                  items={datePickerMode === 'dob' ? dobYears.map(y => y + 543) : targetYears.map(y => y + 543)} 
                  selectedValue={tempYear + 543} 
                  onValueChange={(val: any) => setTempYear(val - 543)} 
                />
              </View>
            </MotiView>
          </View>
        </Modal>

        <Modal animationType="fade" transparent visible={pickerVisible}>
          <View style={styles.pickerModalBackdrop}>
            <Pressable style={{ flex: 1, width: '100%' }} onPress={() => setPickerVisible(false)} />
            <MotiView from={{ translateY: 400 }} animate={{ translateY: 0 }} transition={{ type: 'timing', duration: 250 }} style={styles.pickerModalCard}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity onPress={() => setPickerVisible(false)}><Text style={styles.cancelText}>ยกเลิก</Text></TouchableOpacity>
                <Text style={styles.modalTitle}>{pickerType === 'weight' ? 'น้ำหนัก (กก.)' : pickerType === 'height' ? 'ส่วนสูง (ซม.)' : 'น้ำหนักเป้าหมาย (กก.)'}</Text>
                <TouchableOpacity onPress={() => {
                  if (pickerType === 'weight') setWeight(tempMeasurement);
                  else if (pickerType === 'height') setHeightValue(tempMeasurement);
                  else setTargetWeight(tempMeasurement);
                  setPickerVisible(false);
                }}><Text style={styles.confirmText}>ตกลง</Text></TouchableOpacity>
              </View>
              
              <View style={styles.datePickerContainer}>
                <View style={styles.globalHighlightBar} pointerEvents="none" />
                <WheelPicker 
                  items={pickerType === 'height' ? heightOptions : weightOptions} 
                  selectedValue={tempMeasurement} 
                  onValueChange={setTempMeasurement} 
                />
              </View>
            </MotiView>
          </View>
        </Modal>

        <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.activityModalBackdrop}>
            <View style={styles.activityModalCard}>
              <View style={styles.activityModalHeader}>
                <Text style={styles.activityModalTitle}>เลือกระดับกิจกรรม</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#888" /></TouchableOpacity>
              </View>
              {activityOptions.map((option, index) => (
                <TouchableOpacity key={index} style={[styles.activityOption, activityMultiplier === option.multiplier && styles.activeActivityOption]} onPress={() => selectActivity(option.multiplier)}>
                  <Text style={[styles.activityLabelText, activityMultiplier === option.multiplier && styles.activeActivityText]}>{option.label}</Text>
                  <Text style={[styles.activityDescText, activityMultiplier === option.multiplier && styles.activeActivityDescText]}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAF9' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 30, marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#1B5E20' },
  pageSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 13, color: '#888', marginBottom: 8 },
  genderToggleContainer: { flexDirection: 'row', backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 15, position: 'relative', height: 45 },
  genderActiveBackground: { position: 'absolute', width: '50%', height: '100%', backgroundColor: '#4CAF50', borderRadius: 12 },
  genderToggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  genderText: { fontSize: 14, fontWeight: '600', color: '#888' },
  genderTextActive: { color: '#FFF' },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  measurementLabel: { fontSize: 15, color: '#555' },
  measurementValue: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  dividerSmall: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  
  // 🌟 สไตล์สำหรับ BMI แบบใหม่
  bmiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  bmiNumberText: { fontSize: 40, fontWeight: 'bold', color: '#112233', marginRight: 12 },
  bmiBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bmiBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  bmiBarContainer: { position: 'relative', marginBottom: 35, marginTop: 10 },
  bmiMarker: { position: 'absolute', top: -14, marginLeft: -7, zIndex: 10, alignItems: 'center' },
  triangleDown: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#333' },
  bmiColorBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  bmiScaleLabels: { position: 'relative', height: 20, marginTop: 8 },
  scaleLabelText: { position: 'absolute', fontSize: 12, color: '#888' },
  bmiSuggestionBox: { backgroundColor: '#FFF9E6', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sparkleIcon: { fontSize: 20, marginRight: 10 },
  suggestionText: { fontSize: 14, color: '#333', fontWeight: '500', flex: 1 },

  journeyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  diffWeightText: { color: '#4CAF50', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, fontWeight: 'bold', fontSize: 12 },
  planSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  planBox: { flex: 1, backgroundColor: '#F9FAF9', padding: 15, borderRadius: 16, alignItems: 'center', marginHorizontal: 4 },
  planLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  planValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  dailyBudgetSection: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
  dailyBudgetLabel: { fontSize: 14, color: '#666' },
  dailyCalorieText: { fontSize: 44, fontWeight: 'bold' },
  smallKcal: { fontSize: 18, fontWeight: 'normal' },
  warningText: { color: '#FF5252', fontSize: 12, marginTop: 5, textAlign: 'center' },
  saveButton: { flexDirection: 'row', backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  
  pickerModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerModalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginBottom: 10 },
  cancelText: { color: '#888', fontSize: 16, fontWeight: 'bold' },
  modalTitle: { fontWeight: 'bold', fontSize: 18, color: '#333' },
  confirmText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
  datePickerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 250, position: 'relative' },
  globalHighlightBar: { position: 'absolute', top: 100, left: 0, right: 0, height: 50, backgroundColor: '#E8F5E9', borderRadius: 12, zIndex: 0 },

  activityModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  activityModalCard: { backgroundColor: '#FFF', width: width * 0.9, borderRadius: 24, padding: 25 },
  activityModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  activityModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  activityOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  activeActivityOption: { backgroundColor: '#E8F5E9', borderRadius: 12, borderBottomWidth: 0, paddingHorizontal: 10 },
  activityLabelText: { fontSize: 16, fontWeight: '600', color: '#333' },
  activityDescText: { fontSize: 13, color: '#888', marginTop: 4 },
  activeActivityText: { color: '#1B5E20' },
  activeActivityDescText: { color: '#4CAF50' }
});
