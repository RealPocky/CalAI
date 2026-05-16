import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 5000;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const allowedMealTypes = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

const getOrCreateDefaultUser = async () => {
  let user = await prisma.user.findFirst();

  if (!user) {
    user = await prisma.user.create({
      data: {
        gender: '',
        weight: 0,
        height: 0,
        targetWeight: 0,
        activityLevel: 0,
        waterGoal: 2000,
        waterIncrement: 250,
        currentWater: 0,
      },
    });
    console.log('Created new default user');
  }

  return user;
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const parseGeminiJson = (text: string) => {
  const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('CalAI Backend is running smoothly!');
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/user/sync', async (req, res) => {
  try {
    const user = await getOrCreateDefaultUser();
    res.json({ message: 'User synced successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/api/meals', async (req, res) => {
  try {
    const user = await getOrCreateDefaultUser();
    const { start, end } = getTodayRange();

    const meals = await prisma.foodRecord.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ meals, currentWater: user.currentWater });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/api/meals', async (req, res) => {
  try {
    const user = await getOrCreateDefaultUser();
    const mealType = allowedMealTypes.has(req.body.mealType) ? req.body.mealType : 'snack';

    const meal = await prisma.foodRecord.create({
      data: {
        userId: user.id,
        mealType,
        name: String(req.body.name || 'Unknown food'),
        calories: Number(req.body.calories) || 0,
        protein: Number(req.body.protein) || 0,
        carbs: Number(req.body.carbs) || 0,
        fat: Number(req.body.fat) || 0,
      },
    });

    res.status(201).json({ message: 'Meal saved successfully', meal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.delete('/api/meals/:id', async (req, res) => {
  try {
    await prisma.foodRecord.delete({ where: { id: req.params.id } });
    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.patch('/api/water', async (req, res) => {
  try {
    const existingUser = await getOrCreateDefaultUser();
    const currentWater = Math.max(0, Number(req.body.currentWater) || 0);

    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: { currentWater },
    });

    res.json({ message: 'Water updated successfully', currentWater: user.currentWater, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/api/analyze-food', async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const imageBase64 = String(req.body.imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a Thai food nutrition analyzer.
Analyze the food in this image and return only valid JSON. Do not include markdown, comments, or explanations.
Use Thai for the food name when possible.

Required JSON shape:
{"name":"ชื่ออาหาร","calories":0,"protein":0,"carbs":0,"fat":0}

Rules:
- calories, protein, carbs, and fat must be numbers.
- Estimate nutrition for one visible serving.
- If the image is not food, return only:
{"error":"นี่ไม่ใช่รูปอาหาร ลองสแกนใหม่อีกครั้งนะครับ"}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const foodData = parseGeminiJson(result.response.text());

    if (foodData.error) {
      return res.json({ error: String(foodData.error) });
    }

    res.json({
      name: String(foodData.name || 'อาหารไม่ทราบชื่อ'),
      calories: Number(foodData.calories) || 0,
      protein: Number(foodData.protein) || 0,
      carbs: Number(foodData.carbs) || 0,
      fat: Number(foodData.fat) || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.patch('/api/user', async (req, res) => {
  try {
    const existingUser = await getOrCreateDefaultUser();
    const data = {
      gender: req.body.gender === 'male' || req.body.gender === 'female' ? req.body.gender : '',
      dob: req.body.dob ? new Date(req.body.dob) : null,
      weight: Number(req.body.weight) || 0,
      height: Number(req.body.height) || 0,
      targetWeight: Number(req.body.targetWeight) || 0,
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
      activityLevel: Number(req.body.activityLevel) || 0,
      waterGoal: Number(req.body.waterGoal) || 2000,
      waterIncrement: Number(req.body.waterIncrement) || 250,
      currentWater:
        req.body.currentWater === undefined ? existingUser.currentWater : Math.max(0, Number(req.body.currentWater) || 0),
    };

    const user = await prisma.user.update({ where: { id: existingUser.id }, data });

    res.json({ message: 'User saved successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('=========================================');
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('=========================================');
  console.log('');
});
