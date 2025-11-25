import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'graph-data.json');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const PORT = 3001;

// Default Seed Data
const defaultData = {
    nodes: [
        { id: 'tribe', group: 1, name: 'Tribe Mind', val: 20 },
        { id: 'knowledge', group: 2, name: 'Knowledge Base', val: 10 },
        { id: 'collaboration', group: 2, name: 'Collaboration', val: 10 },
        { id: 'innovation', group: 2, name: 'Innovation', val: 10 }
    ],
    links: [
        { source: 'tribe', target: 'knowledge' },
        { source: 'tribe', target: 'collaboration' },
        { source: 'tribe', target: 'innovation' },
        { source: 'knowledge', target: 'innovation' }
    ]
};

// Load data from file or use default
let graphData = defaultData;
try {
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        graphData = JSON.parse(rawData);
        console.log('📂 Loaded graph data from disk');
    } else {
        saveData(); // Create the file if it doesn't exist
    }
} catch (err) {
    console.error('Error loading data:', err);
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(graphData, null, 2));
    } catch (err) {
        console.error('Error saving data:', err);
    }
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current graph state to new user
    socket.emit('init-graph', graphData);

    // Handle adding a new node
    socket.on('add-node', (nodeData) => {
        const newNode = {
            id: uuidv4(),
            group: Math.floor(Math.random() * 5) + 2,
            val: 5 + Math.random() * 5,
            ...nodeData
        };

        graphData.nodes.push(newNode);

        if (nodeData.parentId) {
            const newLink = {
                source: nodeData.parentId,
                target: newNode.id
            };
            graphData.links.push(newLink);
        }

        saveData(); // Save to disk
        io.emit('graph-update', graphData);
        io.emit('node-added', newNode);
    });

    // Handle adding a new link
    socket.on('add-link', (linkData) => {
        const newLink = {
            source: linkData.source,
            target: linkData.target
        };
        graphData.links.push(newLink);
        saveData(); // Save to disk
        io.emit('graph-update', graphData);
    });

    // Handle full graph replacement (Import)
    socket.on('import-graph', (newData) => {
        if (newData && Array.isArray(newData.nodes) && Array.isArray(newData.links)) {
            graphData = newData;
            saveData();
            io.emit('graph-update', graphData);
        }
    });

    // Handle clearing the graph
    socket.on('reset-graph', () => {
        graphData = {
            nodes: [{ id: 'tribe', group: 1, name: 'Tribe Mind', val: 20 }],
            links: []
        };
        saveData();
        io.emit('graph-update', graphData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Tribe Mind Server running on http://localhost:${PORT}`);
});
