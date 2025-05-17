"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const generative_ai_1 = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: "What is Machine Learning" }] }
            ]
        });
        const result = yield chat.sendMessage("Summarize everything in one sentence.");
        const response = yield result.response;
        console.log(response.text());
    });
}
main();
