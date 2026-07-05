require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

async function listModels() {
    const key = process.env.AI_API_KEY;
    if (!key) {
        console.error('No API Key found within .env');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        console.log('Fetching models from:', url.replace(key, 'HIDDEN_KEY'));

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response Body:', text);
            return;
        }

        const data = await response.json();
        const fs = require('fs');
        let output = 'Available Models:\n';
        if (data.models) {
            data.models.forEach((m) => {
                output += `- ${m.name} (${m.displayName})\n`;
            });
        } else {
            output += 'No models found in response.\nJSON: ' + JSON.stringify(data);
        }
        fs.writeFileSync('models.txt', output);
        console.log('Models written to models.txt');

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

listModels();
