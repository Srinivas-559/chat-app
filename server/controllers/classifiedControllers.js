const Classified = require('../models/Classified');

// Create Classified
exports.createClassified = async (req, res) => {
    try {
        const { title, description, category, price, postedBy, photos = [], expiryDate, isAd = false } = req.body;

        if (!title || !category || !postedBy?.username || !postedBy?.email || !expiryDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const classified = new Classified({
            title,
            description,
            category,
            price,
            postedBy,
            photos,
            expiryDate,
            isAd
        });

        await classified.save();

        res.status(201).json({ message: 'Classified created successfully', classified });
    } catch (error) {
        console.error('Error creating classified:', error);
        res.status(500).json({ message: 'Error creating classified', error: error.message });
    }
};

// Get Classifieds (with filter and search)
exports.getClassifieds = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 10 } = req.query;
        const query = {};

        if (category) {
            query.category = category;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' }; // case-insensitive search
        }

        // Only show non-expired classifieds
        query.expiryDate = { $gte: new Date() };

        const classifieds = await Classified.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((page - 1) * parseInt(limit))
            .exec();

        const count = await Classified.countDocuments(query);

        res.status(200).json({
            classifieds,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalClassifieds: count
        });
    } catch (error) {
        console.error('Error fetching classifieds:', error);
        res.status(500).json({ message: 'Error fetching classifieds', error: error.message });
    }
};

// View Single Classified
exports.getClassifiedById = async (req, res) => {
    try {
        const { id } = req.params;

        const classified = await Classified.findById(id);

        if (!classified) {
            return res.status(404).json({ message: 'Classified not found' });
        }

        res.status(200).json({ classified });
    } catch (error) {
        console.error('Error fetching classified:', error);
        res.status(500).json({ message: 'Error fetching classified', error: error.message });
    }
};
// Get classifieds posted by a specific user
exports.getClassifiedsByUser = async (req, res) => {
    try {
        const { email } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const query = { 'postedBy.email': email };

        const classifieds = await Classified.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((page - 1) * parseInt(limit))
            .exec();

        const count = await Classified.countDocuments(query);

        res.status(200).json({
            classifieds,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalClassifieds: count
        });
    } catch (error) {
        console.error('Error fetching classifieds by user:', error);
        res.status(500).json({ message: 'Error fetching classifieds by user', error: error.message });
    }
};
