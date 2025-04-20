import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

// Create socket connection outside the component to prevent multiple connections
let socket;
if (!socket) {
  socket = io('http://localhost:5001');
}

const PreviousChats = ({ chats, onSelect }) => {
    const [chatUsers, setChatUsers] = useState({});
    const [sortedChats, setSortedChats] = useState([]);
    const currentUser = JSON.parse(localStorage.getItem('user'))?.name;

    useEffect(() => {
        // Sort chats by timestamp
        setSortedChats([...chats].sort((a, b) =>
            new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
        ));
        
        // Extract unique usernames from chats
        if (chats.length > 0) {
            const uniqueUsers = new Set();
            chats.forEach(msg => {
                const otherUser = msg.from === currentUser ? msg.to : msg.from;
                uniqueUsers.add(otherUser);
            });
            
            // Request status for all users we're chatting with
            if (uniqueUsers.size > 0) {
                socket.emit('get-all-statuses', Array.from(uniqueUsers));
            }
        }
    }, [chats, currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        
        // Register the current user when component mounts
        socket.emit('register', currentUser);
        
        // Listen for user status updates
        const handleUserStatus = ({ name, isOnline }) => {
            console.log('User status update:', name, isOnline);
            setChatUsers(prev => ({
                ...prev,
                [name]: isOnline
            }));
        };
        
        // Listen for bulk status updates
        const handleAllStatuses = (statuses) => {
            console.log('All statuses received:', statuses);
            setChatUsers(prev => ({
                ...prev,
                ...statuses
            }));
        };
        
        socket.on('user-status', handleUserStatus);
        socket.on('all-statuses', handleAllStatuses);
        
        return () => {
            socket.off('user-status', handleUserStatus);
            socket.off('all-statuses', handleAllStatuses);
        };
    }, [currentUser]);

    const getOtherUser = (msg) => {
        return msg.from === currentUser ? msg.to : msg.from;
    };

    const getUserStatus = (username) => {
        return !!chatUsers[username]; // Convert to boolean
    };

    return (
        <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Previous Chats</h2>
            {sortedChats.length === 0 ? (
                <p className="text-gray-600">No chats yet.</p>
            ) : (
                sortedChats.map((msg, index) => {
                    const otherUser = getOtherUser(msg);
                    const isOnline = getUserStatus(otherUser);

                    return (
                        <div
                            key={`${otherUser}-${index}`}
                            className="bg-white p-3 rounded shadow mb-2 cursor-pointer hover:bg-gray-50 relative"
                            onClick={() => onSelect(otherUser)}
                        >
                            <div className="flex justify-between items-center">
                                <div className="font-medium flex items-center gap-2">
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            isOnline ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                    ></span>
                                    {otherUser}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                                {msg.text}
                            </div>
                            {msg.unreadCount > 0 && (
                                <div className="absolute right-3 top-3 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {msg.unreadCount}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default PreviousChats;