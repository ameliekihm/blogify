const express = require('express');

const app = express();
const port = 4000;

app.use(express.json());

// In-memory stores
let posts = [];
let notes = [];
let todos = [];

// Routes
app.get('/api/posts', (req, res) => res.json(posts));
app.post('/api/posts', (req, res) => {
  posts.push(req.body);
  res.status(201).json({ message: 'Post created' });
});

app.get('/api/notes', (req, res) => res.json(notes));
app.post('/api/notes', (req, res) => {
  notes.push(req.body);
  res.status(201).json({ message: 'Note created' });
});

app.get('/api/todos', (req, res) => res.json(todos));
app.post('/api/todos', (req, res) => {
  todos.push(req.body);
  res.status(201).json({ message: 'Todo created' });
});

app.listen(port, () => {
  console.log(`Backend API running at http://localhost:${port}`);
});
