"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface TimerProps {
  answerTime: number; // seconds
  onComplete?: () => void;
  onCancel?: () => void;
  taskNumber?: number;
}

export function Timer({ answerTime, onComplete, onCancel, taskNumber = 1 }: TimerProps) {
  const [phase, setPhase] = useState<"answer" | "complete">("answer");
  const [timeLeft, setTimeLeft] = useState(answerTime);

  useEffect(() => {
    if (phase === "complete") {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPhase("complete");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, answerTime, onComplete]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (phase === "complete") {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40 flex flex-col items-center justify-center">
      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
        title="Cancel timer"
      >
        <X size={24} className="text-gray-700" />
      </button>

      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-12 max-w-3xl w-full mx-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Exam timer</h1>
          
          <div className="inline-block border-4 border-gray-900 px-8 py-3">
            <div className="text-lg md:text-xl font-semibold text-gray-700">
              RESPONSE TIME
            </div>
          </div>

          <div className="text-[80px] md:text-[140px] font-bold text-gray-900 leading-none tracking-tight">
            {formatTime(timeLeft)}
          </div>

          <div className="text-xl md:text-2xl text-gray-700">
            <div className="flex items-center justify-center gap-6">
              <span className="font-semibold">ANSWER:</span>
              <span>{answerTime} sec</span>
            </div>
          </div>

          <div className="text-lg md:text-xl text-gray-600 mt-6">
            For TOEFL Speaking Task {taskNumber}
          </div>
        </div>
      </div>
    </div>
  );
}

