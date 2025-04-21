// pages/Chat.jsx
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import ChatScreen from '../components/ChatScreen';
import PreviousChats from '../components/PreviousChats';
import AddChat from '../components/AddChat';

function Chat() {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [previousChats, setPreviousChats] = useState([]);

  // Load saved user and initialize socket
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      setUser(userObj);
      const newSocket = io('http://localhost:5001');
      newSocket.emit('register', userObj.name);
      setSocket(newSocket);
    }
  }, []);

  // Fetch previous chats
  useEffect(() => {
    if (user) {
      axios
        .get(`http://localhost:5001/api/messages/latest-chats?name=${user.name}`)
        .then((res) => {
          setPreviousChats(res.data);
        })
        .catch((err) => {
          console.error('Error fetching previous chats:', err);
        });
    }
  }, [user]);

  const handleLogin = () => {
    if (!usernameInput.trim()) return;

    axios
      .post('http://localhost:5001/api/auth/login', { name: usernameInput })
      .then((res) => {
        const newSocket = io('http://localhost:5001');
        newSocket.emit('register', res.data.name);
        setSocket(newSocket);

        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        setUsernameInput('');
      });
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setUser(null);
    setSelectedUser(null);
    setPreviousChats([]);
    localStorage.removeItem('user');
  };

  const handleStartChat = (familyName) => {
    setSelectedUser(familyName.email);
    setFullName(familyName.fullName);
  };

  const handleBack = () => {
    setSelectedUser(null);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-100 h-screen overflow-y-auto">
      {/* Top Login Bar */}
      <div className="flex items-center justify-between mb-4">
        {user ? (
          <>
            <div className="text-sm font-semibold">Logged in as: {user.name}</div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white text-sm px-3 py-1 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </>
        ) : (
          <div className="flex w-full gap-2">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 px-3 py-1 border border-gray-300 rounded"
            />
            <button
              onClick={handleLogin}
              className="bg-blue-500 text-white text-sm px-4 py-1 rounded hover:bg-blue-600"
            >
              Login
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {user ? (
        !selectedUser ? (
          <>
            <PreviousChats chats={previousChats} onSelect={setSelectedUser} />
            <AddChat currentUser={user.name} onStartChat={handleStartChat} />
          </>
        ) : (
          <ChatScreen
            currentUser={user.name}
            targetUser={selectedUser}
            targetUserName={fullName}
            socket={socket}
            onBack={handleBack}
          />
        )
      ) : (
        <div className="text-center text-gray-600">Please login to continue</div>
      )}
    </div>
  );
}

export default Chat;
