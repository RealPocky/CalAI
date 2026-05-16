import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealsData {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  snack: FoodItem[];
}

export interface UserProfile {
  id?: string;
  gender: 'male' | 'female';
  dob: Date | null;
  weight: string;
  height: string;
  targetWeight: string;
  targetDate: Date | null;
  activityLevel: number;
}

interface AppContextType {
  mealsData: MealsData;
  addFoodToMeal: (mealId: keyof MealsData, food: FoodItem) => Promise<void>;
  removeFoodFromMeal: (mealId: keyof MealsData, foodId: string) => Promise<void>;
  waterIntake: number;
  setWaterIntake: (val: number | ((prev: number) => number)) => void;
  waterGoal: number;
  setWaterGoal: (val: number) => void;
  waterIncrement: number;
  setWaterIncrement: (val: number) => void;
  dailyTarget: number;
  setDailyTarget: (val: number) => void;
  userProfile: UserProfile;
  setUserProfile: (val: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  syncUserWithBackend: () => Promise<void>;
  syncMealsWithBackend: () => Promise<void>;
  saveUserToBackend: (updates?: Partial<UserProfile>) => Promise<void>;
}

const emptyMealsData: MealsData = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
};

const defaultUserProfile: UserProfile = {
  gender: 'male',
  dob: new Date(2004, 9, 25),
  weight: '102',
  height: '177',
  targetWeight: '80',
  targetDate: new Date(2026, 8, 30),
  activityLevel: 1.2,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const toTextInputValue = (value: unknown, fallback: string) => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const toDateOrNull = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const mapBackendUserToProfile = (user: any, current: UserProfile): UserProfile => ({
  id: user.id ?? current.id,
  gender: user.gender === 'female' ? 'female' : 'male',
  dob: toDateOrNull(user.dob) ?? current.dob,
  weight: toTextInputValue(user.weight, current.weight),
  height: toTextInputValue(user.height, current.height),
  targetWeight: toTextInputValue(user.targetWeight, current.targetWeight),
  targetDate: toDateOrNull(user.targetDate) ?? current.targetDate,
  activityLevel: typeof user.activityLevel === 'number' ? user.activityLevel : current.activityLevel,
});

const mapProfileToBackendPayload = (profile: UserProfile) => ({
  gender: profile.gender,
  dob: profile.dob?.toISOString() ?? null,
  weight: Number(profile.weight) || 0,
  height: Number(profile.height) || 0,
  targetWeight: Number(profile.targetWeight) || 0,
  targetDate: profile.targetDate?.toISOString() ?? null,
  activityLevel: profile.activityLevel,
});

const emptyMeals = (): MealsData => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
});

const isMealId = (value: string): value is keyof MealsData =>
  value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack';

