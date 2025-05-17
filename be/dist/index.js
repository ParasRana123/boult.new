import { config } from "dotenv";
config();
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
async function main() {
    const { default: fetch } = await import("node-fetch");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that writes clean and bug-free code.",
                },
                {
                    role: "user",
                    content: "Write the code for a TODO application",
                },
                {
                    role: "user",
                    content: "Fix all the errors that could possibly come.",
                },
            ],
        }),
    });
    if (!response.ok) {
        console.error(`Error ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.error(errorText);
        return;
    }
    const data = (await response.json());
    const message = data.choices?.[0]?.message?.content;
    console.log("Response from GROQ:");
    console.log(message);
}
main();
