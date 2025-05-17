require("dotenv").config();
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

async function main() {
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: "Write the code for a TODO application" }] }
    ]
  });

  const result = await chat.sendMessageStream("Write the code fixing all the errors that could possibly come.");
  for await (const chunk of result.stream) {
    process.stdout.write(chunk.text());
  }
//   const response = await result.response;
  

  console.log();
}

main();