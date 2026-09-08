import { config } from "dotenv";
import express from "express";
import { BASE_PROMPT, getSystemPrompt } from "./prompts.js";
import { basePrompt as nodeBasePrompt } from "./defaults/node.js";
import { basePrompt as reactBasePrompt } from "./defaults/react.js";
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
// Load environment variables
config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(cors());
// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Helper to execute Gemini API calls with exponential backoff on transient errors & rate limits
async function callWithRetry(operationName, fn, maxRetries = 3, baseDelayMs = 2000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            const errMsg = String(err?.message || err);
            const isRateLimit = errMsg.includes("429") ||
                errMsg.includes("quota") ||
                errMsg.includes("Resource has been exhausted") ||
                errMsg.includes("Too Many Requests");
            const isTransient = isRateLimit || errMsg.includes("503") || errMsg.includes("500") || errMsg.includes("fetch failed");
            console.warn(`[Gemini ${operationName} Attempt ${attempt}/${maxRetries}] Error: ${errMsg}`);
            if (attempt < maxRetries && isTransient) {
                const delay = baseDelayMs * attempt;
                console.log(`[Gemini ${operationName}] Backing off for ${delay}ms before attempt ${attempt + 1}...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            else {
                throw err;
            }
        }
    }
    throw lastError;
}
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        provider: "gemini",
        model: "gemini-3.6-flash",
        timestamp: new Date().toISOString(),
    });
});
app.post("/template", async (req, res) => {
    try {
        const prompt = req.body.prompt;
        if (!prompt) {
            res.status(400).json({ error: "Prompt is required" });
            return;
        }
        const model = genAI.getGenerativeModel({
            model: "gemini-3.6-flash",
            systemInstruction: "Return either node or react based on what you think the project should be. Only return a single word either 'node' or 'react'. Do not return anything extra.",
        });
        const result = await callWithRetry("template-classification", () => model.generateContent(prompt));
        const content = result.response.text();
        console.log("Gemini Template raw response:", content);
        const answer = content.trim().toLowerCase().replace(/[^a-z]/g, "");
        console.log("Extracted answer:", answer);
        if (answer.includes("react")) {
            res.json({
                prompts: [
                    BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\n You should ALWAYS CONSIDER all the files.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [reactBasePrompt],
            });
            return;
        }
        if (answer.includes("node")) {
            res.json({
                prompts: [
                    `Here is an artifact that contains all files of the project visible to you.\n You should ALWAYS CONSIDER all the files. \nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [nodeBasePrompt],
            });
            return;
        }
        // Default fallback to react if ambiguous
        res.json({
            prompts: [
                BASE_PROMPT,
                `Here is an artifact that contains all files of the project visible to you.\n You should ALWAYS CONSIDER all the files.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
            ],
            uiPrompts: [reactBasePrompt],
        });
    }
    catch (err) {
        console.error("Unexpected error in /template:", err);
        res.status(500).json({
            error: "Unexpected error occurred",
            details: err?.message || String(err),
        });
    }
});
export function formatMessagesForGemini(messages) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return [];
    }
    const formatted = [];
    for (const msg of messages) {
        const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
        const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        if (!text || text.trim() === "")
            continue;
        const last = formatted[formatted.length - 1];
        if (last && last.role === role) {
            last.parts.push({ text });
        }
        else {
            formatted.push({
                role,
                parts: [{ text }],
            });
        }
    }
    return formatted;
}
app.post("/chat", async (req, res) => {
    try {
        const messages = req.body.messages || [];
        const isStreaming = req.body.stream !== false;
        const contents = formatMessagesForGemini(messages);
        if (contents.length === 0) {
            res.status(400).json({ error: "Messages array is required and cannot be empty" });
            return;
        }
        const model = genAI.getGenerativeModel({
            model: "gemini-3.6-flash",
            systemInstruction: getSystemPrompt(),
        });
        if (isStreaming) {
            const streamResult = await callWithRetry("chat-stream-init", () => model.generateContentStream({ contents }));
            // Set SSE headers after stream initializes successfully
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders?.();
            let fullResponse = "";
            for await (const chunk of streamResult.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    fullResponse += chunkText;
                    const payload = JSON.stringify({
                        chunk: chunkText,
                        choices: [
                            {
                                delta: { content: chunkText },
                            },
                        ],
                    });
                    res.write(`data: ${payload}\n\n`);
                }
            }
            console.log("Gemini Streamed Chat Response length:", fullResponse.length);
            res.write("data: [DONE]\n\n");
            res.end();
            return;
        }
        // Non-streaming fallback
        const result = await callWithRetry("chat-generate", () => model.generateContent({ contents }));
        const responseText = result.response.text();
        console.log("Gemini Chat Response length:", responseText.length);
        res.json({
            response: responseText,
            choices: [
                {
                    message: {
                        role: "assistant",
                        content: responseText,
                    },
                },
            ],
        });
    }
    catch (err) {
        console.error("Unexpected error in /chat:", err);
        const isRateLimit = String(err?.message || "").includes("429") || String(err?.message || "").includes("quota") || String(err?.message || "").includes("Too Many Requests");
        const statusCode = isRateLimit ? 429 : 500;
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: err?.message || String(err), isRateLimit })}\n\n`);
            res.end();
        }
        else {
            res.status(statusCode).json({
                error: isRateLimit ? "Gemini API rate limit reached. Please wait a moment and try again." : "Unexpected error occurred",
                details: err?.message || String(err),
            });
        }
    }
});
const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
        console.error(`To resolve this:\n1. Stop the process currently running on port ${PORT}\n2. Or set a different port in your .env (e.g. PORT=3001)\n`);
    }
    else {
        console.error("Server error:", err);
    }
    process.exit(1);
});
// Clean shutdown listeners
process.on("SIGINT", () => {
    console.log("\nShutting down server gracefully...");
    server.close(() => {
        process.exit(0);
    });
});
process.on("SIGTERM", () => {
    console.log("\nShutting down server gracefully...");
    server.close(() => {
        process.exit(0);
    });
});
