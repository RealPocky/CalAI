import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
// 🌟 เปลี่ยนมาใช้ไอคอนแบบ SVG ของ Lucide
import { ArrowRight, Check, X as XIcon, Minus, Flame, Droplets } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../../src/AppContext';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const isFocused = useIsFocused();
  const { userProfile } = useAppContext();
  
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
  const targetWeight = userProfile.targetWeight;

  const progressPercent = useMemo(() => {
    const current = parseFloat(weight);
    const target = parseFloat(targetWeight);
    if (!current || !target || current <= target) return 100;
    
    const totalToLose = 20; 
    const lostSoFar = Math.max(0, 10); 
    return Math.min((lostSoFar / totalToLose) * 100, 100);
  }, [weight, targetWeight]);

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
          <Text style={styles.hintText}>อีก {(parseFloat(weight) - parseFloat(targetWeight)).toFixed(1)} กก. จะถึงเป้าหมายแล้ว! สู้ๆ ✌️</Text>
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
            <Text style={styles.smallCardValue}>45</Text>
            <Text style={styles.smallCardLabel}>แก้วน้ำรวม</Text>
          </MotiView>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
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
  hintText: { fontSize: 13, color: '#666', fontStyle: 'italic', textAlign: 'center' },

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
  smallCardLabel: { fontSize: 12, color: '#888', marginTop: 2 }
});
