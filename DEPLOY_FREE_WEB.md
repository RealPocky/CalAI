# Free Web App Deploy

This setup keeps the app free by using:

- Render Free for the Express backend
- Neon PostgreSQL for the database
- Vercel or Cloudflare Pages for the Expo web frontend

## 1. Deploy Backend To Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from this repo.
3. Render will read `render.yaml` and create `calai-backend`.
4. Add this environment variable in Render:

```env
DATABASE_URL=your_neon_postgres_connection_string
GROQ_API_KEY=your_groq_api_key
```

5. Deploy and copy the backend URL, for example:

```text
https://calai-backend.onrender.com
```

Check this URL in a browser:

```text
https://calai-backend.onrender.com/health
```

It should return:

```json
{"ok":true}
```

## 2. Deploy Frontend To Vercel

1. Import this repo in Vercel.
2. Set the framework/build settings:

```text
Build Command: npm run build:web
Output Directory: dist
```

3. Add this environment variable:

```env
EXPO_PUBLIC_API_URL=https://calai-backend.onrender.com
```

4. Deploy.

## 3. Use On iPhone

Open the frontend URL in Safari, then use:

```text
Share -> Add to Home Screen
```

Now it behaves like a personal web app icon on your iPhone.

## Notes

Render Free can sleep after inactivity. The first request after sleeping can be slow, but it should wake up automatically.
