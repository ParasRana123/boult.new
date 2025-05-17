require("dotenv").config();
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

async function main() {
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: "What is Machine Learning" }] }
    ]
  });

  const result = await chat.sendMessage("Summarize everything in one sentence.");
  const response = await result.response;

  console.log(response.text());
}

main();