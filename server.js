const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const os = require('os');

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        const iface = interfaces[interfaceName];
        for (const item of iface) {
            if (item.family === 'IPv4' && !item.internal) {
                return item.address;
            }
        }
    }
    return '0.0.0.0'; // Fallback
}

const PORT = process.env.PORT || 3000;
const LOCAL_IP = getLocalIP();
const DATA_FILE = path.join(__dirname, 'data', 'projects.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        projects: [],
        metadata: {
            publishedBy: "Jmk125",
            publishedAt: getCurrentDateTime()
        }
    }));
}

// Body parser for JSON
app.use(express.json({ limit: '10mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Format current date and time as requested: YYYY-MM-DD HH:MM:SS
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// API endpoint to load projects
app.get('/api/projects', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error loading projects:', error);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

// API endpoint to save projects
app.post('/api/projects', (req, res) => {
    try {
        const data = req.body;
        
        // Add server-generated timestamp if not provided
        if (!data.metadata || !data.metadata.publishedAt) {
            if (!data.metadata) data.metadata = {};
            data.metadata.publishedAt = getCurrentDateTime();
        }
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        
        console.log(`Projects published by ${data.metadata.publishedBy} at ${data.metadata.publishedAt}`);
        
        res.json({ success: true, timestamp: data.metadata.publishedAt });
    } catch (error) {
        console.error('Error saving projects:', error);
        res.status(500).json({ error: 'Failed to save projects' });
    }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log('---------------------------------------------');
    console.log(`Pre-Construction Dates server is running!`);
    console.log(`Current Date and Time (UTC): ${getCurrentDateTime()}`);
    console.log(`Current User's Login: Jmk125`);
    console.log('---------------------------------------------');
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://${LOCAL_IP}:${PORT}`);
    console.log('---------------------------------------------');
});