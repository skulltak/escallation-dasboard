const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const EscalationSchema = new mongoose.Schema({
    branch: String,
    status: String,
    date: String
}, { strict: false });

const Escalation = mongoose.model('Escalation', EscalationSchema);

async function diag() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const count = await Escalation.countDocuments();
        console.log(`Total documents: ${count}`);
        
        if (count > 0) {
            const sample = await Escalation.findOne();
            console.log('Sample document:', sample);
            
            const branches = await Escalation.distinct('branch');
            console.log('Unique branches in DB:', branches);
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

diag();
