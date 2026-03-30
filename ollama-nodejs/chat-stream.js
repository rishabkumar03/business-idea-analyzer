const ollama = require('ollama').default;

async function chatStream() {
    try {
        console.log('Connecting to Mistral... Wait for 30-60 seconds \n');
        
        const response = await ollama.chat({
            model: 'mistral',
            messages: [
                {
                    role: 'system',
                    content: ""
                },
                {
                    role: 'user',
                    content: " Sustainable Product Subscription Box*Curated monthly boxes featuring small-batch, eco-friendly household essentials (cleaning supplies, personal care, pantry staples) from verified sustainable brands. The niche angle: focus on a specific lifestyle like zero-waste families or minimalists.."
                }
            ],
            stream: true,               // stream helps in generating ChatGPT like typing effect
            options: {
                temperature: 0.2,       // low temperature leads to more focused response
                repeat_penalty: 1.2,    // prevents repetition, here logic repetition will happen only, leads to more accurate response
                top_p: 0.3,             // low top_p leads to more focused vocabulary (choose of words), not random one
                top_k: 40               // low top_k leads to standard vocabulary, not inaccurate one
            }
        })

        console.log('Response: ');
        
        for await (const part of response) {
            process.stdout.write(part.message.content)
        }

        console.log('\n\n Done!')

    } catch (error) {
        console.error('Error:', error.message);
    }
}

chatStream()