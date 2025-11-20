"use client";

import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatInterface({ messages, isLoading }: ChatInterfaceProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg min-h-[300px] max-h-[600px] overflow-y-auto border border-gray-200">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 mt-10">
          <p>Upload a question and your answer to get started.</p>
          <p className="text-xs mt-2">Supported: Text, Images, Audio</p>
        </div>
      )}
      
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={cn(
            "flex gap-3 max-w-[90%] md:max-w-[80%]",
            msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            msg.role === "user" ? "bg-blue-500 text-white" : "bg-green-600 text-white"
          )}>
            {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
          </div>
          
          <div className={cn(
            "p-3 rounded-lg text-sm overflow-hidden",
            msg.role === "user" ? "bg-blue-50 text-gray-800" : "bg-white border border-gray-200 shadow-sm"
          )}>
            {/* Display attachments if any */}
            {msg.display?.imageUrl && (
              <div className="mb-2">
                <img src={msg.display.imageUrl} alt="Question" className="max-w-full h-auto rounded max-h-60 object-contain" />
              </div>
            )}
            {msg.display?.audioUrl && (
              <div className="mb-2">
                <audio src={msg.display.audioUrl} controls className="w-full min-w-[200px]" />
              </div>
            )}
            
            {/* Display text */}
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-bold prose-li:my-1">
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => (
                    <h2 
                      className="text-base font-bold bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 px-3 py-2 rounded-r mt-6 mb-3 first:mt-0"
                      {...props} 
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 
                      className="text-sm font-semibold bg-gray-50 border-l-3 border-gray-400 px-2 py-1 rounded-r mt-4 mb-2"
                      {...props} 
                    />
                  ),
                }}
              >
                {msg.display?.text || ""}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="self-start flex gap-3 max-w-[80%]">
           <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
             <Bot size={16} />
           </div>
           <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
             <div className="flex gap-1 h-5 items-center">
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

