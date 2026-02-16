const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Escalation = require('./models/Escalation');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));


// Routes
// Get all escalations
app.get('/api/escalations', async (req, res) => {
    try {
        const escalations = await Escalation.find().sort({ createdAt: -1 });
        res.status(200).json(escalations);
    } catch (err) {
        console.error("Error fetching escalations:", err);
        res.status(500).json({ message: err.message });
    }
});

// Create a new escalation
app.post('/api/escalations', async (req, res) => {
    const escalation = new Escalation(req.body);
    try {
        const newEscalation = await escalation.save();
        res.status(201).json(newEscalation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update an escalation
app.put('/api/escalations/:id', async (req, res) => {
    try {
        const updatedEscalation = await Escalation.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedEscalation) return res.status(404).json({ message: 'Escalation not found' });
        res.json(updatedEscalation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete an escalation
app.delete('/api/escalations/:id', async (req, res) => {
    try {
        if (req.params.id === 'all') {
            await Escalation.deleteMany({});
            return res.json({ message: 'All escalations deleted' });
        }
        await Escalation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Escalation deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Database Connection & Server Start
const startServer = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('Please ensure your IP is whitelisted in MongoDB Atlas (0.0.0.0/0 for Render).');
        // Still listen so Render doesn't fail the port check, but log the error
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT} (Wait: MongoDB not connected)`);
        });
    }
};

startServer();
