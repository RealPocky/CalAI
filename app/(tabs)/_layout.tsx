import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
// 🌟 เปลี่ยนมาใช้ไอคอนแบบ SVG ของ Lucide แทนIoniconsเพื่อweb
import { LayoutDashboard, BookText, Plus, LineChart, UserCircle, Camera, Dumbbell, X } from 'lucide-react-native';
import { View, StyleSheet, TouchableOpacity, Modal, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppContext } from '../../src/AppContext';

export default function TabLayout() {
  const router = useRouter();
  const { setExerciseCalories } = useAppContext();
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [exerciseInput, setExerciseInput] = useState('');

  const openScanner = () => {
    setActionMenuVisible(false);
    router.push('/scanner');
  };

  const openExerciseModal = () => {
    setActionMenuVisible(false);
    setExerciseInput('');
    setExerciseModalVisible(true);
  };

  const saveExercise = () => {
    const burned = Math.max(0, parseInt(exerciseInput, 10) || 0);
    setExerciseCalories(prev => prev + burned);
    setExerciseModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
        <Tabs 
          screenOptions={{ 
            headerShown: false,
            tabBarActiveTintColor: '#1B5E20', // สีเขียวหลัก
            tabBarInactiveTintColor: '#A0A0A0', // สีเทา
            tabBarStyle: {
              height: 80, // ปรับความสูงสำหรับเว็บ
              paddingBottom: 20, 
              paddingTop: 10,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderColor: '#F0F0F0',
              elevation: 0, 
              shadowOpacity: 0.02,
              zIndex: 10,
            }
          }}
        >
          {/* 🌟 ไล่เปลี่ยนไอคอนทั้ง 4 ตัวเป็น SVG/web-safe */}
          <Tabs.Screen 
            name="index" 
            options={{ title: 'แดชบอร์ด', tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} /> }} 
          />
          <Tabs.Screen 
            name="history" 
            options={{ title: 'ไดอารี่', tabBarIcon: ({ color }) => <BookText size={24} color={color} /> }} 
          />
          {/* หลุมหลบภัยตรงกลาง */}
          <Tabs.Screen name="dummy" options={{ title: '', tabBarButton: () => <View style={{ flex: 1 }} /> }} />
          <Tabs.Screen 
            name="progress" 
            options={{ title: 'สถิติ', tabBarIcon: ({ color }) => <LineChart size={24} color={color} /> }} 
          />
          <Tabs.Screen 
            name="profile" 
            options={{ title: 'บัญชี', tabBarIcon: ({ color }) => <UserCircle size={24} color={color} /> }} 
          />
        </Tabs>

        {/* ปุ่มบวกตรงกลาง ลอยอย่างสวยงาม */}
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.bigPlusButton} onPress={() => setActionMenuVisible(true)}>
            <Plus size={32} color="#FFF" strokeWidth={3} />
          </TouchableOpacity>
        </View>

        <Modal animationType="fade" transparent visible={actionMenuVisible} onRequestClose={() => setActionMenuVisible(false)}>
          <TouchableOpacity style={styles.actionBackdrop} activeOpacity={1} onPress={() => setActionMenuVisible(false)}>
            <View style={styles.actionSheet}>
              <TouchableOpacity style={styles.actionItem} onPress={openScanner}>
                <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}><Camera size={22} color="#2E7D32" /></View>
                <Text style={styles.actionText}>สแกนอาหาร</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={openExerciseModal}>
                <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}><Dumbbell size={22} color="#1E88E5" /></View>
                <Text style={styles.actionText}>บันทึกออกกำลังกาย</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal animationType="fade" transparent visible={exerciseModalVisible} onRequestClose={() => setExerciseModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.exerciseBackdrop}>
            <View style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseTitle}>บันทึกออกกำลังกาย</Text>
                <TouchableOpacity onPress={() => setExerciseModalVisible(false)} style={styles.closeButton}>
                  <X size={22} color="#777" />
                </TouchableOpacity>
              </View>
              <Text style={styles.exerciseLabel}>แคลอรี่ที่เผาผลาญ</Text>
              <View style={styles.exerciseInputRow}>
                <TextInput
                  value={exerciseInput}
                  onChangeText={setExerciseInput}
                  keyboardType="numeric"
                  placeholder="300"
                  style={styles.exerciseInput}
                  autoFocus
                />
                <Text style={styles.exerciseUnit}>kcal</Text>
              </View>
              <TouchableOpacity style={styles.saveExerciseButton} onPress={saveExercise}>
                <Text style={styles.saveExerciseText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center', zIndex: 100 },
  bigPlusButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1B5E20', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowOpacity: 0.2 },
  actionBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', padding: 20, paddingBottom: 100 },
  actionSheet: { backgroundColor: '#FFF', borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionText: { fontSize: 16, color: '#222', fontWeight: '700' },
  exerciseBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exerciseCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFF', borderRadius: 22, padding: 22 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  exerciseTitle: { fontSize: 20, color: '#1B5E20', fontWeight: '800' },
  closeButton: { padding: 6 },
  exerciseLabel: { color: '#666', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  exerciseInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDEEDD', borderRadius: 14, paddingHorizontal: 14, marginBottom: 18 },
  exerciseInput: { flex: 1, fontSize: 28, fontWeight: '800', color: '#222', paddingVertical: 12 },
  exerciseUnit: { fontSize: 16, color: '#777', fontWeight: '700' },
  saveExerciseButton: { backgroundColor: '#1B5E20', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveExerciseText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
