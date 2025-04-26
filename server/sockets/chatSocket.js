const Message = require('../models/Message');
const User = require('../models/User');

module.exports = (socket) => {
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

  // Get all user statuses
  socket.on('get-all-statuses', async (usernames) => {
    try {
      if (Array.isArray(usernames) && usernames.length > 0) {
        const users = await User.find({ name: { $in: usernames } });
        
        const statuses = {};
        users.forEach(user => {
          statuses[user.name] = user.isOnline;
        });
        
        socket.emit('all-statuses', statuses);
      }
    } catch (err) {
      console.error('Get all statuses error:', err);
      socket.emit('error', { message: 'Failed to fetch user statuses' });
    }
  });

  // Private message
  socket.on('private-message', async ({ from, to, text }) => {
    try {
      const message = await Message.create({ from, to, text });
      socket.emit('message-sent', message);
      
      const recipient = await User.findOne({ name: to });
      if (recipient?.socketId) {
        socket.server.to(recipient.socketId).emit('private-message', message);
      }
    } catch (err) {
      console.error('Private message error:', err);
      socket.emit('message-error', { text });
    }
  });

  // Typing
  socket.on('typing', async ({ from, to }) => {
    const recipient = await User.findOne({ name: to });
    if (recipient?.isOnline && recipient?.socketId) {
      socket.server.to(recipient.socketId).emit('typing', { from });
    }
  });

  // Mark read
  socket.on('mark-read', async ({ from, to }) => {
    try {
      const result = await Message.updateMany(
        { from: to, to: from, read: false },
        { $set: { read: true } }
      );
  
      if (result.modifiedCount > 0) {
        const updatedMessages = await Message.find({
          from: to,
          to: from,
          read: true
        }).sort({ createdAt: -1 }).limit(1);
  
        socket.server.to(from).emit('messages-read', { 
          from: to,
          messages: updatedMessages 
        });
        
        socket.server.to(to).emit('messages-read-confirm', {
          to: from,
          messages: updatedMessages
        });
      }
    } catch (err) {
      console.error('Mark read error:', err);
    }
  });
};