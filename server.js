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
app.use(express.json({ limit: '50mb' }));

// Log Capture Shim
const logs = [];
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => { logs.push(`[LOG] ${args.join(' ')}`); if (logs.length > 100) logs.shift(); originalLog(...args); };
console.error = (...args) => { logs.push(`[ERR] ${args.join(' ')}`); if (logs.length > 100) logs.shift(); originalError(...args); };

// API Routes
app.get('/health', (req, res) => res.send('OK'));
app.get('/api/info', (req, res) => res.json({ version: 'v4.3.0', limit: '50mb', db_status: mongoose.connection.readyState, time: new Date().toISOString() }));
app.get('/api/logs', (req, res) => res.send(logs.join('\n')));

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
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: "Database is currently offline. Please check your MONGO_URI configuration in Render." });
        }
        console.log(`📥 Received bulk import request: ${Array.isArray(req.body) ? req.body.length : 0} records`);
        const newEscalations = await Escalation.insertMany(req.body, { ordered: false });
        console.log(`✅ Bulk insertion complete: ${newEscalations.length} records saved`);
        res.status(201).json(newEscalations);
    } catch (err) {
        console.error("❌ Bulk insertion failed:", err.message);
        res.status(400).json({
            message: "Some records failed to import",
            error: err.message,
            count: err.writeErrors ? err.writeErrors.length : 'unknown'
        });
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
    const exists = require('fs').existsSync(indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error(`SPA Error (v4.3.0): File exists? ${exists}. Path: ${indexPath}`, err);
            res.status(404).send(`[Escalation Dashboard v4.3.0] Deployment Sync Error: Frontend files missing at ${indexPath}. Build check: ${exists}. Please ensure the build command succeeded.`);
        }
    });
});

// Database Connection & Server Start
const startServer = async () => {
    try {
        console.log('Connecting to MongoDB...');
        // Check for MONGO_URL (Render default) or MONGO_URI
        const uri = process.env.MONGO_URL || process.env.MONGO_URI;
        console.log("Checking Mongo URI:", uri ? "Defined (Hidden for safety)" : "UNDEFINED");

        if (!uri) {
            throw new Error("MONGO_URL and MONGO_URI are both undefined");
        }

        await mongoose.connect(uri);
        console.log('✅ MongoDB Connected');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Escalation Dashboard v4.3.0 - 3D PRO Live on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT} (v4.3.0 - DB Offline)`);
        });
    }
};

startServer();
