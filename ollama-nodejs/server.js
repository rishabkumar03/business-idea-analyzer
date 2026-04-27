const express = require('express');
const cors = require('cors');
const { analyzeBusinessIdea, saveAnalysis } = require('./improved-analyzer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Main analysis functionality
app.post('/api/analyze', async (req, res) => {
    const { idea } = req.body;
    
    // Reject empty or too-short ideas
    if (!idea || idea.trim().length < 10) {
        return res.status(400).json({ 
            success: false,
            error: 'Please provide a business idea (at least 10 characters)',
            type: 'VALIDATION_ERROR'
        });
    }

    try {
        console.log(`\nAnalyzing: "${idea.substring(0, 50)}..."`);
        
        const analysis = await analyzeBusinessIdea(idea);

        // saves JSON file to disk
        saveAnalysis(idea, analysis);
        
        res.json({ 
            success: true, 
            analysis 
        });
        
    } catch (error) {
        console.error('Error: ', error.message);
        
        res.status(500).json({ 
            success: false, 
            error: error.message,

            // Parse error type to frontend
            type: error.type || 'UNKNOWN_ERROR'
        });
    }
});

// Health check endpoint: useful for checking server is alive or not
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: 'mistral', port: PORT, timestamp: new Date().toISOString() });
});

// allowing override of env
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log('   BUSINESS IDEA ANALYZER: BACKEND API     ');
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/analyze\n`);
});