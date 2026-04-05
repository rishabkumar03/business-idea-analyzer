const { Ollama } = require('ollama');
const ollama = new Ollama();

const fs = require('fs');

// --------- CONFIGURATION ---------

const CONFIG = {
    model: 'mistral',

    // 3 minutes
    timeout: 180000,
    
    // Retry 2 times
    maxRetries: 2, 

    // 5 seconds between retries
    retryDelay: 5000,
    stream: true,
    options: {

        // Balanced - not too creative, not too rigid
        temperature: 0.5,

        // Good word diversity
        top_p: 0.9,

        // Standard vocabulary
        top_k: 40,

        // Avoid repetition
        repeat_penalty: 1.2,

        // Smaller context window, it generates faster response.
        num_ctx: 2048   
    }
}

// --------- PROMPT BUILDER ---------

function buildPrompt(idea) {
    return `Your are a seasoned business analyst who has evaluated over 500 startup ideas. You combine data-driven analysis with practical market insights.
    
BUSINESS IDEA: "${idea}"

Return this exact JSON structure: 
{
    "score": 1-10,
    "marketSize": "low/medium/large",
    "competition": "low/medium/large",
    "targetCustomer": "brief description",
    "mainRisk": "biggest risk",
    "recommendation": "proceed/modify/abandon",
    "reasoning": "2-3 sentences why"
}

Be specific with numbers and names where possible.

JSON: `;
}

function buildDetailedSelectionPrompt(idea, section) {
    const prompts = {
        market: `Analyze the market for this idea: "${idea}"
        
Return ONLY JSON: 
{
    "tamEstimate": "specific $ estimate",
    "growthRate": "% with timeframe",
    "keyTrends": ["trend1", "trend2", "trend3"],
    "targetDemographics": "age, income, location"
}
    
JSON:`,

        competition: `Analyze competition for: "${idea}"
        
Return ONLY JSON: 
{
    "directCompetitors": ["name1", "name2", "name3"],
    "indirectCompetitors": ["alt1", "alt2"],
    "differentiation": "how you're different",
    "barriers": "entry barriers"
}
    
JSON:`,

        business: `Analyze the business model for: "${idea}"
        
Return ONLY JSON: 
{
    "revenueStreams": ["stream1", "stream2"],
    "pricing": "specific pricing like Rs.X/month",
    "scalability": "low/medium/high",
    "profitabilityTimeline": "months to profitability"
}
    
JSON:`,

        risks: `List top 3 risks for: "${idea}"
        
Return ONLY JSON: 
{
        "risks": [
            {"risk": "risk1", "severity": "low/medium/high", "mitigation": "how to fix"},
            {"risk": "risk2", "severity": "low/medium/high", "mitigation": "how to fix"},
            {"risk": "risk3", "severity": "low/medium/high", "mitigation": "how to fix"}
        ]
}
        
JSON: `    
    };

    return prompts[section]
}

// --------- ERROR HANDLING ---------

class AnalysisError extends Error {
    constructor(message, type, canRetry = false) {
        super(message);
        this.name = 'AnalysisError';
        this.type = type;
        this.canRetry = canRetry;
    }
}

function identifyError(error) {
    const msg = error.message.toLowerCase();

    // Connection Error
    if (msg.includes('econnrefused')) {
        return new AnalysisError(
            'Cannot connect to Ollama. Run "ollama serve"',
            'CONNECTION_ERROR',
            false
        )
    }

    // Timeout Error
    if (msg.includes('timeout')) {
        return new AnalysisError(
            'Request timed out', 
            'TIMEOUT_ERROR',
            true
        );
    }

    // Model Not Found
    if (msg.includes('model') && msg.includes('not found')) {
        return new AnalysisError(
            `Model not found. Run "ollama pull mistral"`,
            'MODEL_NOT_FOUND',
            false 
        );
    }
        
    return new AnalysisError(error.message, 'UNKNOWN_ERROR', true);
}

// --------- JSON PARSING ---------

