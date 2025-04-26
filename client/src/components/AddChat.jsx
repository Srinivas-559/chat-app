import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Ensure socket is initialized only once
let socket;
if (!socket) {
  socket = io('http://localhost:5001');
}

const AddChat = ({ currentUser, onStartChat }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [memberStatus, setMemberStatus] = useState({});

  useEffect(() => {
    // Fetch users from API
    fetch('http://localhost:5001/api/users')
      .then(res => res.json())
      .then(data => {
        // Filter out the current user from the family members list
        const filteredMembers = [
          ...data.family,
          ...data.relatives,
          ...data.friends
        ].filter(user => user.email !== currentUser);

        setFamilyMembers(filteredMembers);

        // Get online status for all users
        if (filteredMembers.length > 0) {
          socket.emit('get-all-statuses', filteredMembers.map(user => user.email));
        }
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        // Fallback to dummy data if API fails
        const dummyFamilyMembers = [
          { email: 'a@example.com', fullName: 'Family Member a', relation: 'Father', profileImage: '' },
          { email: 'b@example.com', fullName: 'Family Member b', relation: 'Father', profileImage: '' },
          { email: 'c@example.com', fullName: 'Family Member c', relation: 'Father', profileImage: '' },
          { email: 'd@example.com', fullName: 'Family Member d', relation: 'Father', profileImage: '' },
          { email: 'e@example.com', fullName: 'Family Member e', relation: 'Father', profileImage: '' },
          { email: 'f@example.com', fullName: 'Family Member f', relation: 'Mother', profileImage: '' }
        ];
        setFamilyMembers(dummyFamilyMembers);
      });
  }, [currentUser]);

  useEffect(() => {
    const handleStatusUpdate = ({ name, isOnline }) => {
      setMemberStatus(prev => ({ ...prev, [name]: isOnline }));
    };

    const handleAllStatuses = (statuses) => {
      setMemberStatus(prev => ({ ...prev, ...statuses }));
    };

    socket.on('user-status', handleStatusUpdate);
    socket.on('all-statuses', handleAllStatuses);

    return () => {
      socket.off('user-status', handleStatusUpdate);
      socket.off('all-statuses', handleAllStatuses);
    };
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Add Chat</h2>
      {familyMembers.map((member, idx) => (
        <div key={idx} className="bg-white p-3 rounded shadow mb-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Profile Image or Placeholder */}
            <img
              src={member.profileImage || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnxq8kZJXUUzVQRSX70Zx-V54xP6eps-TXqrOtSLB9QBj6F5Ffzahl-BxMnf1sVORVRiI&usqp=CAU'}
              alt={member.fullName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <span className="font-semibold">{member.fullName}</span>
              <p className="text-sm text-gray-500">{member.relation}</p>
            </div>
            <span
              className={`w-2 h-2 rounded-full ml-auto ${memberStatus[member.email] ? 'bg-green-500' : 'bg-red-500'}`}
            ></span>
          </div>
          <button
            onClick={() => onStartChat(member)}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
          >
            Start Chat
          </button>
        </div>
      ))}
    </div>
  );
};

export default AddChat;
