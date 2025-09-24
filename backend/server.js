const express = require('express');
const app = express();
const PORT = 4000;
const cors = require('cors');

app.use(cors());
app.use(express.json());

let posts = [];

// GET posts
app.get('/api/posts', (req, res) => {
  res.json(posts);
});

// POST post
app.post('/api/posts', (req, res) => {
  const { title, body } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const newPost = { id: posts.length + 1, title, body };
  posts.push(newPost);
  res.status(201).json(newPost);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
