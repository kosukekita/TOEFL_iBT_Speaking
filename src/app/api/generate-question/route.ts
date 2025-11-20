import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in .env");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: Request) {
  try {
    console.log("[API] Received request to /api/generate-question");
    
    // Use high temperature for more diverse questions
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 1.5,
        topP: 0.95,
        topK: 40,
      }
    });

    const prompt = `Generate a TOEFL iBT Speaking Independent Task (Task 1) question in English.

Requirements:
- The question should be about everyday topics, personal preferences, or opinions
- Should be answerable in 45 seconds
- Should encourage the test-taker to give reasons and examples
- Use clear, natural English
- Vary the format: preferences, agree/disagree, or open-ended questions

Examples of good questions:
- "Some people prefer to live in a big city. Others prefer to live in a small town. Which do you prefer and why?"
- "Do you agree or disagree with the following statement? Technology has made people less social."
- "What is the most important quality in a good friend? Use specific reasons and examples."

Generate ONE unique question now. Output ONLY the question text, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const question = response.text().trim();

    console.log("[API] Generated question:", question.substring(0, 50) + "...");
    
    return NextResponse.json({ question });
  } catch (error: any) {
    console.error("[API] Error in generate-question API:", error);
    console.error("[API] Error stack:", error.stack);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      details: error.toString()
    }, { status: 500 });
  }
}

