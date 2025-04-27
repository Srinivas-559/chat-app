import { useState } from 'react';
import { getSocket } from '../../socket';

export default function CreateEventForm({ user }) {
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [participants, setParticipants] = useState([]);
    const [newParticipant, setNewParticipant] = useState({
        email: '',
        username: ''
    });

    const addParticipant = () => {
        if (newParticipant.email && newParticipant.username) {
            setParticipants([...participants, newParticipant]);
            setNewParticipant({ email: '', username: '' });
        }
    };

    const removeParticipant = (index) => {
        const updatedParticipants = [...participants];
        updatedParticipants.splice(index, 1);
        setParticipants(updatedParticipants);
    };

    const createEvent = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: eventName, 
                    date: eventDate, 
                    location, 
                    description, 
                    organizerEmail: user.email,
                    participants
                }),
            });
            const data = await res.json();
            
            if (res.ok) {
            console.log("event created !")// Reset form
                setEventName('');
                setEventDate('');
                setLocation('');
                setDescription('');
                setParticipants([]);
            } else {
                throw new Error(data.message || 'Failed to create event');
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Create New Event</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Event Name</label>
                    <input
                        type="text"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                        type="datetime-local"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        rows={3}
                    />
                </div>

                <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Add Participants</h3>
                    
                    <div className="flex space-x-2 mb-2">
                        <input
                            type="email"
                            placeholder="Participant Email"
                            value={newParticipant.email}
                            onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})}
                            className="flex-1 border border-gray-300 rounded-md p-2"
                        />
                        <input
                            type="text"
                            placeholder="Participant Username"
                            value={newParticipant.username}
                            onChange={(e) => setNewParticipant({...newParticipant, username: e.target.value})}
                            className="flex-1 border border-gray-300 rounded-md p-2"
                        />
                        <button
                            onClick={addParticipant}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md"
                        >
                            Add
                        </button>
                    </div>

                    {participants.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {participants.map((participant, index) => (
                                <div key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                                    <span>
                                        {participant.username} ({participant.email})
                                    </span>
                                    <button
                                        onClick={() => removeParticipant(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={createEvent}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
                    disabled={!eventName || !eventDate}
                >
                    Create Event with Participants
                </button>
            </div>
        </div>
    );
}