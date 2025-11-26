"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Mic, Square, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AudioRecorderRef {
  startRecording: () => void;
  stopRecording: () => void;
}

interface AudioRecorderProps {
  onAudioCaptured: (file: File | null) => void;
  onStartRecording?: () => void;
  // We keep this for backward compatibility, but ref approach is preferred
  onStopRecordingRef?: React.MutableRefObject<(() => void) | null>;
  className?: string;
}

export const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(({ onAudioCaptured, onStartRecording, onStopRecordingRef, className }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RECORDING_TIME = 45; // 45 seconds

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;

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
      
      // Notify parent that recording started (to trigger timer)
      onStartRecording?.();
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop after 45 seconds
          if (newDuration >= MAX_RECORDING_TIME) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording
  }));

  useEffect(() => {
    // Legacy ref support
    if (onStopRecordingRef) {
      onStopRecordingRef.current = stopRecording;
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onStopRecordingRef]); // Removed startRecording/stopRecording from deps to avoid loop

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const remainingTime = MAX_RECORDING_TIME - recordingDuration;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors", className)} onClick={!isRecording ? startRecording : undefined}>
      {isRecording ? (
        <div className="flex flex-col items-center w-full gap-2" onClick={(e) => e.stopPropagation()}>
             <div className="flex flex-col items-center">
               <div className="text-xs text-gray-600 mb-1">残り時間</div>
               <div className={cn(
                 "text-3xl font-mono font-bold tabular-nums",
                 remainingTime <= 10 ? "text-red-600 animate-pulse" : "text-blue-600"
               )}>
                 {remainingTime}秒
               </div>
             </div>
             <button
                onClick={(e) => {
                  e.stopPropagation();
                  stopRecording();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm text-sm font-medium"
              >
                <Square size={16} fill="currentColor" />
                <span>停止</span>
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
});

AudioRecorder.displayName = "AudioRecorder";