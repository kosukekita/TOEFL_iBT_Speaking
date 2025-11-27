"use client";

import { useState, useRef, useEffect } from "react";
import { AudioRecorder, AudioRecorderRef } from "@/components/AudioRecorder";
import { ChatInterface } from "@/components/ChatInterface";
import { Timer } from "@/components/Timer";
import { Message } from "@/types";
import { Send, Upload, Music, X, RefreshCcw, MessageSquare, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "input">("input");

  // --- Preparation Timer State ---
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationTime, setPreparationTime] = useState(25);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Section 1: Question Input State ---
  const [questionText, setQuestionText] = useState("");
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);

  // --- Section 2: Audio Response State ---
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // --- Timer State ---
  const [showTimer, setShowTimer] = useState(false);
  const [timerConfig] = useState({ prep: 15, answer: 45 });
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const audioRecorderRef = useRef<AudioRecorderRef>(null);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-switch to chat tab on submit
  useEffect(() => {
    if (isLoading) {
      setActiveTab("chat");
    }
  }, [isLoading]);

  // Preparation Timer Logic
  useEffect(() => {
    if (isPreparing) {
      prepTimerRef.current = setInterval(() => {
        setPreparationTime((prev) => {
          if (prev <= 1) {
            // Timer finished
            if (prepTimerRef.current) clearInterval(prepTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    }

    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [isPreparing]);

  // Trigger recording when preparation time ends
  useEffect(() => {
    if (isPreparing && preparationTime === 0) {
      setIsPreparing(false);
      // Start recording via ref
      audioRecorderRef.current?.startRecording();
    }
  }, [isPreparing, preparationTime]);

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
      
      // Start preparation timer automatically
      setPreparationTime(25);
      setIsPreparing(true);
      
    } catch (error: any) {
      console.error("[Client] Error generating question:", error);
      alert(`Error: ${error.message}\n\nFallback to manual input.`);
      setQuestionText("");
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleCancelPreparation = () => {
    setIsPreparing(false);
    setPreparationTime(25);
  };

  const handleSkipPreparation = () => {
    setIsPreparing(false);
    setPreparationTime(0); // Trigger recording immediately
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
    const hasQuestion = questionText.trim() || questionFiles.length > 0;
    const hasAudio = !!audioFile;

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

      // Only clear audio file after successful send, keep question intact
      setAudioFile(null);

    } catch (error: any) {
      console.error("[Client] Error:", error);
      alert(`Error: ${error.message}\n\nCheck the console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden relative">
      {/* Header */}
      <header className="flex-none p-4 bg-white border-b shadow-sm z-10">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-900">TOEFL iBT Speaking Coach</h1>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">Powered by Gemini 2.5 Flash</div>
          </div>
        </div>
      </header>


      {/* Main Content Area - Split into Chat and Controls */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-[1400px] mx-auto relative">
        
        {/* Left/Top: Chat History */}
        <div className={cn(
          "flex-1 flex-col min-h-0 relative border-r border-gray-200 bg-white",
          // Mobile: Only show if activeTab is 'chat'
          activeTab === "chat" ? "flex" : "hidden",
          // Desktop: Always show
          "md:flex"
        )}>
            <div 
                ref={chatContainerRef}
                className="absolute inset-0 overflow-y-auto p-4 md:p-6 scroll-smooth"
            >
                <ChatInterface messages={messages} isLoading={isLoading} />
            </div>
            
            {/* Timer Overlay - Only covers chat area */}
            {showTimer && (
              <Timer
                answerTime={timerConfig.answer}
                onComplete={() => {
                  setShowTimer(false);
                  // Stop recording when timer completes
                  if (stopRecordingRef.current) {
                    stopRecordingRef.current();
                  }
                }}
                onCancel={() => setShowTimer(false)}
                taskNumber={1}
              />
            )}
        </div>

        {/* Right/Bottom: Input Controls */}
        <div className={cn(
          "flex-none md:w-[400px] bg-gray-100 p-4 flex flex-col gap-6 overflow-y-auto shadow-inner pb-[140px] md:pb-4",
          // Mobile: Only show if activeTab is 'input'
          activeTab === "input" ? "flex" : "hidden",
          // Desktop: Always show
          "md:flex"
        )}>
            
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
                            disabled={isGeneratingQuestion || isPreparing}
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
                            disabled={isPreparing}
                            className="flex flex-col items-center justify-center gap-2 py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg hover:from-gray-100 hover:to-gray-200 text-gray-700 font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
                    
                    {/* Clear button */}
                    {(questionText || questionFiles.length > 0) && (
                        <button
                            onClick={() => {
                                setQuestionText("");
                                setQuestionFiles([]);
                            }}
                            className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <X size={16} />
                            問題文をクリア
                        </button>
                    )}
                    
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

                {/* Preparation Timer - Inline display */}
                {isPreparing && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl font-bold text-amber-600 tabular-nums w-12 text-center">
                                    {preparationTime}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">準備時間</p>
                                    <p className="text-xs text-amber-600">録音が自動で開始されます</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancelPreparation}
                                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-white/50 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSkipPreparation}
                                    className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors shadow"
                                >
                                    Start Now
                                </button>
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-3 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                                style={{ width: `${(preparationTime / 25) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

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
                                    ref={audioRecorderRef}
                                    onAudioCaptured={setAudioFile}
                                    onStartRecording={() => setShowTimer(true)}
                                    onStopRecordingRef={stopRecordingRef}
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
                                    disabled={isPreparing}
                                    className="flex flex-col items-center justify-center gap-2 py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg hover:from-gray-100 hover:to-gray-200 text-gray-700 font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Submit Action - Hidden on mobile, shown on desktop */}
            <button
                onClick={handleSendMessage}
                disabled={isLoading || (!questionText && questionFiles.length === 0 && !audioFile) || isPreparing}
                className="hidden md:flex w-full py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center gap-2"
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

      {/* Mobile Submit Button - Fixed above tab navigation */}
      <div className={cn(
        "flex md:hidden fixed left-0 right-0 bottom-[60px] px-4 py-2 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent z-40",
        activeTab === "input" ? "block" : "hidden"
      )}>
        <button
          onClick={handleSendMessage}
          disabled={isLoading || (!questionText && questionFiles.length === 0 && !audioFile) || isPreparing}
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

      {/* Mobile Tab Navigation */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50 safe-area-bottom">
        <button
          onClick={() => setActiveTab("input")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors",
            activeTab === "input" ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <PenTool size={20} />
          <span>Input</span>
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors relative",
            activeTab === "chat" ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <MessageSquare size={20} />
          <span>Chat</span>
          {messages.length > 0 && (
            <span className="absolute top-2 right-[35%] w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>
    </main>
  );
}