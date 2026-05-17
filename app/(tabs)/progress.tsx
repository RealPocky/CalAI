import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Modal, TextInput, TouchableOpacity } from 'react-native';
// 🌟 เปลี่ยนมาใช้ไอคอนแบบ SVG ของ Lucide
import { ArrowRight, Check, X as XIcon, Minus, Flame, Droplets } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../../src/AppContext';

export default function ProgressScreen() {
  const isFocused = useIsFocused();
  const { userProfile, setUserProfile, waterIntake, waterIncrement } = useAppContext();
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  
  const last7Days = [
    { day: 'จ.', status: 'success' },
    { day: 'อ.', status: 'success' },
    { day: 'พ.', status: 'fail' },
    { day: 'พฤ.', status: 'success' },
    { day: 'ศ.', status: 'pending' },
    { day: 'ส.', status: 'pending' },
    { day: 'อา.', status: 'pending' },
  ];

  const weight = userProfile.weight;
  const startingWeight = userProfile.startingWeight;
  const targetWeight = userProfile.targetWeight;
  const recordedDays = 12;
  const totalWaterGlasses = Math.max(45, Math.round(waterIntake / Math.max(waterIncrement, 1)));
  const averageWaterGlasses = recordedDays > 0 ? totalWaterGlasses / recordedDays : 0;

  const progressPercent = useMemo(() => {
    const start = parseFloat(startingWeight);
    const current = parseFloat(weight);
    const target = parseFloat(targetWeight);
    const safeStart = start > current ? start : current > 0 ? current + 5 : 0;
    const totalToLose = safeStart - target;
    const lostSoFar = safeStart - current;

    if (!safeStart || !current || !target || totalToLose <= 0) return current <= target && target > 0 ? 100 : 0;
    return Math.max(0, Math.min((lostSoFar / totalToLose) * 100, 100));
  }, [startingWeight, weight, targetWeight]);

  const displayStartingWeight = useMemo(() => {
    const start = parseFloat(startingWeight);
    const current = parseFloat(weight);
    if (start > 0) return start;
    return current > 0 ? current + 5 : 0;
  }, [startingWeight, weight]);

  const openWeightModal = () => {
    setWeightInput(weight && weight !== '0' ? weight : '');
    setWeightModalVisible(true);
  };

  const saveLatestWeight = () => {
    const nextWeight = parseFloat(weightInput);
    if (!nextWeight || nextWeight <= 0) return;

    setUserProfile(prev => ({
      ...prev,
      weight: nextWeight.toString(),
      startingWeight: prev.startingWeight || (parseFloat(prev.weight) > 0 ? prev.weight : (nextWeight + 5).toString()),
    }));
    setWeightModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.pageTitle}>สรุปผลการเปลี่ยนแปลง 📈</Text>
          <Text style={styles.pageSubtitle}>คุณทำได้ดีมาก! มาดูความสำเร็จกันครับ</Text>
        </View>

        <MotiView 
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: isFocused ? 1 : 0, translateY: isFocused ? 0 : 20 }}
          style={styles.card}
        >
          <Text style={styles.sectionTitle}>เป้าหมายน้ำหนัก</Text>
          <View style={styles.weightRow}>
            <View>
              <Text style={styles.weightLabel}>ปัจจุบัน</Text>
              <Text style={styles.weightValue}>{weight} <Text style={styles.unit}>กก.</Text></Text>
            </View>
            <ArrowRight size={24} color="#CCC" />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.weightLabel}>เป้าหมาย</Text>
              <Text style={[styles.weightValue, { color: '#4CAF50' }]}>{targetWeight} <Text style={styles.unit}>กก.</Text></Text>
            </View>
          </View>

          <View style={styles.progressBg}>
            <MotiView 
              from={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'timing', duration: 1000 }}
              style={styles.progressFill} 
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressSideLabel}>{displayStartingWeight > 0 ? displayStartingWeight.toFixed(1) : '-'} กก.</Text>
            <Text style={styles.progressPercentText}>{progressPercent.toFixed(0)}%</Text>
            <Text style={styles.progressSideLabel}>{targetWeight || '-'} กก.</Text>
          </View>
          <Text style={styles.hintText}>อีก {(parseFloat(weight) - parseFloat(targetWeight)).toFixed(1)} กก. จะถึงเป้าหมายแล้ว! สู้ๆ ✌️</Text>
          <TouchableOpacity style={styles.updateWeightButton} onPress={openWeightModal} activeOpacity={0.85}>
            <Text style={styles.updateWeightText}>⚖️ อัปเดตน้ำหนักวันนี้</Text>
          </TouchableOpacity>
        </MotiView>

        <MotiView 
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: isFocused ? 1 : 0, translateY: isFocused ? 0 : 20 }}
          delay={200}
          style={styles.card}
        >
          <Text style={styles.sectionTitle}>วินัยการกิน 7 วันล่าสุด</Text>
          <View style={styles.streakContainer}>
            {last7Days.map((item, index) => (
              <View key={index} style={styles.streakItem}>
                <View style={[
                  styles.streakCircle,
                  item.status === 'success' && styles.bgSuccess,
                  item.status === 'fail' && styles.bgFail,
                  item.status === 'pending' && styles.bgPending,
                ]}>
                  {item.status === 'success' ? <Check size={20} color="#FFF" /> : 
                   item.status === 'fail' ? <XIcon size={20} color="#FFF" /> : 
                   <Minus size={20} color="#FFF" />}
                </View>
                <Text style={styles.dayText}>{item.day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.dot, styles.bgSuccess]} /><Text style={styles.legendText}>ในเป้าหมาย</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, styles.bgFail]} /><Text style={styles.legendText}>เกินเป้าหมาย</Text></View>
          </View>
        </MotiView>

        <View style={styles.statsGrid}>
          <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: isFocused ? 1 : 0, scale: isFocused ? 1 : 0.8 }} delay={400} style={styles.smallCard}>
            <Flame size={28} color="#FF9800" />
            <Text style={styles.smallCardValue}>12</Text>
            <Text style={styles.smallCardLabel}>วันที่บันทึก</Text>
          </MotiView>
          <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: isFocused ? 1 : 0, scale: isFocused ? 1 : 0.8 }} delay={500} style={styles.smallCard}>
            <Droplets size={28} color="#2196F3" />
            <Text style={styles.smallCardValue}>{averageWaterGlasses.toFixed(1)}</Text>
            <Text style={styles.smallCardLabel}>เฉลี่ยต่อวัน</Text>
          </MotiView>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={weightModalVisible} onRequestClose={() => setWeightModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.weightModalCard}>
            <Text style={styles.modalTitle}>อัปเดตน้ำหนักวันนี้</Text>
            <TextInput
              style={styles.weightInput}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#BDBDBD"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setWeightModalVisible(false)}>
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveLatestWeight}>
                <Text style={styles.saveButtonText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAF9' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 30, marginBottom: 25 },
  pageTitle: { fontSize: 26, fontWeight: 'bold', color: '#1B5E20' },
  pageSubtitle: { fontSize: 14, color: '#888', marginTop: 5 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  weightLabel: { fontSize: 13, color: '#888', marginBottom: 5 },
  weightValue: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  unit: { fontSize: 16, fontWeight: 'normal', color: '#888' },
  
  progressBg: { height: 12, backgroundColor: '#F0F4F0', borderRadius: 6, overflow: 'hidden', marginBottom: 15 },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 6 },
  progressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  progressSideLabel: { fontSize: 12, color: '#888', fontWeight: '700' },
  progressPercentText: { fontSize: 12, color: '#2E7D32', fontWeight: '800' },
  hintText: { fontSize: 13, color: '#666', fontStyle: 'italic', textAlign: 'center' },
  updateWeightButton: { marginTop: 16, backgroundColor: '#E8F5E9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  updateWeightText: { color: '#1B5E20', fontSize: 15, fontWeight: '800' },

  streakContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  streakItem: { alignItems: 'center' },
  streakCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  dayText: { fontSize: 12, color: '#888' },
  bgSuccess: { backgroundColor: '#4CAF50' },
  bgFail: { backgroundColor: '#FF5252' },
  bgPending: { backgroundColor: '#E0E0E0' },
  
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: '#888' },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  smallCard: { backgroundColor: '#FFF', flex: 1, borderRadius: 24, padding: 20, alignItems: 'center', elevation: 2, shadowOpacity: 0.03 },
  smallCardValue: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 10 },
  smallCardLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  weightModalCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 22, padding: 24 },
  modalTitle: { fontSize: 20, color: '#1B5E20', fontWeight: '800', marginBottom: 18, textAlign: 'center' },
  weightInput: { borderWidth: 1.5, borderColor: '#DDEEDD', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 28, color: '#222', fontWeight: '800', marginBottom: 18, textAlign: 'center' },
  modalActions: { flexDirection: 'row' },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginRight: 8 },
  cancelButtonText: { color: '#444', fontSize: 16, fontWeight: '800' },
  saveButton: { flex: 1, backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginLeft: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
