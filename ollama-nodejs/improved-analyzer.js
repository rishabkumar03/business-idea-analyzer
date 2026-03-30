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
        temperature: 0.2,

        // Good word diversity
        top_p: 0.3,

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
    
BUSINESS IDEA TO ANALYZE: 
"${idea}"

ANALYSIS FRAMEWORK: 

1. PROBLEM & SOLUTION FIT
    - What specific problem does this solve?
    - How acute is this pain point?
    - Is the solution novel or improvement over existing options?
    
2. MARKET OPPORTUNITY
    - Total Addressable Market (TAM) estimate
    - Current market growth rate
    - Key market trends favoring or opposing this idea
    
3. TARGET CUSTOMER PROFILE
    - Specific demographics (age, income, location, occupation)
    - Core pain points this solves for them
    - Current alternatives they use
    - Estimated willingness to pay
    
4. COMPETITIVE ANALYSIS
    - Direct competitors (name at least 2-3 if they exist)
    - Indirect competitors or substitutes
    - Your unique differentiation
    - Barriers to entry for new competitors
    
5. BUSINESS MODEL
    - Revenue streams (be specific: subscription $X/month, commission Y%, etc.)
    - Unit economics (rough CAC, LTV estimates)
    - Path to profitability timeline
    
6. EXECUTION RISKS
    - Technical/product risks
    - Market/customer acquisition risks
    - Financial/funding risks
    - Regulatory or legal risks
    (For each risk, suggest a mitigation strategy)
    
7. GO-TO-MARKET STRATEGY
    - First 3 customer acquisition channels
    - How to get first 10 customers
    - How to scale to 1,000 customers
    
8. CRITICAL SUCCESS FACTORS
    - Top 3 things MUST go right for this to succeed
    
9. VIABILITY ASSESSMENT
    - Overall score (1-10)
    - Detailed reasoning (3-4 sentences)
    - Clear recommendation: PROCEED / PIVOT / ABANDON
    - If PIVOT, suggest what to change
    
OUTPUT FORMAT: 
Return ONLY valid JSON matching this schema: 

{
    "problemSolution": {
        "problem": "string",
        "painAcuity": "low/medium/high",
        "solutionNovelty": "incremental/significant/breakthrough"
    },
    "market": {
        "tamEstimate": "string with numbers",
        "growthRate": "string", 
        "keyTrends": ["trend1", "trend2", "trend3"]
    },
    "targetCustomer": {
        "demographics": "detailed description",
        "painPoints": ["pain1", "pain2", "pain3"],
        "currentAlternatives": ["alt1", "alt2"],
        "willingnessToPay": "low/medium/high"
    }, 
    "competition": {
        "directCompetitors": ["competitor1", "competitor2"],
        "indirectCompetitors": ["substitute1", "substitute2"], 
        "differentiation": "clear unique value prop",
        "barriers": "string"
    },
    "businessModel": {
        "revenueStreams": ["stream1", "stream2"],
        "pricing": "specific pricing",
        "unitEconomics": "CAC and LTV estimates",
        "profitabilityTimeline": "string"
    }, 
    "risks": [
        {
            "category": "technical/market/financial/regulatory",
            "risk": "specific risk",
            "severity": "low/medium/high",
            "mitigation": "specific strategy"
        }
    ],
    "goToMarket": {
        "channels": ["channel1", "channel2", "channel3"],
        "first10Customers": "specific strategy",
        "scaleTo1000": "specific strategy"
    },
    "successFactors": ["factor1", "factor2", "factor3"],
    "viability": {
        "score": 1-10,
        "reasoning": "detailed 3-4 sentence explanation", 
        "recommendation": "PROCEED/PIVOT/ABANDON",
        "pivotSuggestion": "what to change (if applicable)"
    }
}
    

QUALITY STANDARDS: 
- Be specific: "SaaS subscription at $49/month" NOT "subscription model"
- Use numbers: "$5B market growing at 15% annually" NOT "largest growing market"
- Name names: "Competing with Shopify and WooCommerce" NOT "established players"
- Be actionable: "Start with Reddit ads in r/entrepreneurs" NOT "use social media"
- Be honest: If it's bad idea, say so clearly and explain why
- Think 2026: Consider current economic conditions, AI trends, remote work, etc.

