import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in .env");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// Use gemini-1.5-flash for fast, multimodal capabilities
export const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

