import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS: ' + origin));
      }
    },
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS for socket.io: ' + origin));
      }
    },
    credentials: true,
  },
});

const PORT = 4000;

/* ---------------- REDIS ---------------- */
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || '6379';

const pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});

app.use(express.json());

/* ---------------- AUTH (Cognito Only) ---------------- */
let pems;
const jwksUrl = process.env.COGNITO_USER_POOL_ID
  ? `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
  : null;

async function getPems() {
  if (!pems && jwksUrl) {
    const res = await fetch(jwksUrl);
    const { keys } = await res.json();
    pems = {};
    keys.forEach((key) => {
      pems[key.kid] = jwkToPem(key);
    });
  }
  return pems;
}

async function verifyCognitoToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) throw new Error('Invalid JWT');
  const pems = await getPems();
  const pem = pems[decoded.header.kid];
  if (!pem) throw new Error('Invalid kid');
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      pem,
      {
        issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      },
      (err, payload) => {
        if (err) reject(err);
        else resolve(payload);
      }
    );
  });
}

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  const redirectUri =
    req.query.redirect_uri || process.env.COGNITO_REDIRECT_URI;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    const tokenRes = await fetch(`${process.env.COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.COGNITO_CLIENT_ID,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Token exchange failed', data);
      return res
        .status(400)
        .json({ error: 'Token exchange failed', details: data });
    }

    res.json({
      id_token: data.id_token,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  } catch (err) {
    console.error('Callback error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verifyCognitoToken(token);
    res.json(decoded);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/* ---------------- DYNAMODB POSTS ---------------- */
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = 'BlogifyPosts';

app.get('/api/posts', async (req, res) => {
  try {
    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
    let posts = data.Items || [];
    posts = posts.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const order = posts.map((p) => p.id);
    res.json({ posts, order });
  } catch (err) {
    console.error('DynamoDB Scan error', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', async (req, res) => {
  const { title, body, type } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!type) return res.status(400).json({ error: 'Type is required' });

  const newPost = {
    id: Date.now(),
    title,
    body,
    type,
    position: Date.now(),
    ...(type === 'todo' ? { done: false, checks: [] } : {}),
  };

  try {
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: newPost }));
    io.emit('post-added', newPost);
    res.status(201).json(newPost);
  } catch (err) {
    console.error('DynamoDB Put error', err);
    res.status(500).json({ error: 'Failed to add post' });
  }
});

app.patch('/api/posts/reorder', async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array' });
  }
  try {
    for (let i = 0; i < order.length; i++) {
      const id = Number(order[i]);
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id },
          UpdateExpression: 'SET #pos = :p',
          ExpressionAttributeNames: { '#pos': 'position' },
          ExpressionAttributeValues: { ':p': i },
        })
      );
    }
    io.emit('posts-reordered', order);
    res.json({ success: true, order });
  } catch (err) {
    console.error('🔥 DynamoDB Reorder error', err);
    res.status(500).json({ error: 'Failed to reorder posts' });
  }
});

app.patch('/api/posts/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, body, done, checks } = req.body;

  const updateExp = [];
  const expValues = {};
  if (typeof title === 'string') {
    updateExp.push('title = :t');
    expValues[':t'] = title;
  }
  if (typeof body === 'string') {
    updateExp.push('body = :b');
    expValues[':b'] = body;
  }
  if (Array.isArray(checks)) {
    updateExp.push('checks = :c');
    expValues[':c'] = checks;
  }
  if (typeof done === 'boolean') {
    updateExp.push('done = :d');
    expValues[':d'] = done;
  }

  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'SET ' + updateExp.join(', '),
        ExpressionAttributeValues: expValues,
        ReturnValues: 'ALL_NEW',
      })
    );
    const updated = result.Attributes;
    io.emit('post-updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('DynamoDB Update error', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
        ReturnValues: 'ALL_OLD',
      })
    );
    const deleted = result.Attributes;
    io.emit('post-deleted', deleted);
    res.json(deleted);
  } catch (err) {
    console.error('DynamoDB Delete error', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

/* ---------------- SOCKET.IO ---------------- */
const editingUsers = new Map();

io.on('connection', (socket) => {
  socket.on('cursor-move', (data) =>
    socket.broadcast.emit('cursor-move', data)
  );
  socket.on('text-change', (data) =>
    socket.broadcast.emit('text-change', data)
  );
  socket.on('post-editing', (data) => {
    if (!editingUsers.has(data.id)) editingUsers.set(data.id, new Map());
    const map = editingUsers.get(data.id);
    map.set(socket.id, data.user);
    io.emit('post-editing', { ...data, socketId: socket.id });
  });
  socket.on('post-editing-done', (data) => {
    if (editingUsers.has(data.id)) {
      const map = editingUsers.get(data.id);
      const user = map.get(socket.id);
      map.delete(socket.id);
      if (map.size === 0) editingUsers.delete(data.id);
      io.emit('post-editing-done', { id: data.id, user, socketId: socket.id });
    }
  });
  socket.on('post-typing', (data) =>
    socket.broadcast.emit('post-typing', data)
  );
  socket.on('disconnect', () => {
    for (const [postId, map] of editingUsers.entries()) {
      if (map.has(socket.id)) {
        const user = map.get(socket.id);
        map.delete(socket.id);
        io.emit('post-editing-done', {
          id: Number(postId),
          user,
          socketId: socket.id,
        });
      }
      if (map.size === 0) editingUsers.delete(postId);
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on http://localhost:${PORT} (Cognito + DynamoDB)`
  );
});
