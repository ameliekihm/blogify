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

app.use(cors());
app.use(express.json());

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
    } catch (err) {
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

io.on('connection', (socket) => {
  socket.on('cursor-move', (data) => {
    socket.broadcast.emit('cursor-move', data);
  });
  socket.on('text-change', (data) => {
    socket.broadcast.emit('text-change', data);
  });
  socket.on('post-editing', (postId) => {
    socket.broadcast.emit('post-editing', postId);
  });
  socket.on('post-editing-done', (postId) => {
    socket.broadcast.emit('post-editing-done', postId);
  });
  socket.on('post-typing', (data) => {
    socket.broadcast.emit('post-typing', data);
  });
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
  socket.on('post-checked', (data) => {
    socket.broadcast.emit('post-checked', data);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
