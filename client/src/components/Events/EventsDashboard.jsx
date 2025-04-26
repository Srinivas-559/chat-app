import { useState, useEffect } from 'react';
import { getSocket } from '../../socket';

export default function EventsDashboard({ user }) {
    const [joinedEvents, setJoinedEvents] = useState([]);
    const [organizedEvents, setOrganizedEvents] = useState([]);
    const [loading, setLoading] = useState({
        joined: false,
        organized: false
    });
    const [error, setError] = useState(null);
    const socket = getSocket();

    useEffect(() => {
        fetchAllEvents();
        setupSocketListeners();

        return () => {
            socket.off('event-joined');
            socket.off('event-created');
            socket.off('event-updated');
        };
    }, [user]);

    const fetchAllEvents = async () => {
        try {
            setLoading(prev => ({ ...prev, joined: true, organized: true }));
            await Promise.all([fetchJoinedEvents(), fetchOrganizedEvents()]);
        } catch (err) {
            setError('Failed to load events. Please try again.');
        } finally {
            setLoading(prev => ({ ...prev, joined: false, organized: false }));
        }
    };

    const fetchJoinedEvents = async () => {
        try {
            const res = await fetch(`http://localhost:5001/api/events/participated/${user.email}`);
            if (!res.ok) throw new Error('Failed to fetch joined events');
            const data = await res.json();
            setJoinedEvents(Array.isArray(data) ? data : data.events || []);
        } catch (err) {
            console.error('Error fetching joined events:', err);
            setError('Failed to load joined events');
        }
    };

    const fetchOrganizedEvents = async () => {
        try {
            const res = await fetch(`http://localhost:5001/api/events/organized/${user.email}`);
            if (!res.ok) throw new Error('Failed to fetch organized events');
            const data = await res.json();
            setOrganizedEvents(Array.isArray(data) ? data : data.events || []);
        } catch (err) {
            console.error('Error fetching organized events:', err);
            setError('Failed to load organized events');
        }
    };

    const setupSocketListeners = () => {
        const handleEventJoined = (eventData) => {
            // Check if event already exists to avoid
            fetchAllEvents();
            setJoinedEvents(prev => {
                const exists = prev.some(item => 
                    item.eventId?._id === eventData.eventId || 
                    item._id === eventData.eventId
                );
                if (exists) return prev;

                return [
                    { 
                        eventId: {
                            _id: eventData.eventId,
                            name: eventData.eventName,
                            date: eventData.eventDate,
                            location: eventData.eventLocation,
                            organizerEmail: eventData.organizerEmail || user.email,
                            description: eventData.description || ''
                        },
                        status: 'joined' 
                    },
                    ...prev
                ];
            });
        };

        const handleEventCreated = (newEvent) => {
            if (newEvent.organizerEmail === user.email) {
                setOrganizedEvents(prev => {
                    const exists = prev.some(event => event._id === newEvent._id);
                    return exists ? prev : [newEvent, ...prev];
                });
            }
        };

        const handleEventUpdated = (updatedEvent) => {
            setOrganizedEvents(prev => 
                prev.map(event => 
                    event._id === updatedEvent._id ? updatedEvent : event
                )
            );
            setJoinedEvents(prev => 
                prev.map(item => 
                    item.eventId?._id === updatedEvent._id ? 
                    { ...item, eventId: updatedEvent } : item
                )
            );
        };

        socket.on('event-joined', handleEventJoined);
        socket.on('event-created', handleEventCreated);
        socket.on('event-updated', handleEventUpdated);

        // Join user's personal room for targeted updates
        socket.emit('join-user-room', user.email);
    };

    const renderEventCard = (event) => {
        if (!event) return null;
        
        const eventDate = new Date(event.date);
        const isExpired = eventDate < new Date();
        const isOrganizer = event.organizerEmail === user.email;
        const formattedDate = eventDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return (
            <div key={event._id} className="border p-4 mb-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className="text-lg font-bold">{event.name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                                isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                                {isExpired ? 'Past Event' : 'Upcoming'}
                            </span>
                        </div>
                        {event.description && (
                            <p className="text-gray-600 mt-1">{event.description}</p>
                        )}
                        <div className="mt-2 space-y-1">
                            {event.location && (
                                <p className="text-sm text-gray-500">
                                    <i className="fas fa-map-marker-alt mr-2 text-blue-400"></i>
                                    {event.location}
                                </p>
                            )}
                            <p className="text-sm text-gray-500">
                                <i className="far fa-calendar-alt mr-2 text-blue-400"></i>
                                {formattedDate}
                            </p>
                        </div>
                    </div>
                </div>
                {isOrganizer && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <i className="fas fa-crown mr-1"></i> Organizer
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Event Dashboard</h2>
                <button 
                    onClick={fetchAllEvents}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                >
                    <i className="fas fa-sync-alt mr-1"></i> Refresh
                </button>
            </div>
            
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
                    <div className="flex justify-between items-start">
                        <p>{error}</p>
                        <button 
                            onClick={() => setError(null)} 
                            className="ml-4 text-sm text-red-600 hover:text-red-800"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <i className="fas fa-calendar-check mr-2 text-blue-500"></i>
                        Joined Events
                        {loading.joined && (
                            <span className="ml-2 text-sm text-gray-500">Loading...</span>
                        )}
                    </h3>
                    
                    {joinedEvents.length > 0 ? (
                        joinedEvents.map(item => renderEventCard(item.eventId || item))
                    ) : (
                        <div className="text-center text-gray-500 py-4">
                            {loading.joined ? (
                                <span>Loading events...</span>
                            ) : (
                                <div>
                                    <i className="far fa-calendar-plus text-3xl mb-2 text-gray-300"></i>
                                    <p>No events joined yet</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <i className="fas fa-user-cog mr-2 text-purple-500"></i>
                        Organized Events
                        {loading.organized && (
                            <span className="ml-2 text-sm text-gray-500">Loading...</span>
                        )}
                    </h3>
                    
                    {organizedEvents.length > 0 ? (
                        organizedEvents.map(event => renderEventCard(event))
                    ) : (
                        <div className="text-center text-gray-500 py-4">
                            {loading.organized ? (
                                <span>Loading events...</span>
                            ) : (
                                <div>
                                    <i className="far fa-calendar-plus text-3xl mb-2 text-gray-300"></i>
                                    <p>No events organized yet</p>
                                    <p className="text-sm mt-1">Create your first event to get started</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}