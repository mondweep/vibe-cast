import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for demo purposes
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const PORT = 3001;

// Initial Graph Data - "Tribe Mind" Seed
let graphData = {
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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send current graph state to new user
    socket.emit('init-graph', graphData);

    // Handle adding a new node
    socket.on('add-node', (nodeData) => {
        const newNode = {
            id: uuidv4(),
            group: Math.floor(Math.random() * 5) + 2, // Random group for color
            val: 5 + Math.random() * 5, // Random size
            ...nodeData
        };

        graphData.nodes.push(newNode);

        // If a parent ID was provided, create a link
        if (nodeData.parentId) {
            const newLink = {
                source: nodeData.parentId,
                target: newNode.id
            };
            graphData.links.push(newLink);
        }

        // Broadcast the update to EVERYONE (including sender)
        io.emit('graph-update', graphData);

        // Broadcast specific event for UI feedback
        io.emit('node-added', newNode);
    });

    // Handle adding a new link
    socket.on('add-link', (linkData) => {
        const newLink = {
            source: linkData.source,
            target: linkData.target
        };
        graphData.links.push(newLink);
        io.emit('graph-update', graphData);
    });

    // Handle clearing the graph (reset)
    socket.on('reset-graph', () => {
        graphData = {
            nodes: [{ id: 'tribe', group: 1, name: 'Tribe Mind', val: 20 }],
            links: []
        };
        io.emit('graph-update', graphData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🚀 Tribe Mind Server running on http://localhost:${PORT}`);
});
