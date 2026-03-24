const ollama = require('ollama').default;

async function analyzeBusinessIdea(idea) {
    const prompt = `You are a business analyst. Analyze this idea and return ONLY valid JSON

Business Idea: ${idea}

Return this exact JSON structure: 
{
    "idea": "brief summary",
    "marketAnalysis": {
        "size": "small/medium/large",
        "growth": "declining/stable/growing",
        "trends": ["trend1", "trend2"]
    },
    "targetAudience": {
        "primary": "description",
        "demographics": "age, income, location",
        "painPoints": ["pain1", "pain2"]
    },
    "competition": {
        "level": "low/medium/high",
        "mainCompetitors": ["competitor1", "competitor2"],
        "differentiation": "how you're different"
    }, 
    "revenueModel": {
        "type": "subscription/freemium/marketplace/ads",
        "estimatedPrice": "price range",
        "scalability": "low/medium/high"
    },
    "risks": [
        {"risk": "description", "severity": "low/medium/high"},
        {"risk": "description", "severity": "low/medium/high"}
    ],
    "successFactors": ["factor1", "factor2", "factor3"],
    "viability": {
        "score": 1-10,
        "reasoning": "explanation",
        "recommendation": "proceed/pivot/abandon"
    }
}
    
Respond with JSON only:`;

    console.log('Analyzing business idea...\n');

    const response = await ollama.chat({
        model: 'mistral',
        messages: [{ role: 'user', content: prompt }],
        options: {
            temperature: 0.2,
            top_p: 0.3,
            repeat_penalty: 1.2,
        }
    });

    const text = response.message.content;

    // Clean the response
    const cleaned = text
        // replaces three backticks as well as word 'json', replaces optional newline also and /g represents global replacement. Finally '' means replace with nothing.
        .replace(/```json\n?/g, '') 

        // same here, replacement of only three backticks
        .replace(/```\n?/g, '')   
        
        // ^ means starting of string, and then any character except { and * represents as many characters as possible. It means from the start remove everything until { comes.
        .replace(/^[^{]*/, '')      

        // removes anything after last } comees. (Here, $ means end of the string)
        .replace(/[^}]*$/, '')      
        .trim();

    try {
        const analysis = JSON.parse(cleaned);
        return analysis;
    } catch (error) {
        console.error('Failed to parse JSON');
        console.error('Raw response: ', text);
        throw error;
    }
}

const testIdea = "A platform that connects freelance developers with startups for equity-based projects";

analyzeBusinessIdea(testIdea)
    .then(analysis => {
        console.log(JSON.stringify(analysis, null, 2));
        
        console.log('\n' + '='.repeat(60));
        console.log('Quick Summary:');
        console.log('='.repeat(60));
        console.log(`Score: ${analysis.viability.score}/10`);
        console.log(`Recommendation: ${analysis.marketAnalysis.recommendation.toUpperCase()}`);
        console.log(`Market Size: ${analysis.marketAnalysis.size}`);
        console.log(`Competition: ${analysis.competition.level}`);
        console.log(`Revenue Model: ${analysis.revenueModel.type}`);
        console.log('\nTop 3 Risks: ');

        // slice will give the top 3 risks and then each risk will be represented numerically with the severity (risk)
        analysis.risks.slice(0, 3).forEach((r, i) => {
            console.log(` ${i + 1}. ${r.risk} (${r.severity} severity)`);   
        });
    })
    .catch(error => {
        console.error('Error: ', error.message);
    });

