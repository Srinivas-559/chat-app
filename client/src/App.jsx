import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5001');

function App() {
  const [name, setName] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingStatus, setTypingStatus] = useState('');
  const handleTyping = () => {
    if (selectedUser) {
      socket.emit('typing', {
        from: name,
        to: selectedUser.name,
      });
    }
  };
  

  useEffect(() => {
    const savedUser = localStorage.getItem('chat-user');
    if (savedUser) {
      setName(savedUser);
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (name) {
      socket.emit('register', name);
      axios.get(`http://localhost:5001/users/${name}`).then(res => setUsers(res.data));
    }
  }, [name]);

  useEffect(() => {
    socket.on('private message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('online-users', (list) => {
      setOnlineUsers(list);
    });
    socket.on('typing', ({ from }) => {
      setTypingStatus(`${from} is typing...`);
    
      // Clear after 2 seconds
      setTimeout(() => setTypingStatus(''), 2000);
    });
    

    return () => {
      socket.off('private message');
      socket.off('online-users');
    };
  }, []);

  const login = async () => {
    const res = await axios.post('http://localhost:5001/login', { name });
    localStorage.setItem('chat-user', res.data.name);
    setLoggedIn(true);
  };

  const openChat = async (user) => {
    setSelectedUser(user);
    const res = await axios.get(`http://localhost:5001/messages?from=${name}&to=${user.name}`);
    setMessages(res.data);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (text.trim() && selectedUser) {
      const msg = { from: name, to: selectedUser.name, text };
      socket.emit('private message', msg);
      setMessages(prev => [...prev, msg]);
      setText('');
    }
  };

  const logout = () => {
    localStorage.removeItem('chat-user');
    window.location.reload();
  };

  const exitChat = () => {
    setSelectedUser(null);
    setMessages([]);
  };

  const isUserOnline = (username) => onlineUsers.includes(username);

  if (!loggedIn) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Enter your name</h2>
        <input value={name} onChange={e => setName(e.target.value)} />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Welcome {name}</h2>
        <button onClick={logout}>Logout</button>
        <h3>Select a user to chat with:</h3>
        {users.map(u => (
          <div
            key={u._id}
            onClick={() => openChat(u)}
            style={{
              cursor: 'pointer',
              margin: '10px 0',
              borderBottom: '1px solid #ccc',
              padding: '5px 0',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: isUserOnline(u.name) ? 'green' : 'gray',
                marginRight: 10
              }}
            ></span>
            {u.name}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat with {selectedUser.name}</h2>
      <button onClick={logout}>Logout</button>
      <button onClick={exitChat} style={{ marginLeft: 10 }}>Exit Chat</button>
      <div style={{ height: 300, overflowY: 'auto', border: '1px solid #ccc', marginBottom: 10, padding: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.from === name ? 'right' : 'left' }}>
            <b>{m.from}:</b> {m.text}
          </div>
        ))}
      </div>
      {typingStatus && (
  <div style={{ fontStyle: 'italic', color: 'gray', marginTop: 5 }}>
    {typingStatus}
  </div>
)}

      <form onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          style={{ width: '80%', marginRight: 10 }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
