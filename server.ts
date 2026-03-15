import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

app.use(express.json());

// OAuth Routes
app.get('/api/auth/url', (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await client.getToken(code as string);
    // In a real app, you'd store tokens in a session/cookie
    // For this demo, we'll send them back to the client to store in localStorage (not secure for production, but works for demo)
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Error:', error);
    res.status(500).send('Authentication failed');
  }
});

// YouTube API Proxy
app.get('/api/youtube/history', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/activities', {
      params: {
        mine: true,
        part: 'snippet,contentDetails',
        maxResults: 50
      },
      headers: {
        Authorization: authHeader
      }
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('History Fetch Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
