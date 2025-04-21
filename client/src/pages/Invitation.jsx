import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const InvitationPage = () => {
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [socket, setSocket] = useState(null);
  const [formData, setFormData] = useState({
    receiverEmail: '',
    title: '',
    date: '',
    location: ''
  });
  const [sentInvitations, setSentInvitations] = useState([]);
    const [receivedInvitations, setReceivedInvitations] = useState([]);
    const [inputEmail, setInputEmail] = useState('');



  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5001');
    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  // Set up socket listeners when email changes
  useEffect(() => {
    if (!socket || !currentUserEmail) return;

    // Subscribe to invitation updates
    socket.emit('subscribe-invitations', currentUserEmail);

    // Listen for new invitations
    socket.on('new_invitation', (invitation) => {
      if (invitation.receiverEmail === currentUserEmail) {
        setReceivedInvitations(prev => [invitation, ...prev]);
      }
      // For sent invitations (if sender gets the same event)
      if (invitation.senderEmail === currentUserEmail) {
        setSentInvitations(prev => [invitation, ...prev]);
      }
    });
    socket.on('sent_invitation', (invitation) => {
      console.log(invitation);
      if (invitation.senderEmail === currentUserEmail) {
        setSentInvitations(prev => [invitation, ...prev]);
      }
    });
    

    // Listen for invitation responses
    socket.on('invitation_response', (updatedInvitation) => {
      setSentInvitations(prev => prev.map(invite => 
        invite._id === updatedInvitation._id ? updatedInvitation : invite
      ));
    });

    // Fetch existing invitations
    const fetchInvitations = async () => {
      try {
        const [sentRes, receivedRes] = await Promise.all([
          axios.get(`http://localhost:5001/api/invitations/sent/${currentUserEmail}`),
          axios.get(`http://localhost:5001/api/invitations/received/${currentUserEmail}`)
        ]);
        setSentInvitations(sentRes.data);
        setReceivedInvitations(receivedRes.data);
      } catch (error) {
        console.error('Error fetching invitations:', error);
      }
    };

    fetchInvitations();

    return () => {
      socket.off('new_invitation');
      socket.off('sent_invitation')
      socket.off('invitation_response');
    };
  }, [socket, currentUserEmail]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendInvitation = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5001/api/invitations', {
        senderEmail: currentUserEmail,
        receiverEmail: formData.receiverEmail,
        eventData: {
          title: formData.title,
          date: formData.date,
          location: formData.location
        }
      });
      setFormData({
        receiverEmail: '',
        title: '',
        date: '',
        location: ''
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
    }
  };

  const respondToInvitation = async (id, response) => {
    try {
      // Send the response to the server
      await axios.put(`http://localhost:5001/api/invitations/${id}/respond`, { response });
  
      // Update the local state to reflect the response
      setReceivedInvitations(prev =>
        prev.map(invite =>
          invite._id === id ? { ...invite, status: response } : invite // Update the status, don't remove it
        )
      );
    } catch (error) {
      console.error('Error responding to invitation:', error);
    }
  };
  
  

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Invitation Manager</h1>
      
      {/* Email Input */}
      <div className="mb-6">
  <label className="block text-sm font-medium mb-1">Your Email</label>
  <input
    type="email"
    value={inputEmail}
    onChange={(e) => setInputEmail(e.target.value)}
    className="w-full p-2 border rounded"
    placeholder="Enter your email to manage invitations"
  />
  <button
    onClick={() => setCurrentUserEmail(inputEmail)}
    className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
  >
    Confirm Email
  </button>
</div>


      {/* Invitation Form */}
      {currentUserEmail && (
        <div className="mb-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-3">Send New Invitation</h2>
          <form onSubmit={sendInvitation} className="space-y-3">
            <div>
              <input
                type="email"
                name="receiverEmail"
                value={formData.receiverEmail}
                onChange={handleFormChange}
                placeholder="Recipient's email"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                placeholder="Event title"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleFormChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                placeholder="Location (optional)"
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Send Invitation
            </button>
          </form>
        </div>
      )}

      {/* Sent and Received Invitations */}
      {currentUserEmail && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sent Invitations */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Sent Invitations</h2>
            {sentInvitations.length === 0 ? (
              <p className="text-gray-500">No invitations sent yet</p>
            ) : (
              <div className="space-y-3">
                {sentInvitations.map(invite => (
                  <div key={invite._id} className="border p-3 rounded">
                    <p className="font-medium">To: {invite.receiverEmail}</p>
                    <p>Event: {invite.eventData.title}</p>
                    <p>Date: {new Date(invite.eventData.date).toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-sm">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        invite.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invite.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Received Invitations */}
          <div className="border rounded-lg p-4">
  <h2 className="text-lg font-semibold mb-3">Received Invitations</h2>
  {receivedInvitations.length === 0 ? (
    <p className="text-gray-500">No pending invitations</p>
  ) : (
    <div className="space-y-3">
      {receivedInvitations.map(invite => (
        <div key={invite._id} className="border p-3 rounded">
          <p className="font-medium">From: {invite.senderEmail}</p>
          <p>Event: {invite.eventData.title}</p>
          <p>Date: {new Date(invite.eventData.date).toLocaleString()}</p>
          
          {invite.status === 'pending' ? (
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => respondToInvitation(invite._id, 'accepted')}
                className="bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600"
              >
                Accept
              </button>
              <button
                onClick={() => respondToInvitation(invite._id, 'rejected')}
                className="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="flex items-center mt-2">
              <span className="text-sm">Status:</span>
              <span className={`ml-2 px-2 py-1 text-xs rounded ${
                invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                invite.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invite.status}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>

        </div>
      )}
    </div>
  );
};

export default InvitationPage;