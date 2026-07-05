import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function test() {
    const key = process.env.AI_API_KEY;
    if (!key) {
        console.error('No API Key found within .env');
        return;
    }
    console.log('API Key found: ', key.substring(0, 5) + '...');

    const genAI = new GoogleGenerativeAI(key);

    /*
    // List models (if available/supported by SDK version)
    // Current SDK might not have listModels easily exposed on the client directly in all versions 
    // without a model instance, but let's try to just generate.
    */

    const modelName = 'gemini-1.5-flash';
    console.log(`Testing model: ${modelName}`);

    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello, are you there?');
        const response = await result.response;
        console.log('Success! Response:', response.text());
    } catch (error: any) {
        console.error('Error testing API:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('StatusText:', error.response.statusText);
        }
        console.error('Full Error:', error);
    }
}

test();
