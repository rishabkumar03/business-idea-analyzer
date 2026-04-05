const express = require('express');
const cors = require('cors');
const { analyzeBusinessIdea, saveAnalysis } = require('./improved-analyzer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// FIXED: Changed '/analyze' to '/api/analyze'
app.post('/api/analyze', async (req, res) => {
    const { idea } = req.body;
    
    if (!idea || idea.trim().length < 10) {
        return res.status(400).json({ 
            success: false,
            error: 'Please provide a business idea (at least 10 characters)' 
        });
    }

    try {
        console.log(`\nAnalyzing: "${idea.substring(0, 50)}..."`);
        
        const analysis = await analyzeBusinessIdea(idea);
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
            type: error.type || 'UNKNOWN_ERROR'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 3001;

app.listen(PORT, () => {
    console.log('   BUSINESS IDEA ANALYZER: BACKEND API     ');
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/analyze\n`);
});