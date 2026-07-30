import { apiPost } from './api';
import type { VenueItem } from './venues';

export interface ChatbotRequest {
  message: string;
  chat_history?: Array<{ role: 'user' | 'assistant'; message: string }>;
  conversation_context?: Record<string, unknown> | null;
}

export interface ChatbotResponse {
  response: string;
  model: string;
  conversation_context?: Record<string, unknown>;
  follow_up_question?: string | null;
  venues?: VenueItem[];
}

export async function sendChatMessage(payload: ChatbotRequest, token?: string): Promise<ChatbotResponse> {
  return apiPost<ChatbotResponse>('/api/chatbot/recommend', payload, token);
}