function parseJSON(text) {

    // Clean the response - remove markdown and extra text
    const cleaned = text
        // replaces three backticks as well as word 'json', replaces optional newline also and /g represents global replacement. Finally '' means replace with nothing.
        .replace(/```json\n?/g, '') 

        // same here, replacement of only three backticks
        .replace(/```\n?/g, '')   
        
        // ^ means starting of string, and then any character except { and * represents as many characters as possible. It means from the start remove everything until { comes.
        .replace(/^[^{]*/, '')      

        // removes anything after last } comes. (Here, $ means end of the string)
        .replace(/[^}]*$/, '')      
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        throw new AnalysisError(
            'Failed to parse JSON response',
            'PARSE_ERROR',
            true
        );
    }
}

// --------- TIMEOUT HANDLER ---------

function createTimeoutPromise(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => 
            reject(new Error('Timeout')), ms);
    });
}

// --------- RETRY LOGIC ---------

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeWithRetry(fn, maxRetries = CONFIG.maxRetries) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = identifyError(error);

            // Don't retry fatal errors. Wait before entry (except on last attempt)
            if (!lastError.canRetry || attempt === maxRetries) {
                throw lastError;
            }

            console.log(`Attempt ${attempt} failed, retrying...`);
            await sleep(CONFIG.retryDelay)
        }
    }

    // All retries exhausted
    throw lastError;
}

// --------- SINGLE REQUEST FUNCTION ---------

async function makeSingleRequest(prompt, description) {
    console.log(`Analyzing ${description}...`);
    
    return await executeWithRetry(async () => {

        // Create analysis promise
        const analysisPromise = ollama.chat({
            model: CONFIG.model,
            messages: [{ role: 'user', content: prompt }],
            options: CONFIG.options,

            // Stream should be false for easier parsing
            stream: false,  
        });

        // Create timeout promise
        const timeoutPromise = createTimeoutPromise(CONFIG.timeout);

        // Race between analysis and timeout
        const response = await Promise.race([analysisPromise, timeoutPromise]);

        return parseJSON(response.message.content);
    });
}

// --------- PROGRESSIVE ANALYZER ---------

async function analyzeBusinessIdea(idea) {
    console.log('\n Starting Business Idea Analysis... \n');
    console.log(`Idea: "${idea}"\n`);
    console.log('-'.repeat(30));

    try {
        // Step 1: Quick overview (fast, gives immediate feedback)
        console.log('\n Phase 1: Quick Overview');
        const quickPrompt = buildPrompt(idea);
        const overview = await makeSingleRequest(quickPrompt, 'quick overview');
        console.log(`Score: ${overview.score}/10 | ${overview.recommendation.toUpperCase()}`);
        
        // Step 2: Market analysis
        let market = null;
        if (overview.score >= 5) {
            console.log('\n Phase 2: Market Analysis');
            const marketPrompt = buildDetailedSelectionPrompt(idea, 'market');
            market = await makeSingleRequest(marketPrompt, 'market opportunity');
            console.log(`Market size: ${market.tamEstimate}`);
        } else {
            console.log('\n Phase 2: Skipped (low score)');
        }

        // Step 3: Competition 
        let competition = null;
        if (overview.score >= 5) {
            console.log('\n Phase 3: Competition Analysis');
            const compPrompt = buildDetailedSelectionPrompt(idea, 'competition');
            competition = await makeSingleRequest(compPrompt, 'competition');
            console.log(`Competitors: ${competition.directCompetitors.slice(0, 2).join(', ')}`);
        } else {
            console.log('\n Phase 3: Skipped (low score)');
        }

        // Step 4: Business model
        let business = null;
        if (overview.score >= 5) {
            console.log('\n Phase 4: Business Model');
            const bizPrompt = buildDetailedSelectionPrompt(idea, 'business');
            business = await makeSingleRequest(bizPrompt, 'business model');
            console.log(`Revenue: ${business.revenueStreams.join(', ')}`);
        } else {
            console.log('\n Phase 4: Skipped (low score)');
        }

        // Step 5: Risks
        console.log('\n Phase 5: Risk Assessment');
        const riskPrompt = buildDetailedSelectionPrompt(idea, 'risks');
        const risks = await makeSingleRequest(riskPrompt, 'risks');
        console.log(`Top risk: ${risks.risks[0].risk}`);
        
        console.log('\n'.repeat(30));
        console.log('Analysis Complete!\n');

        return {
            overview: overview,
            market: market,
            competition: competition,
            businessModel: business,
            risks: risks.risks,
            analyzedAt: new Date().toISOString(),
            idea: idea
        };
    } catch (error) {
        const analysisError = identifyError(error);
        console.log('\n'.repeat(30));
        console.error(`\n Analysis Failed: ${analysisError.type}`);
        console.error(`Message: ${analysisError.message}\n`);

        // Show solution
        if (analysisError.type === 'CONNECTION_ERROR') {
            console.log('Solution: Run "ollama serve" in another terminal\n');
        } else if (analysisError.type === 'MODEL_NOT_FOUND') {
            console.log('Solution: Run "ollama pull mistral"\n');
        } else if (analysisError.type === 'TIMEOUT_ERROR') {
            console.log('Solution: Try a shorter/simpler idea description\n');
        }

        throw analysisError;
    }
}

