const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let posts = [];
let nextId = 1;

app.get('/api/posts', (req, res) => {
  res.json(posts);
});

app.post('/api/posts', (req, res) => {
  const { title, body } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const newPost = { id: nextId++, title, body };
  posts.push(newPost);
  res.status(201).json(newPost);
});

app.delete('/api/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  const deletedPost = posts.splice(index, 1)[0];
  res.json(deletedPost);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
