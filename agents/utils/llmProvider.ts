import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq'; // ADD THIS LINE
import dotenv from 'dotenv';

dotenv.config();

function getActiveModel() {
    const provider = process.env.ACTIVE_LLM_PROVIDER?.toLowerCase();
    const modelName = process.env.ACTIVE_LLM_MODEL;

    if (!provider || !modelName) {
        throw new Error('Missing ACTIVE_LLM_PROVIDER or ACTIVE_LLM_MODEL in .env');
    }

    switch (provider) {
        case 'google':
            if (!process.env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing');
            const googleProvider = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
            return googleProvider(modelName);
            
        case 'anthropic':
            if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
            const anthropicProvider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            return anthropicProvider(modelName);

        // ADD GROQ SUPPORT HERE
        case 'groq':
            if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
            const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY });
            return groqProvider(modelName);
            
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

export async function executeAgentTask(
    systemPrompt: string, 
    userPrompt: string, 
    tools?: Record<string, any>
) {
    const model = getActiveModel();
    
    try {
        const response = await generateText({
            model: model,
            system: systemPrompt,
            prompt: userPrompt,
            tools: tools
        });
        
        return response;
    } catch (error) {
        console.error(`❌ Error during LLM execution with ${process.env.ACTIVE_LLM_PROVIDER}:`, error);
        throw error;
    }
}