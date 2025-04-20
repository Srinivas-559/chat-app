const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Get user statuses
  socket.on('get-user-statuses', async (usernames) => {
    try {
      if (Array.isArray(usernames)) {
        const users = await User.find({ name: { $in: usernames } });
        
        const statuses = {};
        users.forEach(user => {
          statuses[user.name] = {
            isOnline: user.isOnline,
            lastSeen: user.lastSeen
          };
        });
        
        socket.emit('user-statuses', statuses);
      }
    } catch (err) {
      console.error('Get user statuses error:', err);
      socket.emit('error', { message: 'Failed to fetch user statuses' });
    }
  });

  // Get all user statuses at once
  socket.on('get-all-statuses', async (usernames) => {
    try {
      if (Array.isArray(usernames) && usernames.length > 0) {
        const users = await User.find({ name: { $in: usernames } });
        
        // Create a status object with usernames as keys
        const statuses = {};
        users.forEach(user => {
          statuses[user.name] = user.isOnline;
        });
        
        // Send back to requesting client
        socket.emit('all-statuses', statuses);
      }
    } catch (err) {
      console.error('Get all statuses error:', err);
      socket.emit('error', { message: 'Failed to fetch user statuses' });
    }
  });

  // Register user
  // Register user
socket.on('register', async (name) => {
    try {
      const user = await User.findOneAndUpdate(
        { name },
        {
          socketId: socket.id,
          isOnline: true,
          lastSeen: new Date()
        },
        { new: true, upsert: true }
      );
  
      if (user) {
        socket.join(name);
        console.log(`✅ User connected: ${user.name} (${socket.id})`); // 👈 Log user name
  
        io.emit('user-status', {
          name,
          isOnline: true,
          lastSeen: user.lastSeen
        });
      }
    } catch (err) {
      console.error('Register error:', err);
      socket.emit('error', { message: 'Server error' });
    }
  });
  

  // Private message
//   socket.on('private-message', async ({ from, to, text }) => {
//     try {
//       const message = await Message.create({ from, to, text });
//       socket.emit('private-message', message);

//       const recipient = await User.findOne({ name: to });
//       if (recipient?.isOnline && recipient?.socketId) {
//         io.to(recipient.socketId).emit('private-message', message);
//       }
//     } catch (err) {
//       console.error('Private message error:', err);
//       socket.emit('error', { message: 'Failed to send message' });
//     }
//   });

  // Typing
  socket.on('typing', async ({ from, to }) => {
    const recipient = await User.findOne({ name: to });
    if (recipient?.isOnline && recipient?.socketId) {
      io.to(recipient.socketId).emit('typing', { from });
    }
  });

  // Mark read
  // Update the mark-read handler
socket.on('mark-read', async ({ from, to }) => {
    try {
      // Update all unread messages
      const result = await Message.updateMany(
        { from: to, to: from, read: false },
        { $set: { read: true } }
      );
  
      if (result.modifiedCount > 0) {
        // Get the updated messages
        const updatedMessages = await Message.find({
          from: to,
          to: from,
          read: true
        }).sort({ createdAt: -1 }).limit(1);
  
        // Notify both users about the read status
        io.to(from).emit('messages-read', { 
          from: to,
          messages: updatedMessages 
        });
        
        // Also notify the sender that their messages were read
        io.to(to).emit('messages-read-confirm', {
          to: from,
          messages: updatedMessages
        });
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  });
  
  // Update private message handler to include read status
  // Update the private-message handler
socket.on('private-message', async ({ from, to, text }) => {
    try {
      // Create and save the message
      const message = await Message.create({ from, to, text });
      
      // 1. Send confirmation to sender with full message data
      socket.emit('message-sent', message);
      
      // 2. Send to recipient if online
      const recipient = await User.findOne({ name: to });
      if (recipient?.socketId) {
        io.to(recipient.socketId).emit('private-message', message);
      }
    } catch (err) {
      console.error('Private message error:', err);
      // 3. Notify sender of failure
      socket.emit('message-error', { text });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    try {
      const user = await User.findOneAndUpdate(
        { socketId: socket.id },
        {
          socketId: null,
          isOnline: false,
          lastSeen: new Date()
        },
        { new: true }
      );

      if (user) {
        io.emit('user-status', {
          name: user.name,
          isOnline: false,
          lastSeen: new Date()
        });
        console.log(`User ${user.name} disconnected`);
      } else {
        console.log("Unknown user disconnected");
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chat-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));