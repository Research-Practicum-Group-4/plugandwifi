// ============================================
// AI Chatbot API — interface reserved for backend
// When backend POST /api/chat is ready, uncomment
// and point BASE_URL to your API server.
// ============================================

// const BASE_URL = 'https://api.plugandwifi.xyz';

export interface ChatRequest {
  message: string;
  user_id?: string;
  lat?: number;
  lon?: number;
}

export interface ChatResponse {
  reply: string;
}

// export async function sendChatMessage(
//   payload: ChatRequest,
//   token?: string,
// ): Promise<ChatResponse> {
//   const headers: Record<string, string> = { 'Content-Type': 'application/json' };
//   if (token) headers['Authorization'] = `Bearer ${token}`;
//   const res = await fetch(`${BASE_URL}/api/chat`, {
//     method: 'POST',
//     headers,
//     body: JSON.stringify(payload),
//   });
//   if (!res.ok) throw new Error('Chat request failed');
//   return res.json();
// }
