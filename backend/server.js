import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = 4000;
const DATA_FILE = path.join(__dirname, '../data/posts.json');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || '6379';

const pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:4000/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        photo: profile.photos[0].value,
      };
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign(req.user, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    res.redirect(`http://localhost:5173?token=${token}`);
  }
);

app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json(decoded);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

let posts = [];
let order = [];
let nextId = 1;

function loadPosts() {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    try {
      const data = JSON.parse(raw);
      posts = data.posts || [];
      order = data.order || posts.map((p) => p.id);
      if (posts.length > 0) {
        nextId = Math.max(...posts.map((p) => p.id)) + 1;
      }
    } catch {
      posts = [];
      order = [];
    }
  }
}

function savePosts() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ posts, order }, null, 2));
}

loadPosts();

app.get('/api/posts', (req, res) => {
  res.json({ posts, order });
});

app.post('/api/posts', (req, res) => {
  const { title, body, type } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!type) return res.status(400).json({ error: 'Type is required' });
  const newPost = { id: nextId++, title, body, type };
  if (type === 'todo') {
    newPost.done = false;
    newPost.checks = [];
  }
  posts.push(newPost);
  order.push(newPost.id);
  savePosts();
  io.emit('post-added', newPost);
  res.status(201).json(newPost);
});

app.patch('/api/posts/reorder', (req, res) => {
  const { order: newOrder } = req.body;
  if (!Array.isArray(newOrder)) {
    return res.status(400).json({ error: 'order must be an array' });
  }
  const valid = newOrder.every((id) => posts.find((p) => p.id === id));
  if (!valid) {
    return res.status(400).json({ error: 'Invalid postId in order' });
  }
  order = newOrder;
  savePosts();
  io.emit('posts-reordered', order);
  res.json({ success: true, order });
});

app.patch('/api/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { title, body, done, checks } = req.body;
  if (typeof title === 'string') post.title = title;
  if (typeof body === 'string') post.body = body;
  if (Array.isArray(checks)) post.checks = checks;
  if (typeof done === 'boolean') post.done = done;
  savePosts();
  io.emit('post-updated', post);
  res.json(post);
});

app.delete('/api/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });
  const deletedPost = posts.splice(index, 1)[0];
  order = order.filter((oid) => oid !== id);
  savePosts();
  io.emit('post-deleted', deletedPost);
  res.json(deletedPost);
});

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

  socket.on('post-updated', (data) => {
    const post = posts.find((p) => p.id === data.id);
    if (post) {
      if (typeof data.title === 'string') post.title = data.title;
      if (typeof data.body === 'string') post.body = data.body;
      if (Array.isArray(data.checks)) post.checks = data.checks;
      if (typeof data.done === 'boolean') post.done = data.done;
      savePosts();
      io.emit('post-updated', post);
    }
  });

  socket.on('post-checked', (data) =>
    socket.broadcast.emit('post-checked', data)
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
      if (map.size === 0) {
        editingUsers.delete(postId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
