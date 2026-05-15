import 'dotenv/config'; // 🌟 โหลดตัวแปรจากไฟล์ .env (สำคัญมาก!)
import express from 'express';
import cors from 'cors';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// เปิดใช้งาน Express และ Prisma
const app = express();

// 🌟 ป้อนลิงก์ฐานข้อมูลให้ PrismaClient รู้จักโดยตรง
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PORT = process.env.PORT || 5000;

// อนุญาตให้แอป (Frontend) ส่งข้อมูลข้ามมาหาเซิร์ฟเวอร์ได้
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 🌟 API 1: ทดสอบว่าเซิร์ฟเวอร์ทำงานปกติไหม
app.get('/', (req, res) => {
  res.send('🚀 CalAI Backend is running smoothly!');
});

// 🌟 API 2: สร้างหรือดึงข้อมูลผู้ใช้งาน (แบบชั่วคราวไปก่อน)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/user/sync', async (req, res) => {
  try {
    // ลองหา User คนแรกในระบบ
    let user = await prisma.user.findFirst();

    // ถ้ายังไม่มี User เลย ให้สร้างขึ้นมาใหม่ 1 คน
    if (!user) {
      user = await prisma.user.create({
        data: {
          gender: 'male',
          weight: 102,
          height: 177,
          targetWeight: 80,
          waterGoal: 2000,
        },
      });
      console.log('✨ Created new default user!');
    }

    res.json({ message: 'User synced successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// สั่งให้เซิร์ฟเวอร์เริ่มทำงานและรอรับข้อมูลที่ Port 5000
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
    const existingUser = await prisma.user.findFirst();
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
    };

    const user = existingUser
      ? await prisma.user.update({ where: { id: existingUser.id }, data })
      : await prisma.user.create({ data });

    res.json({ message: 'User saved successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`\n=========================================`);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`=========================================\n`);
});
