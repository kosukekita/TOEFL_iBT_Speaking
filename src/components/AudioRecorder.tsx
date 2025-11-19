"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onAudioCaptured: (file: File | null) => void;
  className?: string;
}

export function AudioRecorder({ onAudioCaptured, className }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        onAudioCaptured(file);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // If recorded, the parent component handles the display via onAudioCaptured state, 
  // but this component can also show a simple "Recorded" state if needed.
  // For this new UI, once recorded, the parent hides this component or shows the file.
  // So we mainly focus on the "Ready to Record" and "Recording" states.

  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors", className)} onClick={!isRecording ? startRecording : undefined}>
      {isRecording ? (
        <div className="flex flex-col items-center w-full" onClick={(e) => e.stopPropagation()}>
             <div className="text-sm font-mono font-bold mb-1 animate-pulse">{formatDuration(recordingDuration)}</div>
             <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm text-sm"
              >
                <Square size={14} fill="currentColor" />
                <span>Stop</span>
              </button>
        </div>
      ) : (
        <>
            <Mic size={20} />
            <span className="text-sm font-medium">Record</span>
        </>
      )}
    </div>
  );
}
