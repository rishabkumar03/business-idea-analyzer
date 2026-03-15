const ollama = require('ollama').default;

async function chat() {
    try {
        console.log('Connecting to Mistral... Wait for 30-60 seconds');

        const response = await ollama.chat({
            model: 'mistral',
            messages: [{role: 'user', content: 'What is the difference between Abhishek and Sawan?'}],
            stream: false,
        })
    
        console.log('\nResponse');
        console.log(response.message.content);
    } catch (error) {
        console.error('Error:', error.message);
        console.log('\nIf timeout error occurs, try:');
        console.log('1. Wait 60 seconds and try again');
        console.log('2. Use smaller prompt');
    }
    
}

chat()