const Event = require('../models/Event');
const EventUser = require('../models/EventUser');

// Create Event with Participants
exports.createEvent = async (req, res) => {
    try {
        const { name, date, location, description, organizerEmail, participants = [] } = req.body;
        
        // Validate required fields
        if (!name || !date || !organizerEmail) {
            return res.status(400).json({ 
                message: 'Name, date, and organizer email are required' 
            });
        }

        // Create the event
        const event = new Event({ 
            name, 
            date: new Date(date),
            location, 
            description, 
            organizerEmail 
        });

        await event.save();

        const io = req.app.get('io');
        const allParticipants = [...participants, { email: organizerEmail, username: req.user?.username || 'Organizer' }];

        // Add all participants (including organizer) directly as joined
        const participantPromises = allParticipants.map(participant => 
            EventUser.create({
                eventId: event._id,
                email: participant.email,
                username: participant.username,
                status: 'joined',
                joinedAt: new Date()
            }).then(eventUser => {
                // Notify each participant that they've been added to the event
                io.to(participant.email).emit('event-joined', {
                    eventId: event._id,
                    eventName: event.name,
                    eventDate: event.date,
                    eventLocation: event.location
                });
                return eventUser;
            })
        );

        await Promise.all(participantPromises);

        // Notify all clients about the new event
        io.emit('event-created', event);

        res.status(201).json({ 
            message: 'Event created with all participants joined', 
            event,
            participantCount: allParticipants.length
        });
    } catch (error) {
        console.error('Error creating event:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'One or more participants are already in this event'
            });
        }
        
        res.status(500).json({ 
            message: 'Error creating event', 
            error: error.message 
        });
    }
};

// Join Event
// exports.joinEvent = async (req, res) => {
//   try {
//     const { eventId, email } = req.body;

//     const existing = await EventUser.findOne({ eventId, email });
//     if (existing) {
//       return res.status(400).json({ message: 'Already joined this event' });
//     }

//     const participation = new EventUser({ eventId, email });
//     await participation.save();
//     res.status(201).json({ message: 'Joined event successfully', participation });
//   } catch (error) {
//     res.status(500).json({ message: 'Error joining event', error });
//   }
// };

// Get Participated Events
exports.getParticipatedEvents = async (req, res) => {
  try {
    const { email } = req.params;
    const participations = await EventUser.find({ email }).populate('eventId');
    res.json(participations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching participated events', error });
  }
};
// Enhanced Get Organized Events with filtering
exports.getOrganizedEvents = async (req, res) => {
    try {
        const { email } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        // Build query
        const query = { organizerEmail: email };
        
        // Add status filter if provided
        if (status === 'active') {
            query.date = { $gte: new Date() };
        } else if (status === 'past') {
            query.date = { $lt: new Date() };
        }

        // Execute query with pagination
        const events = await Event.find(query)
            .sort({ date: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        // Get total count for pagination info
        const count = await Event.countDocuments(query);

        res.status(200).json({
            events,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalEvents: count
        });
    } catch (error) {
        console.error('Error fetching organized events:', error);
        res.status(500).json({ 
            message: 'Error fetching organized events', 
            error: error.message 
        });
    }
};