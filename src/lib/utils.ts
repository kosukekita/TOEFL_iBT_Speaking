import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Server-side only function
export async function fileToGenerativePart(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  // Use native Buffer in Node.js environment
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  
  // Get proper mimeType - fallback to extension-based detection if browser doesn't provide it
  let mimeType = file.type;
  
  if (!mimeType || mimeType === 'application/octet-stream') {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      // Audio
      'm4a': 'audio/mp4',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
      // Documents
      'pdf': 'application/pdf',
      'txt': 'text/plain',
    };
    
    if (ext && mimeMap[ext]) {
      mimeType = mimeMap[ext];
    } else {
      // Default fallback for unknown types
      console.warn(`Unknown file type for ${file.name}, using image/jpeg as fallback`);
      mimeType = 'image/jpeg';
    }
  }
  
  return {
    inlineData: {
      data: base64,
      mimeType: mimeType,
    },
  };
}

