const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Escalation = require('./models/Escalation');

const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
app.use(cors());
app.use(express.json());

// API Routes
app.get('/health', (req, res) => res.send('OK'));
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

// Bulk create escalations
app.post('/api/escalations/bulk', async (req, res) => {
    try {
        const newEscalations = await Escalation.insertMany(req.body);
        res.status(201).json(newEscalations);
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

// Basic Health Check
app.get('/health', (req, res) => res.send('OK'));

// Standard Static serving (ROOT dist)
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Catch-all (MUST BE LAST)
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("SPA Error (v4.1.0):", err);
            res.status(404).send(`[Escalation Dashboard v4.1.0] Deployment Sync Error: Frontend files missing at ${indexPath}. Please ensure the build command succeeded.`);
        }
    });
});

// Database Connection & Server Start
const startServer = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Escalation Dashboard v4.1.0 - 3D PRO Live on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT} (Database Offline)`);
        });
    }
};

startServer();
