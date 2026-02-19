const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
    date: { type: String, required: true },
    id: { type: String, required: true },
    branch: { type: String, required: true },
    brand: { type: String },
    serviceType: { type: String },
    reason: { type: String },
    city: { type: String },
    aging: { type: Number, default: 0 },
    status: { type: String, default: 'Open' },
    remark: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Escalation', escalationSchema);
