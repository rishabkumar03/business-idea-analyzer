const ollama = require('ollama').default;

async function chatStream() {
    try {
        console.log('Connecting to Mistral... Wait for 30-60 seconds \n');
        
        const response = await ollama.chat({
            model: 'mistral',
            messages: [
                {
                    role: 'system',
                    content: ''
                },
                {
                    role: 'user',
                    content: 'What color is the sky? Amior Amior'
                }
            ],
            stream: true,
            options: {
                temperature: 0.2,
                repeat_penalty: 1.2,
                top_p: 0.3,
                top_k: 40
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