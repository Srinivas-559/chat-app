import React, { useEffect, useState , useRef } from 'react';
import { getSocket } from '../socket'; // Import centralized socket

const PreviousChats = ({ chats, onSelect }) => {
    const [chatUsers, setChatUsers] = useState({});
    const [sortedChats, setSortedChats] = useState([]);
    const currentUser = JSON.parse(localStorage.getItem('user'))?.name;
    const socketRef = useRef(null);

    // Initialize socket and status listeners
    useEffect(() => {
        socketRef.current = getSocket();
        const socket = socketRef.current;

        // Register current user
        if (currentUser) {
            socket.emit('register', currentUser);
        }

        // Listen for user status updates
        const handleUserStatus = ({ name, isOnline }) => {
            setChatUsers(prev => ({
                ...prev,
                [name]: isOnline
            }));
        };

        // Listen for bulk status updates
        const handleAllStatuses = (statuses) => {
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

    // Sort chats and update statuses
    useEffect(() => {
        // Sort chats by timestamp
        const sorted = [...chats].sort((a, b) =>
            new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
        );
        setSortedChats(sorted);

        // Extract unique users
        const uniqueUsers = new Set();
        sorted.forEach(msg => {
            const otherUser = msg.from === currentUser ? msg.to : msg.from;
            uniqueUsers.add(otherUser);
        });

        // Request statuses for all unique users
        if (uniqueUsers.size > 0 && currentUser) {
            socketRef.current.emit('get-all-statuses', Array.from(uniqueUsers));
        }
    }, [chats, currentUser]);

    const getOtherUser = (msg) => {
        return msg.from === currentUser ? msg.to : msg.from;
    };

    const getUserStatus = (username) => {
        // Return undefined if status not loaded yet
        return chatUsers[username];
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
                            key={`${otherUser}-${msg._id}-${index}`}
                            className="bg-white p-3 rounded shadow mb-2 cursor-pointer hover:bg-gray-50 relative"
                            onClick={() => onSelect(otherUser)}
                        >
                            <div className="flex justify-between items-center">
                                <div className="font-medium flex items-center gap-2">
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            isOnline === undefined ? 'bg-gray-400' : 
                                            isOnline ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                        title={isOnline === undefined ? 'Status loading...' : 
                                               isOnline ? 'Online' : 'Offline'}
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