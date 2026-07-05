/**
 * Abstraction over LLM backends: text generation + optional chat session for the orchestrator.
 */
export interface AIResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface AIOptions {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    responseFormat?: 'text' | 'json_object';
}

export interface AIProvider {
    /**
     * Generates a completion for the given prompt
     */
    generateText(prompt: string, options?: AIOptions): Promise<AIResponse>;

    /**
     * Starts a chat session (if supported)
     */
    startChat(systemPrompt?: string): AIChatSession;
}

export interface AIChatSession {
    sendMessage(message: string): Promise<AIResponse>;
    history(): { role: 'user' | 'model'; parts: string }[];
}