export function AppProvider({ children }: { children: ReactNode }) {
  const [mealsData, setMealsData] = useState<MealsData>(emptyMealsData);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2000);
  const [waterIncrement, setWaterIncrement] = useState(250);
  const [dailyTarget, setDailyTarget] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [isLoaded, setIsLoaded] = useState(false);

  const syncUserWithBackend = async () => {
    const response = await fetch(`${API_BASE_URL}/api/user/sync`);

    if (!response.ok) {
      throw new Error(`Sync user failed with status ${response.status}`);
    }

    const data = await response.json();
    const backendUser = data.user;

    if (!backendUser) return;

    setUserProfile(prev => mapBackendUserToProfile(backendUser, prev));

    if (typeof backendUser.currentWater === 'number') setWaterIntake(backendUser.currentWater);
    if (typeof backendUser.waterGoal === 'number') setWaterGoal(backendUser.waterGoal);
    if (typeof backendUser.waterIncrement === 'number') setWaterIncrement(backendUser.waterIncrement);
  };

  const syncMealsWithBackend = async () => {
    const response = await fetch(`${API_BASE_URL}/api/meals`);

    if (!response.ok) {
      throw new Error(`Sync meals failed with status ${response.status}`);
    }

    const data = await response.json();
    const nextMeals = emptyMeals();

    for (const meal of data.meals || []) {
      const mealType = String(meal.mealType);
      if (!isMealId(mealType)) continue;

      nextMeals[mealType].push({
        id: String(meal.id),
        name: String(meal.name),
        calories: Number(meal.calories) || 0,
        protein: Number(meal.protein) || 0,
        carbs: Number(meal.carbs) || 0,
        fat: Number(meal.fat) || 0,
      });
    }

    setMealsData(nextMeals);
    if (typeof data.currentWater === 'number') setWaterIntake(data.currentWater);
  };

  const saveUserToBackend = async (updates?: Partial<UserProfile>) => {
    const profileToSave = { ...userProfile, ...updates };
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...mapProfileToBackendPayload(profileToSave),
        waterGoal,
        waterIncrement,
        currentWater: waterIntake,
      }),
    });

    if (!response.ok) {
      throw new Error(`Save user failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.user) {
      setUserProfile(prev => mapBackendUserToProfile(data.user, prev));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await syncUserWithBackend();
        await syncMealsWithBackend();

        const todayStr = new Date().toLocaleDateString('th-TH');

        const [storedTarget, storedLastDate] = await Promise.all([
          AsyncStorage.getItem('user_daily_target'),
          AsyncStorage.getItem('user_last_date'),
        ]);

        if (storedTarget) setDailyTarget(parseInt(storedTarget, 10));

        if (storedLastDate !== todayStr) {
          await AsyncStorage.setItem('user_last_date', todayStr);
        }
      } catch (e) {
        console.error('Failed to load app data', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    AsyncStorage.setItem('user_meals_diary', JSON.stringify(mealsData));
    AsyncStorage.setItem('user_water_intake', waterIntake.toString());
    AsyncStorage.setItem('user_water_goal', waterGoal.toString());
    AsyncStorage.setItem('user_water_increment', waterIncrement.toString());
    AsyncStorage.setItem('user_daily_target', dailyTarget.toString());
  }, [mealsData, waterIntake, waterGoal, waterIncrement, dailyTarget, isLoaded]);

  const removeFoodFromMeal = async (mealId: keyof MealsData, foodId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/meals/${encodeURIComponent(foodId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete meal failed with status ${response.status}`);
      }

      setMealsData(prev => ({ ...prev, [mealId]: prev[mealId].filter(f => f.id !== foodId) }));
    } catch (error) {
      console.error('Failed to delete meal', error);
    }
  };

  const saveWaterToBackend = async (currentWater: number) => {
    const response = await fetch(`${API_BASE_URL}/api/water`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentWater }),
    });

    if (!response.ok) {
      throw new Error(`Save water failed with status ${response.status}`);
    }
  };

  const updateWaterIntake = (val: number | ((prev: number) => number)) => {
    setWaterIntake(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveWaterToBackend(next).catch(error => console.error('Failed to save water intake', error));
      return next;
    });
  };

  const addFoodToMeal = async (mealId: keyof MealsData, food: FoodItem) => {
    setMealsData(prev => ({ ...prev, [mealId]: [...prev[mealId], food] }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType: mealId,
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save meal failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.meal?.id) {
        setMealsData(prev => ({
          ...prev,
          [mealId]: prev[mealId].map(item => (item.id === food.id ? { ...item, id: data.meal.id } : item)),
        }));
      }
    } catch (error) {
      console.error('Failed to save meal', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        mealsData,
        addFoodToMeal,
        removeFoodFromMeal,
        waterIntake,
        setWaterIntake: updateWaterIntake,
        waterGoal,
        setWaterGoal,
        waterIncrement,
        setWaterIncrement,
        dailyTarget,
        setDailyTarget,
        userProfile,
        setUserProfile,
        syncUserWithBackend,
        syncMealsWithBackend,
        saveUserToBackend,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
