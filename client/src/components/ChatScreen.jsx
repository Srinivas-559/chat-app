import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { getSocket } from '../socket';

const ChatScreen = ({ currentUser, targetUser, targetUserName, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const messagesEndRef = useRef();
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize socket and listeners
  useEffect(() => {
    socketRef.current = getSocket();
    const socket = socketRef.current;

    // Register current user
    socket.emit('register', currentUser);

    // Get initial online status
    socket.emit('get-user-status', targetUser);

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5001/api/messages?from=${currentUser}&to=${targetUser}`
        );
        const data = Array.isArray(res.data) ? res.data : res.data.messages || [];
        
        setMessages(data.map(msg => ({
          ...msg,
          read: msg.from === currentUser ? true : msg.read
        })));
        
        // Mark messages as read when opening chat
        socket.emit('mark-read', { from: currentUser, to: targetUser });
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setMessages([]);
      }
    };

    fetchMessages();

    return () => {
      // Clean up typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUser, targetUser]);

  // Message handler with robust deduplication
  const handleIncomingMessage = useCallback((msg) => {
    setMessages(prev => {
      // Check if message already exists using multiple criteria
      const exists = prev.some(m => 
        m._id === msg._id || 
        (m.text === msg.text && 
         m.from === msg.from && 
         Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 1000)
      );
      
      if (exists) return prev;
      
      return [...prev, {
        ...msg,
        read: msg.from === currentUser ? true : msg.read
      }];
    });

    // If message is from the other user, mark as read
    if (msg.from === targetUser) {
      socketRef.current.emit('mark-read', { from: currentUser, to: targetUser });
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

  // Setup socket listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

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
    };
  }, [targetUser, handleIncomingMessage, handleMessagesRead]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    
    const messageText = text;
    setText('');
    
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
    socketRef.current.emit('private-message', {
      from: currentUser,
      to: targetUser,
      text: messageText
    });
  };

  const handleTypingInput = () => {
    socketRef.current.emit('typing', { from: currentUser, to: targetUser });
  };

  const renderMessageStatus = (msg) => {
    if (msg.from !== currentUser) return null;
    
    return (
      <span className="ml-1">
        {msg.read ? (
          <span className="text-blue-500">✓✓</span>
        ) : (
          <span className="text-gray-400">✓</span>
        )}
      </span>
    );
  };

  return (
    <div className="bg-white h-full p-4 rounded shadow flex flex-col">
      {/* Header with back button and user info */}
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

      {/* Typing indicator */}
      {isTyping && (
        <div className="text-sm text-gray-500 italic mb-2">
          {targetUserName} is typing...
        </div>
      )}

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map((msg) => (
          <div
            key={msg._id || msg.createdAt}
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

      {/* Message input */}
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