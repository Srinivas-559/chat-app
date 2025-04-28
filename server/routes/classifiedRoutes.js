const express = require('express');
const router = express.Router();
const classifiedController = require('../controllers/classifiedControllers');

// Create a classified
router.post('/', classifiedController.createClassified);

// Get classifieds with filters
router.get('/', classifiedController.getClassifieds);

// Get single classified by ID
router.get('/:id', classifiedController.getClassifiedById);

// 👉 Get classifieds posted by a specific user
router.get('/user/:email', classifiedController.getClassifiedsByUser);

module.exports = router;