JSON:`;
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
    if (msg.includes('econnrefused') || msg.includes('connect')) {
        return new AnalysisError(
            'Cannot connect to Ollama. Run "ollama serve" in another terminal.',
            'CONNECTION_ERROR',
            false
        )
    }

    // Timeout Error
    if (msg.includes('timeout') || msg.includes('timed out')) {
        return new AnalysisError(
            'Request timed out. The model may be loading. Please try again.', 
            'TIMEOUT_ERROR',
            true
        );
    }

    // Model Not Found
    if (msg.includes('model') && msg.includes('not found')) {
        return new AnalysisError(
            `Model "${CONFIG.model}" not found. Run "ollama pull ${CONFIG.model}"`,
            'MODEL_NOT_FOUND',
            false 
        );
    }

    // JSON Parse Error
    if (msg.includes('json') || msg.includes('parse')) {
        return new AnalysisError(
            'AI returned invalid JSON. This is usually temporary - try again.',
            'PARSE_ERROR',
            true
        )
    }

    // Out of Memory
    if (msg.includes('memory') || msg.includes('oom')) {
        return new AnalysisError(
            'Out of memory. Close other applications and try again.',
            'OUT_OF_MEMORY',
            false
        )
    }

    // Unknown Error
    return new AnalysisError(
        error.message,
        'UNKNOWN_ERROR',
        true
    )

    function displayError(error) {
        const analysisError = error instanceof AnalysisError ? error: identifyError(error);

        console.log('\n' + '='.repeat(45));
        console.log('ERROR: ' + analysisError.type);
        console.log('='.repeat(45));
        console.log('\n' + analysisError.message + '\n');
        
        // Provide solutions based on error type
        switch (analysisError.type) {
            case 'CONNECTION_ERROR': 
                console.log('Solution: ');
                console.log('1. Open a new terminal window');
                console.log('2. Run: ollama serve');
                console.log('3. Keep that terminal open');
                console.log('4. Try your analysis again\n');
                break;

            case 'TIMEOUT_ERROR': 
                console.log('Solution: ');
                console.log('1. Wait 30-60 seconds and try again');
                console.log('2. The model is loading for the first time');
                console.log('3. Subsequent requests will be faster\n');
                break;

            case 'MODEL_NOT_FOUND': 
                console.log('Solution: ');
                console.log(`1. Run: ollama pull ${CONFIG.model}`);
                console.log('2. Wait for download to complete');
                console.log('3. Try your analysis again\n');
                break;

            case 'PARSE_ERROR': 
                console.log('Solution: ');
                console.log('1. Simply try again - this is temporary ');
                console.log('2. If it persists, restart Ollama\n');
                break;

            default:
                console.log('Try: ');
                console.log('1. Check the error message above');
                console.log('2. Restart Ollama: Close it and run "ollama serve"');
                console.log('3. Check system resources (RAW, CPU)');
        }

        console.log('='.repeat(45) + '\n');
        
        return analysisError;
    }
}

// --------- JSON PARSING ---------

async function parseJSON(text) {

    // Clean the response - remove markdown and extra text
    const cleaned = response.message.content
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
        setTimeout(() => {
            reject(new Error(`Request timed out after ${ms / 1000} seconds`));
        }, ms);
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
            console.log(`Attempt ${attempt}/${maxRetries}...`);
            const result = await fn();
            console.log('Success!\n');
            return result;
        } catch (error) {
            lastError = identifyError(error);
            console.error(`Attempt ${attempt} failed: ${lastError.message}`);

            // Don't retry fatal errors
            if (!lastError.canRetry) {
                throw lastError;
            }

            // Wait before entry (except on last attempt)
            if (attempt < maxRetries) {

                // Incremental backoff
                const waitTime = CONFIG.retryDelay * attempt;
                console.log(`Waiting ${waitTime / 1000}s before retry...\n`);
                await sleep(waitTime);
            }
        }
    }

    // All retries exhausted
    throw new AnalysisError(
        `Failed after ${maxRetries} attempts: ${lastError.message}`,
        lastError.type,
        false
    );
}

// --------- CORE ANALYZER ---------

async function analyzeBusinessIdea(idea) {
    console.log('Analyzing business idea...\n');
    
    const analysis = await executeWithRetry(async () => {
        const prompt = buildPrompt(idea);

        // Create analysis promise
        const analysisPromise = ollama.chat({
            model: CONFIG.model,
            messages: [{ role: 'user', content: prompt }],
            options: CONFIG.options
        });

        // Create timeout promise
        const timeoutPromise = createTimeoutPromise(CONFIG.timeout);

        // Race between analysis and timeout
        const response = await Promise.race([analysisPromise, timeoutPromise]);

        // Parse JSON response
        const parsedAnalysis = parseJSON(response.message.content);

        return parsedAnalysis;
    })

    return analysis;
}

// --------- DISPLAY FUNCTIONS ---------

function displayAnalysis(analysis) {
    console.log("--------- BUSINESS IDEA ANALYSIS REPORT ---------");

    // Viability Score
    console.log(`VIABILITY SCORE: ${analysis.viability.score}/10`);
    console.log(`RECOMMENDATION: ${analysis.viability.recommendation}`);
    console.log(`\n Reasoning: \n ${analysis.viability.reasoning}`);
    
    if (analysis.viability.pivotSuggestion) {
        console.log(`Pivot Suggestion: ${analysis.viability.pivotSuggestion}\n`);
    }

    // Problem & Solution
    console.log('-'.repeat(30));
    console.log('PROBLEM & SOLUTION');
    console.log('-'.repeat(30));
    console.log(`Problem: ${analysis.problemSolution.problem}`);
    console.log(`Pain Acuity: ${analysis.problemSolution.painAcuity.toUpperCase()}`);
    console.log(`Solution Novelty: ${analysis.problemSolution.solutionNovelty}\n`);
    
    // Market Analysis
    console.log('-'.repeat(30));
    console.log('MARKET OPPORTUNITY');
    console.log('-'.repeat(30));
    console.log(`TAM: ${analysis.market.tamEstimate}`);
    console.log(`Growth Rate: ${analysis.market.growthRate}`);
    console.log('Key Trends: ');
    analysis.market.keyTrends.forEach((trend, i) => {
        console.log(`   ${i + 1}. ${trend}`);        
    });
    console.log();
    
    // TARGET CUSTOMER
    console.log('-'.repeat(30));
    console.log('TARGET CUSTOMER');
    console.log('-'.repeat(30));
    console.log(analysis.targetCustomer.demographics);
    console.log(`\nWillingness to Pay: ${analysis.targetCustomer.willingnessToPay.toUpperCase()}\n`);
    console.log('Pain Points: ');
    analysis.targetCustomer.painPoints.forEach((pain, i) => {
        console.log(`   ${i + 1}. ${pain}`);
    })
    console.log();
    
    // Competition
    console.log('-'.repeat(30));
    console.log('COMPETITION');
    console.log('-'.repeat(30));
    console.log(`Direct Competitors: ${analysis.competition.directCompetitors.join(', ')}`);
    console.log(`Indirect Competitors: ${analysis.competition.indirectCompetitors.join(', ')}`);
    console.log(`Differentiation: ${analysis.competition.differentiation}`);

    // Business Model
    console.log('-'.repeat(30));
    console.log('BUSINESS MODEL');
    console.log('-'.repeat(30));
    console.log(`Revenue Streams: ${analysis.businessModel.revenueStreams.join(', ')}`);
    console.log(`Pricing: ${analysis.businessModel.pricing}`);
    console.log(`Unit Economics: ${analysis.businessModel.unitEconomics}\n`);
    console.log(`Profitability Timeline: ${analysis.businessModel.profitabilityTimeline}`);
    
    // Risks
    console.log('-'.repeat(30));
    console.log('TOP RISKS');
    console.log('-'.repeat(30));
    analysis.risks.slice(0, 3).forEach((r, i) => {
        console.log(`${i + 1}.[${r.severity.toUpperCase()}] ${r.risk}`);
        console.log(`Category: ${r.category}`);
        console.log(`Mitigation: ${r.mitigation}\n`);
    });

    // Go-to-Market
    console.log('-'.repeat(30));
    console.log('GO TO MARKET');
    console.log('-'.repeat(30));
    console.log(`Channels: ${analysis.goToMarket.channels.join(', ')}`);
    console.log(`First 10 Customers: ${analysis.goToMarket.first10Customers}`);
    console.log(`Scale to 1000: ${analysis.goToMarket.scaleTo1000}\n`);
    
    // Success Factors
    console.log('-'.repeat(30));
    console.log('CRITICAL SUCCESS FACTORS');
    console.log('-'.repeat(30));
    analysis.successFactors.forEach((f, i) => {
        console.log(`${i + 1}. ${f}`); 
    });

    console.log('\n' + '='.repeat(30) + '\n');
}  

// --------- FILE OPTIONS ---------

function saveAnalysis(idea, analysis) {

    // This will create timestamp: "2026-03-23T14-20-20-123Z"
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `analysis_${timestamp}.json`;

    const output = {
        idea: idea,
        analyzedAt: new Date().toISOString(),
        analysis: analysis
    };

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

// --------- TEST MODE ---------

if (require.main === module) {
    const testIdea = "A platform that connects freelance developers with startups for equity-based projects"

    analyzeBusinessIdea(testIdea)
        .then(analysis => {
            saveAnalysis(analysis);

            const fs = require('fs');
            fs.writeFileSync('business-idea-analyzer.json', JSON.stringify(analysis, null, 2));
        }) 
        .catch(error => {
            console.error('Error: ', error.message);
        });
}
