const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const PORT = 4000;
const DATA_FILE = path.join(__dirname, '../data/posts.json');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || '6379';

const pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});

app.use(cors());
app.use(express.json());

let posts = [];
let nextId = 1;

function loadPosts() {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    try {
      posts = JSON.parse(raw);
      if (posts.length > 0) {
        nextId = Math.max(...posts.map((p) => p.id)) + 1;
      }
    } catch (err) {
      console.error('Failed to parse posts.json:', err);
      posts = [];
    }
  }
}

function savePosts() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
}

loadPosts();

app.get('/api/posts', (req, res) => {
  res.json(posts);
});

app.post('/api/posts', (req, res) => {
  const { title, body, type } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!type) return res.status(400).json({ error: 'Type is required' });

  const newPost = { id: nextId++, title, body, type };
  if (type === 'todo') newPost.done = false;

  posts.push(newPost);
  savePosts();

  io.emit('post-added', newPost);
  res.status(201).json(newPost);
});

app.patch('/api/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { title, body, done } = req.body;
  if (typeof title === 'string') post.title = title;
  if (typeof body === 'string') post.body = body;
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
  savePosts();

  io.emit('post-deleted', deletedPost);
  res.json(deletedPost);
});

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on('cursor-move', (data) => {
    // { userId, position }
    socket.broadcast.emit('cursor-move', data);
  });

  socket.on('text-change', (data) => {
    // { userId, content }
    socket.broadcast.emit('text-change', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
