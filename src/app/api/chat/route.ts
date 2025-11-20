import { model } from "@/lib/gemini";
import { fileToGenerativePart } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("[API] Received request to /api/chat");
    
    const formData = await req.formData();
    const message = formData.get("message") as string;
    const historyStr = formData.get("history") as string;
    const files = formData.getAll("files") as File[];

    console.log("[API] Message:", message?.substring(0, 50));
    console.log("[API] Files count:", files.length);

    let history = [];
    if (historyStr) {
      try {
        history = JSON.parse(historyStr);
      } catch (e) {
        console.error("[API] Failed to parse history", e);
      }
    }

    // Prepare the current prompt parts
    const promptParts: any[] = [];
    
    // Add text message if exists (Question text or user instructions)
    if (message) {
      promptParts.push(`Task/Question Text: ${message}`);
    }

    // Add files if exist
    if (files && files.length > 0) {
      console.log("[API] Processing files...");
      for (const file of files) {
        console.log("[API] File:", file.name, file.type, file.size);
        const part = await fileToGenerativePart(file);
        promptParts.push(part);
      }
    }

    let finalPrompt = promptParts;
    
    // If no history, treat this as a new grading request
    if (history.length === 0) {
       const systemPrompt = `You are an expert TOEFL iBT Speaking examiner. 
Your task is to evaluate the user's spoken response against the provided question/task.

Input Context:
- The user may provide the Question/Task as text or an image (OCR this image to understand the task).
- The user will provide their Response as an audio file.
- This is TOEFL iBT Speaking Independent Task (Task 1): Response time is 45 seconds, expected word count is 85-100 words.

Instructions:
1. Identify the Task from the text or image provided.
2. Listen to the Audio Response carefully.
3. Provide a score (0-4) based on official TOEFL iBT Speaking rubrics.
4. Consider the 45-second time limit and 85-100 word target when evaluating completeness and development.
5. Provide detailed feedback structure IN JAPANESE (日本語で出力してください). Use Markdown headers and separate sections clearly.

   Format requirement:
   
   ## 📊 スコア: [X.X]/4.0

   ## 💬 総評 (General Feedback)
   Brief summary of performance.

   ## 🗣️ 話し方 (Delivery)
   Pronunciation, intonation, flow, pacing.

   ## 📝 言語使用 (Language Use)
   Grammar, vocabulary variety and accuracy.

   ## 🎯 話題の展開 (Topic Development)
   Coherence, progression of ideas, completeness relative to the task.

   ## ✨ 改善された回答例 (Sample Better Response)
   Provide an improved version of the USER'S ACTUAL RESPONSE that achieves a high score (3.5-4.0).
   
   **CRITICAL REQUIREMENTS:**
   1. **Base structure on user's response**: Keep the user's main topic, story, and general approach
   2. **Expand to proper length**: Ensure 85-100 words (TOEFL requirement). If user's response is shorter:
      - Add specific details and examples to support their points
      - Elaborate on reasons with "because..." or "for example..."
      - Add a concluding sentence that summarizes or reinforces the main idea
   3. **Improve completeness**: If user's answer lacks development, add:
      - Specific examples or personal experiences
      - Clear reasons with supporting details
      - Better topic development while staying on their theme
   4. **Fix errors naturally**: Correct grammar, articles, prepositions, word choice
   5. **Use simple, accessible language**:
      - Basic sentence structures (Simple Present, Simple Past, Present Perfect)
      - Common everyday words (avoid "crucial" → use "important"; avoid "facilitate" → use "help")
      - Short, clear sentences
      - Minimal phrasal verbs or idioms
      - Target: CEFR A2-B1 (elementary to intermediate)
   6. **Maintain user's voice and ideas**: Should sound like the user speaking more fluently and completely, not a different person's response
   7. **Word count**: Display word count at the end like "(約XX語)" to show it meets the 85-100 target

IMPORTANT: 
- All feedback and explanations must be in Japanese.
- Use "##" (H2) for section headers with emoji icons as shown above.
- Insert empty lines between sections for readability.
- The sample response must be simple enough for English beginners to actually use.

If the input is just text/chat without audio/task context, simply answer the user's question about TOEFL speaking in Japanese.`;
       
       if (typeof finalPrompt[0] === 'string') {
         finalPrompt[0] = systemPrompt + "\n\n" + finalPrompt[0];
       } else {
         finalPrompt.unshift(systemPrompt);
       }
    }

    console.log("[API] Sending to Gemini...");
    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("[API] Response received, length:", text.length);
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("[API] Error in chat API:", error);
    console.error("[API] Error stack:", error.stack);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      details: error.toString()
    }, { status: 500 });
  }
}
