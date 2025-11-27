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
- Should be answerable in 45 seconds (85-100 words)
- Should encourage the test-taker to give reasons and examples
- Use clear, natural English

Question Format (choose randomly):
1. Preference comparison: "Some people [X]. Others [Y]. Which do you prefer and why?"
2. Agreement/disagreement: "Do you agree or disagree with the following statement? [statement]"
3. Open-ended: "What is [superlative] [topic]? Use specific reasons and examples."
4. Choice explanation: "If you could [action], what/where/who would you choose and why?"
5. Personal opinion: "Is it better to [option A] or [option B]? Explain your preference."

Topic Categories (choose diverse topics):
- Education: studying methods, learning styles, classroom vs online, subjects
- Lifestyle: city vs countryside, living alone vs roommates, work-life balance
- Technology: social media, smartphones, online shopping, digital communication
- Relationships: friendship qualities, family time, meeting new people
- Entertainment: movies vs books, indoor vs outdoor activities, hobbies
- Work: career choices, job satisfaction, teamwork vs individual work
- Health: exercise habits, diet, stress management
- Travel: vacation preferences, exploring vs relaxing, domestic vs international
- Environment: sustainability, public transportation, recycling
- Personal growth: risk-taking, learning from mistakes, setting goals
- Time management: planning vs spontaneity, morning vs night person
- Money: saving vs spending, experiences vs possessions
- Communication: face-to-face vs digital, expressing opinions
- Culture: traditions, celebrations, cultural diversity

Generate ONE completely unique and creative question now. 
Be creative and avoid common patterns.
Output ONLY the question text, nothing else.`;

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

