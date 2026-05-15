import { Tabs, useRouter } from 'expo-router';
// 🌟 เปลี่ยนมาใช้ไอคอนแบบ SVG ของ Lucide แทนIoniconsเพื่อweb
import { LayoutDashboard, BookText, Plus, LineChart, UserCircle } from 'lucide-react-native';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';

export default function TabLayout() {
  const router = useRouter();

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
          <TouchableOpacity style={styles.bigPlusButton} onPress={() => router.push('/scanner')}>
            <Plus size={32} color="#FFF" strokeWidth={3} />
          </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center', zIndex: 100 },
  bigPlusButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1B5E20', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowOpacity: 0.2 }
});
