export interface Message {
  role: "user" | "model";
  parts: { text?: string; inlineData?: any }[];
  // For UI display only
  display?: {
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
  };
}

