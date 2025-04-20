const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Frontend URL
    methods: ['GET', 'POST'],
  }
});

app.use(cors());
app.use(express.json());

// MongoDB models
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  isOnline: { type: Boolean, default: false },
  lastSeen: Date,
}));

const Message = mongoose.model('Message', new mongoose.Schema({
  from: String,
  to: String,
  text: String,
}));

// Store online users in memory
const onlineUsers = new Map();

// Socket.IO Connection
io.on('connection', (socket) => {
  // Register user when they connect
  socket.on('register', async (name) => {
    onlineUsers.set(name, socket.id);
    io.emit('online-users', Array.from(onlineUsers.keys()));

    // Update user status to online in MongoDB
    await User.findOneAndUpdate(
      { name },
      { isOnline: true },
      { new: true }
    );
  });

  // Private message handling
  socket.on('private message', async (msg) => {
    await Message.create(msg);
    const toSocket = onlineUsers.get(msg.to);
    if (toSocket) {
      io.to(toSocket).emit('private message', msg);
    }
  });

  // Typing event handling
  socket.on('typing', ({ to, from }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { from });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', async () => {
    for (const [name, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(name);

        // Set user to offline and update last seen time
        await User.findOneAndUpdate(
          { name },
          { isOnline: false, lastSeen: new Date() }
        );

        break;
      }
    }

    io.emit('online-users', Array.from(onlineUsers.keys()));
  });
});

// Login & User management
app.post('/login', async (req, res) => {
  const { name } = req.body;
  let user = await User.findOne({ name });
  if (!user) {
    user = await User.create({ name });
  }
  res.json(user);
});

app.get('/users/:name', async (req, res) => {
  const users = await User.find({ name: { $ne: req.params.name } });
  res.json(users);
});

app.get('/messages', async (req, res) => {
  const { from, to } = req.query;
  const messages = await Message.find({
    $or: [
      { from, to },
      { from: to, to: from }
    ]
  });
  res.json(messages);
});

// Connect to MongoDB and start the server
mongoose.connect('mongodb://127.0.0.1:27017/chat-basic')
  .then(() => {
    console.log('DB connected');
    server.listen(5001, () => console.log('Server on 5001'));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