// --------- PROGRESSIVE ANALYZER ---------

// function displayAnalysis(analysis) {
//     console.log("--------- ANALYSIS REPORT ---------");

//     // Viability Score
//     const ov = analysis.overview;
//     console.log(`VIABILITY SCORE: ${ov.score}/10`);
//     console.log(`RECOMMENDATION: ${ov.recommendation}`);
//     console.log(`\n ${ov.reasoning}`);
    
//     console.log('-'.repeat(30));
//     console.log('TARGET CUSTOMER');
//     console.log('-'.repeat(30));
//     console.log(ov.targetCustomer + '\n');

//     // Market (if available)
//     if (analysis.market) {
//         console.log('-'.repeat(60));
//         console.log('MARKET');
//         console.log('-'.repeat(60));
//         console.log(`Size: ${analysis.market.tamEstimate}`);
//         console.log(`Growth: ${analysis.market.growthRate}`);
//         console.log(`Demographics: ${analysis.market.targetDemographics}\n`);
//     }

//     // Competition
//     if (analysis.competition) {
//         console.log('-'.repeat(30));
//         console.log('COMPETITION');
//         console.log('-'.repeat(30));
//         console.log(`Direct: ${analysis.competition.directCompetitors.join(', ')}`);
//         console.log(`Edge: ${analysis.competition.differentiation}\n`);
//     }

//     // Business Model
//     if (analysis.businessModel) {
//         console.log('-'.repeat(30));
//         console.log('BUSINESS MODEL');
//         console.log('-'.repeat(30));
//         console.log(`Revenue: ${analysis.businessModel.revenueStreams.join(', ')}`);
//         console.log(`Pricing: ${analysis.businessModel.pricing}\n`);
//     }

//     // Risks
//     console.log('-'.repeat(30));
//     console.log('TOP RISKS');
//     console.log('-'.repeat(30));
//     analysis.risks.forEach((r, i) => {
//         console.log(`${i + 1}. [${r.severity.toUpperCase()}] ${r.risk}`);
//         console.log(`Fix: ${r.mitigation}\n`);
//     });

//     console.log('='.repeat(30) + '\n');
// }  

// --------- FILE OPTIONS ---------

function saveAnalysis(idea, analysis) {

    // This will create timestamp: "2026-03-23T14-20-20-123Z"
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `analysis_${timestamp}.json`;

    const output = {
        idea: idea,
        analyzedAt: new Date().toISOString(),
        analysis: analysis
    }

    try {
        fs.writeFileSync(filename, JSON.stringify(output, null, 2));
        console.log(`Full analysis saved to: ${filename}\n`);
        return filename;
    } catch (error) {
        console.error('Warning: Could not save file: ', error.message);
        return null;
    }
}

// --------- EXPORTS ---------

module.exports = {
    analyzeBusinessIdea, 
    saveAnalysis,
    CONFIG,
    AnalysisError
};

// --------- MAIN ENTRY POINT ---------

if (require.main === module) {
    const idea = process.argv[2] || "A platform connecting freelance developers with equity-based startup projects"

    analyzeBusinessIdea(idea)
        .then(analysis => saveAnalysis(idea, analysis))
        .catch(() => process.exit(1));
}