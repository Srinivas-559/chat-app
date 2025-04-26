import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getSocket, disconnectSocket } from '../socket';
import ChatScreen from '../components/ChatScreen';
import PreviousChats from '../components/PreviousChats';
import AddChat from '../components/AddChat';

function Chat() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [previousChats, setPreviousChats] = useState([]);

  // Load saved user and initialize socket
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      setUser(userObj);
      
      // Initialize socket connection
      const socket = getSocket();
      socket.emit('register', userObj.name);
    }

    return () => {
      // Don't disconnect here - let individual components manage their listeners
    };
  }, []);

  // Fetch previous chats
  useEffect(() => {
    if (user) {
      axios.get(`http://localhost:5001/api/messages/latest-chats?name=${user.name}`)
        .then((res) => {
          setPreviousChats(res.data);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleLogin = async () => {
    if (!usernameInput.trim()) return;

    try {
      const res = await axios.post('http://localhost:5001/api/auth/login', { name: usernameInput });
      const socket = getSocket();
      socket.emit('register', res.data.name);

      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUsernameInput('');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
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
      {/* Login/Logout bar */}
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