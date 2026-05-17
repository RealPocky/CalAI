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

export interface ActivityItem {
  id: string;
  name: string;
  calories: number;
}

interface MealsData {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  snack: FoodItem[];
}

export interface UserProfile {
  id?: string;
  gender: '' | 'male' | 'female';
  dob: Date | null;
  weight: string;
  startingWeight: string;
  height: string;
  targetWeight: string;
  targetDate: Date | null;
  activityLevel: number;
  lossPace: 'gradual' | 'normal' | 'aggressive' | null;
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
  activities: ActivityItem[];
  addActivity: (activity: Omit<ActivityItem, 'id'>) => void;
  updateActivity: (activityId: string, updates: Partial<Omit<ActivityItem, 'id'>>) => void;
  deleteActivity: (activityId: string) => void;
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
  gender: '',
  dob: null,
  weight: '',
  startingWeight: '',
  height: '',
  targetWeight: '',
  targetDate: null,
  activityLevel: 0,
  lossPace: null,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const toTextInputValue = (value: unknown, fallback: string) => {
  if (value === null || value === undefined) return fallback;
  if (Number(value) === 0) return '';
  return String(value);
};

const toDateOrNull = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const mapBackendUserToProfile = (user: any, current: UserProfile): UserProfile => ({
  id: user.id ?? current.id,
  gender: user.gender === 'male' || user.gender === 'female' ? user.gender : '',
  dob: toDateOrNull(user.dob) ?? current.dob,
  weight: toTextInputValue(user.weight, current.weight),
  startingWeight: current.startingWeight || (Number(user.weight) > 0 ? String(Number(user.weight) + 5) : ''),
  height: toTextInputValue(user.height, current.height),
  targetWeight: toTextInputValue(user.targetWeight, current.targetWeight),
  targetDate: toDateOrNull(user.targetDate) ?? current.targetDate,
  activityLevel: typeof user.activityLevel === 'number' && user.activityLevel > 0 ? user.activityLevel : current.activityLevel,
  lossPace: current.lossPace,
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
  const [activities, setActivities] = useState<ActivityItem[]>([]);
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

        const [storedTarget, storedLastDate, storedLossPace, storedActivities, storedExerciseCalories, storedStartingWeight] = await Promise.all([
          AsyncStorage.getItem('user_daily_target'),
          AsyncStorage.getItem('user_last_date'),
          AsyncStorage.getItem('user_loss_pace'),
          AsyncStorage.getItem('user_activities'),
          AsyncStorage.getItem('user_exercise_calories'),
          AsyncStorage.getItem('user_starting_weight'),
        ]);

        if (storedTarget) setDailyTarget(parseInt(storedTarget, 10));
        if (storedLossPace === 'gradual' || storedLossPace === 'normal' || storedLossPace === 'aggressive') {
          setUserProfile(prev => ({ ...prev, lossPace: storedLossPace }));
        }
        if (storedStartingWeight) {
          setUserProfile(prev => ({ ...prev, startingWeight: storedStartingWeight }));
        }

        if (storedLastDate !== todayStr) {
          await AsyncStorage.setItem('user_last_date', todayStr);
          setActivities([]);
          await AsyncStorage.setItem('user_activities', '[]');
          await AsyncStorage.setItem('user_exercise_calories', '0');
        } else if (storedActivities) {
          const parsedActivities = JSON.parse(storedActivities);
          if (Array.isArray(parsedActivities)) {
            setActivities(parsedActivities.map(item => ({
              id: String(item.id),
              name: String(item.name || 'ออกกำลังกาย'),
              calories: Number(item.calories) || 0,
            })));
          }
        } else if (storedExerciseCalories) {
          const legacyCalories = parseInt(storedExerciseCalories, 10) || 0;
          if (legacyCalories > 0) {
            setActivities([{ id: 'legacy-exercise', name: 'ออกกำลังกาย', calories: legacyCalories }]);
          }
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
    AsyncStorage.setItem('user_loss_pace', userProfile.lossPace ?? '');
    AsyncStorage.setItem('user_starting_weight', userProfile.startingWeight);
    AsyncStorage.setItem('user_activities', JSON.stringify(activities));
    AsyncStorage.setItem('user_exercise_calories', activities.reduce((sum, item) => sum + item.calories, 0).toString());
  }, [mealsData, waterIntake, waterGoal, waterIncrement, dailyTarget, userProfile.lossPace, userProfile.startingWeight, activities, isLoaded]);

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

  const addActivity = (activity: Omit<ActivityItem, 'id'>) => {
    setActivities(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: activity.name || 'ออกกำลังกาย',
        calories: Math.max(0, Number(activity.calories) || 0),
      },
    ]);
  };

  const updateActivity = (activityId: string, updates: Partial<Omit<ActivityItem, 'id'>>) => {
    setActivities(prev =>
      prev.map(activity =>
        activity.id === activityId
          ? {
              ...activity,
              ...updates,
              name: updates.name === undefined ? activity.name : updates.name || 'ออกกำลังกาย',
              calories: updates.calories === undefined ? activity.calories : Math.max(0, Number(updates.calories) || 0),
            }
          : activity
      )
    );
  };

  const deleteActivity = (activityId: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== activityId));
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
        activities,
        addActivity,
        updateActivity,
        deleteActivity,
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
