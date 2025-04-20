const Message = require('../models/Message');
const User = require('../models/User');

exports.getMessages = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 50 } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from or to parameters' });
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const query = {
      $or: [
        { from, to },
        { from: to, to: from }
      ]
    };

    const totalCount = await Message.countDocuments(query);

    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limitNumber);

    // Mark messages as read (only if they are unread and sent *to* the current user)
    await Message.updateMany(
      { from: to, to: from, read: false },
      { $set: { read: true } }
    );

    res.json({
      totalCount,
      page: pageNumber,
      limit: limitNumber,
      messages: messages.reverse() // oldest first for UI
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getLatestChats = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Missing name parameter' });
    }

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ from: name }, { to: name }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ["$from", "$to"] },
              { from: "$from", to: "$to" },
              { from: "$to", to: "$from" }
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$to", name] },
                  { $eq: ["$read", false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$lastMessage",
              { unreadCount: "$unreadCount" }
            ]
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    res.json(messages);
  } catch (err) {
    console.error('Latest chats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

