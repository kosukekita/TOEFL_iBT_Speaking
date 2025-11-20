"use client";

import { useState, useRef, useEffect } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ChatInterface } from "@/components/ChatInterface";
import { Message } from "@/types";
import { Send, Upload, FileText, Image as ImageIcon, Music, X, RefreshCcw, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // --- Section 1: Question Input State ---
  const [questionText, setQuestionText] = useState("");
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);

  // --- Section 2: Audio Response State ---
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUserEmail(session.user.email || null);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      } else if (session) {
        setUserEmail(session.user.email || null);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleGenerateQuestion = async () => {
    if (isGeneratingQuestion) return;
    
    setIsGeneratingQuestion(true);
    setQuestionText("生成中...");
    
    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setQuestionText(data.question);
    } catch (error: any) {
      console.error("[Client] Error generating question:", error);
      alert(`Error: ${error.message}\n\nFallback to manual input.`);
      setQuestionText("");
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleQuestionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setQuestionFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (questionInputRef.current) questionInputRef.current.value = "";
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const removeQuestionFile = (index: number) => {
    setQuestionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    // Validation: Must have at least (Question Text OR Question File) AND (Audio File)
    // OR if it's a follow-up chat, just text is fine.
    // Let's allow flexible usage but prioritize the structure.
    
    const hasQuestion = questionText.trim() || questionFiles.length > 0;
    const hasAudio = !!audioFile;
    const isFollowUp = messages.length > 0;

    if (!hasQuestion && !hasAudio && !questionText.trim()) return;
    if (isLoading) return;

    setIsLoading(true);

    // Create display object
    const displayQuestionFiles = questionFiles.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type
    }));
    const displayAudioUrl = audioFile ? URL.createObjectURL(audioFile) : undefined;

    const userMessage: Message = {
      role: "user",
      parts: [],
      display: {
        text: questionText,
        imageUrl: displayQuestionFiles.find(f => f.type.startsWith('image/'))?.url,
        audioUrl: displayAudioUrl
      }
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const formData = new FormData();
    formData.append("message", questionText);
    
    // History
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.display?.text || "" }]
    }));
    formData.append("history", JSON.stringify(history));

    // Append files
    questionFiles.forEach(f => formData.append("files", f));
    if (audioFile) {
      formData.append("files", audioFile);
    }

    try {
      console.log("[Client] Sending request to /api/chat");
      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      console.log("[Client] Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("[Client] Error response:", errorData);
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("[Client] Response received");
      
      if (!data.text) {
        throw new Error("No text in response");
      }

      const botMessage: Message = {
        role: "model",
        parts: [{ text: data.text }],
        display: { text: data.text }
      };

      setMessages([...newMessages, botMessage]);

      // Clear inputs after successful send
      setQuestionText("");
      setQuestionFiles([]);
      setAudioFile(null);

    } catch (error: any) {
      console.error("[Client] Error:", error);
      alert(`Error: ${error.message}\n\nCheck the console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="flex-none p-4 bg-white border-b shadow-sm z-10">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-900">TOEFL iBT Speaking Coach</h1>
          <div className="flex items-center gap-4">
            {userEmail && (
              <div className="text-sm text-gray-600">
                {userEmail}
              </div>
            )}
            <div className="text-xs text-gray-500">Powered by Gemini 2.5 Flash</div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Split into Chat and Controls */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-[1400px] mx-auto">
        
        {/* Left/Top: Chat History */}
        <div className="flex-1 flex flex-col min-h-0 relative border-r border-gray-200 bg-white">
            <div 
                ref={chatContainerRef}
                className="absolute inset-0 overflow-y-auto p-4 md:p-6 scroll-smooth"
            >
                <ChatInterface messages={messages} isLoading={isLoading} />
            </div>
        </div>

        {/* Right/Bottom: Input Controls */}
        <div className="flex-none md:w-[400px] bg-gray-100 p-4 flex flex-col gap-6 overflow-y-auto shadow-inner">
            
            {/* Section 1: Question */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">1</span>
                    Question
                </h2>
                
                <div className="relative mb-3">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Left: Generate Question Button */}
                        <button 
                            onClick={handleGenerateQuestion}
                            disabled={isGeneratingQuestion}
                            className="flex flex-col items-center justify-center gap-2 py-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 text-blue-700 font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCcw size={24} className={cn(isGeneratingQuestion && "animate-spin")} />
                            <span className="text-sm">
                                {isGeneratingQuestion ? "生成中..." : "Generate Question"}
                            </span>
                        </button>
                        
                        {/* Right: Upload Image */}
                        <button 
                            onClick={() => questionInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-2 py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg hover:from-gray-100 hover:to-gray-200 text-gray-700 font-medium transition-all shadow-sm hover:shadow"
                        >
                            <Upload size={24} />
                            <span className="text-sm">画像をアップロード</span>
                        </button>
                        <input
                            type="file"
                            multiple
                            ref={questionInputRef}
                            className="hidden"
                            accept="image/*,text/*,.pdf"
                            onChange={handleQuestionFileSelect}
                        />
                    </div>
                    
                    {/* "または" Badge */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full text-xs font-semibold text-gray-600 border-2 border-gray-300 shadow-md">
                        または
                    </div>
                </div>
                
                {/* Question Text Area */}
                <div className="space-y-2">
                    <textarea
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="問題文がここに表示されます（または直接入力）..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[180px] resize-none"
                    />
                    
                    {/* File List */}
                    {questionFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {questionFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border text-xs max-w-full">
                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                    <button onClick={() => removeQuestionFile(i)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Your Response */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">2</span>
                    Your Response
                </h2>

                <div className="space-y-4">
                     {/* Audio File State */}
                    {audioFile ? (
                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Music size={20} className="text-green-600 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-green-900 truncate">{audioFile.name}</span>
                                    <span className="text-xs text-green-700">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                            <button onClick={() => setAudioFile(null)} className="p-1 hover:bg-green-200 rounded text-green-700">
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="grid grid-cols-2 gap-4">
                                 <AudioRecorder 
                                    onAudioCaptured={setAudioFile} 
                                    className="justify-center bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border-2 border-red-200 text-red-700 py-6 rounded-lg font-medium transition-all shadow-sm hover:shadow" 
                                 />
                                 
                                 <input
                                    type="file"
                                    ref={audioInputRef}
                                    className="hidden"
                                    accept="audio/*"
                                    onChange={handleAudioFileSelect}
                                 />
                                 <button 
                                    onClick={() => audioInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-2 py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg hover:from-gray-100 hover:to-gray-200 text-gray-700 font-medium transition-all shadow-sm hover:shadow"
                                 >
                                    <Upload size={24} />
                                    <span className="text-sm">Upload Audio</span>
                                </button>
                            </div>
                            
                            {/* "または" Badge */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full text-xs font-semibold text-gray-600 border-2 border-gray-300 shadow-md">
                                または
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Action */}
            <button
                onClick={handleSendMessage}
                disabled={isLoading || (!questionText && questionFiles.length === 0 && !audioFile)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <span className="animate-pulse">Analyzing...</span>
                ) : (
                    <>
                        <Send size={18} />
                        <span>Submit for Grading</span>
                    </>
                )}
            </button>

        </div>
      </div>
    </main>
  );
}
