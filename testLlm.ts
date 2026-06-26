import { executeAgentTask } from './agents/utils/llmProvider';

async function pingModel() {
    console.log("🔌 Connecting to LLM Provider...");
    try {
        const result = await executeAgentTask(
            "You are a helpful AI assistant confirming a connection.",
            "Say exactly: 'Connection successful! The AI Framework core is online.'"
        );
        console.log("✅ Response:", result.text);
    } catch (e) {
        console.error("Connection Failed. Check your .env file.");
    }
}

pingModel();