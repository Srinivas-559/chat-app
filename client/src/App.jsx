// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Chat from './pages/chat';
import InvitationPage from './pages/Invitation';
import Events from './pages/Events';

// import About from './pages/About'; // optional example

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/invi" element={<InvitationPage />} />
        <Route path="/events" element={<Events />  } />
      </Routes>
    </Router>
  );
}

export default App;
