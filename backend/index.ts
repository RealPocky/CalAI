import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const app = express();
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 5000;

const allowedMealTypes = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

const getOrCreateDefaultUser = async () => {
  let user = await prisma.user.findFirst();

  if (!user) {
    user = await prisma.user.create({
      data: {
        gender: 'male',
        weight: 102,
        height: 177,
        targetWeight: 80,
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
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY is not set' });
    }

    const imageBase64 = String(req.body.imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image. Return only JSON in this shape:
{"name":"Thai food name","calories":0,"protein":0,"carbs":0,"fat":0}

If the image is not food, return only:
{"error":"นี่ไม่ใช่รูปอาหาร ลองสแกนใหม่อีกครั้งนะครับ"}`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      console.error(raw);
      return res.status(502).json({ error: 'Food analysis failed' });
    }

    const result = JSON.parse(raw);
    const text = result.choices?.[0]?.message?.content || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const foodData = JSON.parse(cleanJson);

    res.json(foodData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.patch('/api/user', async (req, res) => {
  try {
    const existingUser = await getOrCreateDefaultUser();
    const data = {
      gender: req.body.gender === 'female' ? 'female' : 'male',
      dob: req.body.dob ? new Date(req.body.dob) : null,
      weight: Number(req.body.weight) || 0,
      height: Number(req.body.height) || 0,
      targetWeight: Number(req.body.targetWeight) || 0,
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
      activityLevel: Number(req.body.activityLevel) || 1.2,
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
