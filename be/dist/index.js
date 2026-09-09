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
function getGenAI() {
    const key = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
    if (!key) {
        throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }
    return new GoogleGenerativeAI(key);
}
const PORT = process.env.PORT || 3000;
// High-performance candidate models pool with individual quota buckets
const CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
];
const app = express();
app.use(express.json());
app.use(cors());
// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Helper to extract retry delay in seconds from Gemini error messages
function extractRetryDelaySeconds(err) {
    const errMsg = String(err?.message || err);
    const matchSeconds = errMsg.match(/retry in ([0-9.]+)s/i) ||
        errMsg.match(/retryDelay["']?:\s*["']?([0-9.]+)s?/i) ||
        errMsg.match(/Retry after ([0-9.]+) seconds/i);
    if (matchSeconds) {
        return Math.ceil(parseFloat(matchSeconds[1])) || 30;
    }
    return 30;
}
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        provider: "gemini",
        models: CANDIDATE_MODELS,
        timestamp: new Date().toISOString(),
    });
});
/**
 * Fast project classification with heuristic detection to conserve API quotas
 */
app.post("/template", async (req, res) => {
    const prompt = (req.body.prompt || "").trim().toLowerCase();
    let answer = "react";
    if (prompt) {
        if (prompt.includes("node") ||
            prompt.includes("express") ||
            prompt.includes("backend only") ||
            prompt.includes("api server") ||
            prompt.includes("cli")) {
            answer = "node";
        }
        else {
            answer = "react";
        }
    }
    console.log(`[Template Endpoint] Classified project for prompt "${prompt.slice(0, 40)}..." as: ${answer}`);
    if (answer === "node") {
        res.json({
            prompts: [
                `Here is an artifact that contains all files of the project visible to you.\n You should ALWAYS CONSIDER all the files. \nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
            ],
            uiPrompts: [nodeBasePrompt],
        });
        return;
    }
    // Default to React
    res.json({
        prompts: [
            BASE_PROMPT,
            `Here is an artifact that contains all files of the project visible to you.\n You should ALWAYS CONSIDER all the files.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
    });
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
/**
 * Execute Gemini Stream with Multi-Model Quota and Error Failover Pool
 */
async function executeStreamWithFailover(contents, onChunk) {
    let lastError;
    const genAI = getGenAI();
    for (const modelName of CANDIDATE_MODELS) {
        try {
            console.log(`[Gemini Stream] Connecting stream with candidate: ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: getSystemPrompt(),
            });
            const streamResult = await model.generateContentStream({ contents });
            let streamLength = 0;
            for await (const chunk of streamResult.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    streamLength += chunkText.length;
                    onChunk(chunkText);
                }
            }
            if (streamLength > 0) {
                console.log(`[Gemini Stream] Completed stream with ${modelName}. Output length: ${streamLength}`);
                return { modelName, totalLength: streamLength };
            }
        }
        catch (err) {
            lastError = err;
            const errMsg = String(err?.message || err);
            console.warn(`[Gemini Stream Failover] Candidate ${modelName} encountered error: ${errMsg.slice(0, 160)}`);
            console.log(`[Gemini Stream Failover] Cascading to next candidate model in pool...`);
            continue;
        }
    }
    throw lastError || new Error("All candidate Gemini models in pool failed to stream response.");
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
        if (isStreaming) {
            // Establish SSE stream immediately to avoid Vercel 504 Gateway Timeout
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders?.();
            // Send initial handshake byte immediately so gateway response is finalized
            res.write(": stream-init\n\n");
            // Heartbeat to prevent edge proxy idle timeout while Gemini prepares output
            const heartbeat = setInterval(() => {
                if (!res.writableEnded) {
                    res.write(": keep-alive\n\n");
                }
            }, 2500);
            try {
                const { modelName, totalLength } = await executeStreamWithFailover(contents, (chunkText) => {
                    const payload = JSON.stringify({
                        chunk: chunkText,
                        choices: [
                            {
                                delta: { content: chunkText },
                            },
                        ],
                    });
                    res.write(`data: ${payload}\n\n`);
                });
                console.log(`[Gemini Stream] Finished stream from ${modelName}. Total length: ${totalLength}`);
                clearInterval(heartbeat);
                res.write("data: [DONE]\n\n");
                res.end();
                return;
            }
            catch (streamErr) {
                clearInterval(heartbeat);
                throw streamErr;
            }
        }
        // Non-streaming fallback with model failover
        let nonStreamResponse = "";
        let usedModel = "";
        let lastErr;
        const genAI = getGenAI();
        for (const modelName of CANDIDATE_MODELS) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: getSystemPrompt(),
                });
                const result = await model.generateContent({ contents });
                nonStreamResponse = result.response.text();
                usedModel = modelName;
                break;
            }
            catch (err) {
                lastErr = err;
                console.warn(`[Gemini Failover non-stream] Model ${modelName} failed, trying next...`);
            }
        }
        if (!nonStreamResponse) {
            throw lastErr || new Error("All candidate Gemini models failed to generate content.");
        }
        res.json({
            model: usedModel,
            response: nonStreamResponse,
            choices: [
                {
                    message: {
                        role: "assistant",
                        content: nonStreamResponse,
                    },
                },
            ],
        });
    }
    catch (err) {
        console.error("Unexpected error in /chat:", err);
        const errMsg = String(err?.message || err);
        const isRateLimit = errMsg.includes("429") ||
            errMsg.includes("quota") ||
            errMsg.includes("Resource has been exhausted") ||
            errMsg.includes("Too Many Requests");
        const isMissingKey = errMsg.includes("Missing GEMINI_API_KEY") || !process.env.GEMINI_API_KEY;
        const isApiKeyInvalid = errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID");
        const retryDelay = isRateLimit ? extractRetryDelaySeconds(err) : 10;
        const statusCode = isRateLimit ? 429 : 500;
        let userFriendlyError = "Unexpected error occurred during generation.";
        if (isRateLimit) {
            userFriendlyError = `Gemini API rate limit reached. All model pools exhausted. Auto-retry in ${retryDelay}s.`;
        }
        else if (isMissingKey) {
            userFriendlyError = "Missing GEMINI_API_KEY in environment variables. Please configure GEMINI_API_KEY in Vercel Project Settings > Environment Variables, then redeploy.";
        }
        else if (isApiKeyInvalid) {
            userFriendlyError = "Invalid GEMINI_API_KEY provided. Please check your API key in Google AI Studio and update it in Vercel Environment Variables.";
        }
        else if (errMsg) {
            userFriendlyError = `Generation error: ${errMsg}`;
        }
        const errorPayload = {
            error: userFriendlyError,
            details: errMsg,
            isRateLimit,
            retryDelay,
        };
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
            res.end();
        }
        else {
            res.status(statusCode).json(errorPayload);
        }
    }
});
if (!process.env.VERCEL) {
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
}
export { app };
export default app;
