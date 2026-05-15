import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
// 🌟 ใช้ SVG Icons แทน
import { CalendarDays, Utensils, Flame } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useAppContext } from '../../src/AppContext';

export default function HistoryScreen() {
  const { mealsData } = useAppContext();
  
  // ดึงข้อมูลอาหารทั้งหมดของวันนี้มารวมกัน
  const allFoods = Object.values(mealsData).flat();
  const totalCalories = allFoods.reduce((sum, item) => sum + item.calories, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <MotiView 
          from={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ type: 'spring' }}
          style={styles.iconContainer}
        >
          <CalendarDays size={80} color="#E8F5E9" strokeWidth={1} fill="#4CAF50" />
        </MotiView>
        
        <Text style={styles.title}>ไดอารี่การกินวันนี้</Text>
        <Text style={styles.subtitle}>รวมแคลอรี่ทั้งหมด: {totalCalories.toLocaleString()} kcal</Text>

        <View style={styles.listContainer}>
          {allFoods.length > 0 ? (
            allFoods.map((food, index) => (
              <MotiView 
                key={food.id} 
                from={{ opacity: 0, translateX: -20 }} 
                animate={{ opacity: 1, translateX: 0 }} 
                delay={index * 100} 
                style={styles.foodCard}
              >
                <View style={styles.foodIconBg}>
                  <Utensils size={20} color="#4CAF50" />
                </View>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodMacros}>
                    คาร์บ {food.carbs}g • โปรตีน {food.protein}g • ไขมัน {food.fat}g
                  </Text>
                </View>
                <View style={styles.calContainer}>
                  <Text style={styles.foodCal}>{food.calories}</Text>
                  <Text style={styles.kcalText}>kcal</Text>
                </View>
              </MotiView>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Flame size={40} color="#CCC" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>ยังไม่มีบันทึกอาหารในวันนี้ครับ 🍽️</Text>
              <Text style={styles.emptySubText}>ลองกดปุ่ม + เพื่อสแกนอาหารมื้อแรกดูสิ!</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAF9' },
  container: { flexGrow: 1, alignItems: 'center', padding: 20, paddingTop: 40 },
  iconContainer: { marginBottom: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1B5E20', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30, fontWeight: '500' },
  
  listContainer: { width: '100%' },
  foodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  foodIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  foodMacros: { fontSize: 12, color: '#888' },
  calContainer: { alignItems: 'flex-end' },
  foodCal: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50' },
  kcalText: { fontSize: 10, color: '#888' },

  emptyState: { alignItems: 'center', marginTop: 40, padding: 30, backgroundColor: '#FFF', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#EEE' },
  emptyText: { fontSize: 16, color: '#666', fontWeight: 'bold', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#AAA' }
});
