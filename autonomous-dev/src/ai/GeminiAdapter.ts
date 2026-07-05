/**
 * `AIProvider` implementation using Google Generative AI (Gemini SDK).
 */
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AIProvider, AIResponse, AIOptions, AIChatSession } from './AIProvider';
import { config } from '../config';
import { logger } from '../utils/logger';

export class GeminiAdapter implements AIProvider {
    private client: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor() {
        if (!config.AI_API_KEY) {
            throw new Error('Gemini API Key not found in configuration');
        }
        this.client = new GoogleGenerativeAI(config.AI_API_KEY);
        this.model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    async generateText(prompt: string, options?: AIOptions): Promise<AIResponse> {
        try {
            logger.info('Generating text with Gemini', { promptLength: prompt.length });

            const generationConfig = {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxTokens,
                stopSequences: options?.stopSequences,
            };

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig,
            });

            const response = await result.response;
            const text = response.text();

            return {
                text,
                usage: {
                    promptTokens: 0, // Gemini SDK doesn't always return this easily yet
                    completionTokens: 0,
                    totalTokens: 0,
                },
            };
        } catch (error) {
            logger.error('Gemini generation failed', { error });
            throw error;
        }
    }

    startChat(systemPrompt?: string): AIChatSession {
        // Basic chat implementation
        // For now, simpler to just use generateText with history if needed, 
        // but Gemini SDK has startChat.
        const chat = this.model.startChat({
            history: systemPrompt ? [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Understood.' }] }] : [],
        });

        return {
            sendMessage: async (message: string) => {
                try {
                    const result = await chat.sendMessage(message);
                    const response = await result.response;
                    return {
                        text: response.text(),
                    };
                } catch (error) {
                    logger.error('Gemini chat failed', { error });
                    throw error;
                }
            },
            history: () => {
                // Mapping not strictly 1:1 as internal history might be different types
                return [];
            }
        };
    }
}
