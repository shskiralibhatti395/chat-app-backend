const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const http       = require('http');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

// Frontend URL Variable (Taake bar bar change na karna pare)
const FRONTEND_URL = 'https://chat-app-frontend-rust-six.vercel.app';

// 1. Socket.io mein sahi CORS configuration
const io = new Server(server, {
  cors: { 
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 2. Express Application mein sahi CORS configuration
app.use(cors({ 
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connect ho gaya!'))
  .catch((err) => console.log('Error:', err));

const userSchema = new mongoose.Schema({
  name:     String,
  email:    String,
  password: String,
});
const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
  name: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.json({ error: 'Email already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashed });
  await user.save();
  res.json({ success: true });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ error: 'User nahi mila!' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.json({ error: 'Password galat hai!' });
  const token = jwt.sign({ id: user._id, name: user.name }, 'secret123');
  res.json({ token, name: user.name });
});

app.get('/messages', async (req, res) => {
  const messages = await Message.find();
  res.json(messages);
});

app.delete('/messages/:id', async (req, res) => {
  try {
    console.log('Deleting message ID:', req.params.id);
    const message = await Message.findByIdAndDelete(req.params.id);
    console.log('Delete result:', message);
    if (message) {
      res.status(200).json({ success: true, deletedMessage: message });
    } else {
      res.status(404).json({ error: 'Message nahi mila' });
    }
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete mein error: ' + err.message });
  }
});

io.on('connection', (socket) => {
  console.log('Naya user connect hua!');
  socket.on('message', async (data) => {
    const message = new Message(data);
    const savedMessage = await message.save();
    io.emit('message', { ...data, _id: savedMessage._id });
  });
  socket.on('disconnect', () => {
    console.log('User chala gaya!');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server port ${PORT} pe chal raha hai`);
});
