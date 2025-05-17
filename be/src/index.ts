import { config } from "dotenv";
import { Readable } from "stream";

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
      stream: true,
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

  if (!response.ok || !response.body) {
    console.error(`Error ${response.status}: ${response.statusText}`);
    const errorText = await response.text();
    console.error(errorText);
    return;
  }

  console.log("Streaming response from GROQ:\n");

  let buffer = "";

  const body = response.body as Readable;

  for await (const chunk of body) {
    buffer += chunk.toString("utf-8");

    const lines = buffer.split("\n").filter(line => line.trim() !== "");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.replace(/^data:\s*/, "");
        if (jsonStr === "[DONE]") {
          console.log("\n[Stream complete]");
          body.destroy();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            await new Promise(resolve => setTimeout(resolve, 50)); // ⏱️ Add delay here
            process.stdout.write(content);
          }
        } catch (err) {
          console.error("Error parsing JSON chunk:", err);
        }
      }
    }

    buffer = lines[lines.length - 1]?.endsWith("}") ? "" : lines[lines.length - 1];
  }

  console.log("\n[Stream ended]");
}

main();