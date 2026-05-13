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
const io     = new Server(server, {
  cors: { origin: 'http://localhost:5173' }
});

app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect('mongodb+srv://shakiralibhatti295_db_user:INWzrBtlgeYZS62S@chatapp.sbrdbgf.mongodb.net/?appName=chatapp')
  .then(() => console.log('MongoDB connect ho gaya!'))
  .catch((err) => console.log('Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name:     String,
  email:    String,
  password: String,
});
const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  name: String,
  text: String,
});
const Message = mongoose.model('Message', messageSchema);

// REGISTER — naya user banao
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Email pehle se hai?
  const existing = await User.findOne({ email });
  if (existing) return res.json({ error: 'Email already exists' });

  // Password hash karo
  const hashed = await bcrypt.hash(password, 10);

  // User save karo
  const user = new User({ name, email, password: hashed });
  await user.save();

  res.json({ success: true });
});

// LOGIN — user login karo
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // User dhundo
  const user = await User.findOne({ email });
  if (!user) return res.json({ error: 'User nahi mila!' });

  // Password check karo
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.json({ error: 'Password galat hai!' });

  // Token banao
  const token = jwt.sign({ id: user._id, name: user.name }, 'secret123');

  res.json({ token, name: user.name });
});

// GET messages
app.get('/messages', async (req, res) => {
  const messages = await Message.find();
  res.json(messages);
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Naya user connect hua!');

  socket.on('message', async (data) => {
    const message = new Message(data);
    await message.save();
    io.emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('User chala gaya!');
  });
});

server.listen(5000, () => {
  console.log('Server port 5000 pe chal raha hai');
});