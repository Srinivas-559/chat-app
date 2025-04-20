import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

const ChatScreen = ({ currentUser, targetUser, targetUserName, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const messagesEndRef = useRef();
  const typingTimeoutRef = useRef(null);

  // Message handler with deduplication
  const handleIncomingMessage = useCallback((msg) => {
    setMessages(prev => {
      // Check if message already exists
      const exists = prev.some(m => m._id === msg._id);
      if (exists) return prev;
      
      return [...prev, {
        ...msg,
        // Mark as read if it's our own message
        read: msg.from === currentUser ? true : msg.read
      }];
    });

    // If message is from the other user, mark as read
    if (msg.from === targetUser) {
      socket.emit('mark-read', { from: currentUser, to: targetUser });
    }
  }, [currentUser, targetUser]);

  // Handle read receipts
  const handleMessagesRead = useCallback(({ messages: readMessages }) => {
    setMessages(prev => prev.map(msg => {
      if (readMessages.some(m => m._id === msg._id)) {
        return { ...msg, read: true };
      }
      return msg;
    }));
  }, []);

  useEffect(() => {
    // Fetch initial messages
    axios.get(`http://localhost:5001/api/messages?from=${currentUser}&to=${targetUser}`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data.messages || [];
        setMessages(data.map(msg => ({
          ...msg,
          read: msg.from === currentUser ? true : msg.read
        })));
        
        // Mark messages as read when opening chat
        socket.emit('mark-read', { from: currentUser, to: targetUser });
      })
      .catch(err => {
        console.error('Failed to fetch messages:', err);
        setMessages([]);
      });

    // Get initial online status
    socket.emit('get-user-status', targetUser);
  }, [currentUser, targetUser]);

  useEffect(() => {
    // Register current user
    socket.emit('register', currentUser);

    // Socket event listeners
    socket.on('private-message', handleIncomingMessage);
    socket.on('messages-read', handleMessagesRead);
    
    // Typing indicator
    const handleTyping = ({ from }) => {
      if (from === targetUser) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    };
    socket.on('typing', handleTyping);

    // Online status updates
    const handleStatusUpdate = ({ name, isOnline }) => {
      if (name === targetUser) {
        setIsUserOnline(isOnline);
      }
    };
    socket.on('user-status', handleStatusUpdate);

    return () => {
      socket.off('private-message', handleIncomingMessage);
      socket.off('messages-read', handleMessagesRead);
      socket.off('typing', handleTyping);
      socket.off('user-status', handleStatusUpdate);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUser, targetUser, handleIncomingMessage, handleMessagesRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    
    try {
      const messageText = text;
      setText(''); // Clear input immediately
      
      // Optimistic update
      const tempId = Date.now().toString();
      setMessages(prev => [...prev, {
        _id: tempId,
        from: currentUser,
        to: targetUser,
        text: messageText,
        read: false,
        createdAt: new Date()
      }]);

      // Send via socket
      socket.emit('private-message', {
        from: currentUser,
        to: targetUser,
        text: messageText
      });
    } catch (err) {
      console.error('Send message error:', err);
      // Restore text if failed
      setText(messageText);
    }
  };

  const handleTypingInput = () => {
    socket.emit('typing', { from: currentUser, to: targetUser });
  };

  const renderMessageStatus = (msg) => {
    if (msg.from !== currentUser) return null;
    
    return (
      <span className="ml-1">
        {msg.read ? (
          <span className="text-blue-500">✓✓</span> // Double tick for read
        ) : (
          <span className="text-gray-400">✓</span> // Single tick for sent
        )}
      </span>
    );
  };

  return (
    <div className="bg-white h-full p-4 rounded shadow flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <button className="text-sm text-blue-500" onClick={onBack}>← Back</button>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isUserOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          ></span>
          <h2 className="text-lg font-semibold">{targetUserName}</h2>
        </div>
      </div>

      {isTyping && (
        <div className="text-sm text-gray-500 italic mb-2">
          {targetUserName} is typing...
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((msg) => (
          <div
            key={msg._id || msg.createdAt} // Fallback to timestamp if no ID
            className={`mb-2 ${msg.from === currentUser ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block px-3 py-2 rounded ${
                msg.from === currentUser ? 'bg-blue-100' : 'bg-gray-200'
              }`}
            >
              {msg.text}
              <div className="text-[10px] text-gray-500 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {renderMessageStatus(msg)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 p-2 border rounded"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTypingInput();
          }}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 rounded"
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;