import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function listModels() {
    const key = process.env.AI_API_KEY;
    if (!key) {
        console.error('No API Key found within .env');
        return;
    }

    // Try to use the API to list models.
    // Note: The SDK does not expose listModels on the client directly in all versions,
    // but let's try via the model manager if available or fallback to a REST call.

    // Actually, let's use a simple fetch to the REST API to be 100% sure without SDK abstraction.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        console.log('Fetching models from:', url.replace(key, 'HIDDEN_KEY'));

        // Node 18+ has fetch. 
        // If not, we might need axios or https.
        // Let's assume fetch is available (Node 22 is used in logs).
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response Body:', text);
            return;
        }

        const data = await response.json();
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.displayName})`);
            });
        } else {
            console.log('No models found in response:', data);
        }

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

listModels();
