import React, { useEffect, useState } from 'react';
import AddChatModal from './AddChatModal';
import { useNavigate } from 'react-router-dom';

import io from 'socket.io-client';

const socket = io('http://localhost:5001');

function MainScreen({ user }) {
  const [chats, setChats] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [userStatuses, setUserStatuses] = useState({});
  const navigate = useNavigate();

  // Update messages and register user
  useEffect(() => {
    // Register current user
    if (user?.name) {
      socket.emit('register', user.name);
    }
    
    // Fetch messages
    fetch(`http://localhost:5001/api/messages?from=${user.name}`)
      .then(res => res.json())
      .then(data => {
        // Process messages to find last message with each user
        const chatMap = {};
        data.forEach(msg => {
          const other = msg.from === user.name ? msg.to : msg.from;
          if (!chatMap[other] || new Date(msg.createdAt) > new Date(chatMap[other].createdAt)) {
            chatMap[other] = msg;
          }
        });
        
        // Convert to array and sort by timestamp
        const chatArray = Object.values(chatMap).sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        setChats(chatArray);
        
        // Get status for all chat users
        const usernames = Object.keys(chatMap);
        if (usernames.length > 0) {
          socket.emit('get-all-statuses', usernames);
        }
      })
      .catch(err => {
        console.error('Failed to fetch messages:', err);
      });
  }, [user]);
  
  // Listen for status updates
  useEffect(() => {
    const handleStatusUpdate = ({ name, isOnline }) => {
      setUserStatuses(prev => ({
        ...prev,
        [name]: isOnline
      }));
    };
    
    const handleAllStatuses = (statuses) => {
      setUserStatuses(prev => ({
        ...prev,
        ...statuses
      }));
    };
    
    socket.on('user-status', handleStatusUpdate);
    socket.on('all-statuses', handleAllStatuses);
    
    return () => {
      socket.off('user-status', handleStatusUpdate);
      socket.off('all-statuses', handleAllStatuses);
    };
  }, []);
  
  const getOtherUser = (msg) => {
    return msg.from === user.name ? msg.to : msg.from;
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Chats</h1>
      {chats.length === 0 ? (
        <p className="text-gray-600">No chats yet. Start a new conversation!</p>
      ) : (
        chats.map((msg) => {
          const otherUser = getOtherUser(msg);
          const isOnline = !!userStatuses[otherUser];
          
          return (
            <div
              key={otherUser}
              className="bg-white rounded-lg shadow p-3 mb-2 flex justify-between items-center cursor-pointer"
              onClick={() => navigate(`/chat/${otherUser}`)}
            >
              <div className="flex items-center gap-3 flex-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}
                ></span>
                <div>
                  <div className="font-semibold">{otherUser}</div>
                  <div className="text-sm text-gray-500 truncate">{msg.text}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          );
        })
      )}
      <button
        className="mt-6 bg-blue-500 text-white py-2 px-4 rounded-full w-full"
        onClick={() => setShowModal(true)}
      >
        Add Chat
      </button>
      {showModal && <AddChatModal user={user} close={() => setShowModal(false)} />}
    </div>
  );
}

export default MainScreen;