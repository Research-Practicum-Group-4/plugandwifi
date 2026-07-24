import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router";
import {
  Gauge,
  Loader2,
  MapPin,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../../services/api";
import type {
  ChatbotConversationContext,
  ChatbotHistoryMessage,
  Venue,
} from "../../types/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  venues?: Venue[];
}

const normalizeMessageText = (text?: string | null) =>
  text?.trim().replace(/\s+/g, " ") ?? "";
const CHAT_HISTORY_WINDOW = 12;
const HISTORY_MESSAGE_MAX_CHARS = 1000;
const INITIAL_ASSISTANT_MESSAGE_ID = "chatbot-intro";

const createInitialAssistantMessage = (): Message => ({
  id: INITIAL_ASSISTANT_MESSAGE_ID,
  text: "I can help you find a workspace in Manhattan. Try “Find a quiet place near Times Square” or “I need somewhere with plugs.”",
  sender: "ai",
  timestamp: new Date(),
});

export const buildChatHistory = (
  messages: Message[],
): ChatbotHistoryMessage[] =>
  messages
    .filter((message) => message.id !== INITIAL_ASSISTANT_MESSAGE_ID)
    .slice(-CHAT_HISTORY_WINDOW)
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      message: message.text.slice(0, HISTORY_MESSAGE_MAX_CHARS),
    }));

export const getChatbotErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return "The chatbot could not complete that request. Please try again.";
  }

  if (!error.response) {
    return "The network connection failed. Check your connection and try again.";
  }

  const status = error.response.status;
  const detail =
    typeof error.response.data?.detail === "string"
      ? error.response.data.detail
      : "";

  if (status === 422) {
    return "That request is too long or invalid. Shorten it and try again.";
  }
  if (status === 429) {
    return "The chatbot request limit has been reached. Please wait a moment.";
  }
  if (status === 503 && detail.toLowerCase().includes("venue search")) {
    return "Venue search is temporarily unavailable. Please try again shortly.";
  }
  if (status >= 500) {
    return "The workspace assistant is temporarily unavailable. Please try again shortly.";
  }
  return "The chatbot could not complete that request. Please try again.";
};

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    createInitialAssistantMessage(),
  ]);
  const [conversationContext, setConversationContext] =
    useState<ChatbotConversationContext | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const newestMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    newestMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const resetConversation = () => {
    setMessages([createInitialAssistantMessage()]);
    setConversationContext(null);
    setInput("");
  };

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: userText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const chatHistory = buildChatHistory(messages);
      const data = await api.getChatbotReply(
        userText,
        chatHistory,
        conversationContext,
      );
      const normalizedResponse = normalizeMessageText(data.response);
      const normalizedFollowUp = normalizeMessageText(data.follow_up_question);
      const text =
        normalizedFollowUp && normalizedFollowUp !== normalizedResponse
          ? `${data.response}\n\n${data.follow_up_question}`
          : data.response;

      setConversationContext(data.conversation_context);
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          text,
          sender: "ai",
          timestamp: new Date(),
          venues: data.venues ?? [],
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          text: getChatbotErrorMessage(error),
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          className="size-14 cursor-pointer rounded-full bg-[#2f8a64] shadow-lg hover:bg-[#287858] sm:size-16"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Close workspace assistant" : "Open workspace assistant"}
        >
          {isOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 left-3 right-3 z-50 sm:bottom-24 sm:left-auto sm:right-6 sm:w-[410px]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="overflow-hidden shadow-2xl">
              <CardHeader className="bg-[#253c50] text-white">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-5" />
                    Workspace Assistant
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/15 hover:text-white"
                    onClick={resetConversation}
                    aria-label="Reset conversation"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[min(58vh,430px)] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div className="max-w-[88%] space-y-2">
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.sender === "user"
                                ? "bg-[#253c50] text-white"
                                : "bg-muted"
                            }`}
                          >
                            <p className="whitespace-pre-line text-sm">{message.text}</p>
                          </div>
                          {message.venues?.map((venue) => (
                            <Link
                              key={venue.venue_id}
                              to={`/venue/${encodeURIComponent(venue.venue_id)}`}
                              className="block rounded-lg border border-border bg-background p-3 transition-colors hover:border-[#2f8a64] hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8a64]"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {venue.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {venue.borough && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3" />
                                    {venue.borough}
                                  </span>
                                )}
                                {venue.busyness_label && (
                                  <span className="inline-flex items-center gap-1">
                                    <Gauge className="size-3" />
                                    {venue.busyness_label}
                                    {venue.busyness_score != null
                                      ? ` ${venue.busyness_score}%`
                                      : ""}
                                  </span>
                                )}
                                {venue.suitability_score != null && (
                                  <span>
                                    Match {Math.round(venue.suitability_score)}%
                                  </span>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="flex max-w-[80%] items-center gap-2 rounded-lg bg-muted px-4 py-2 text-xs text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                          Searching workspaces...
                        </div>
                      </div>
                    )}
                    <div ref={newestMessageRef} />
                  </div>
                </ScrollArea>

                <div className="border-t p-3 sm:p-4">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask me to find a workspace..."
                      className="flex-1"
                      disabled={isTyping}
                      maxLength={500}
                      aria-label="Workspace request"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="bg-[#2f8a64] hover:bg-[#287858]"
                      disabled={isTyping || !input.trim()}
                      aria-label="Send workspace request"
                    >
                      <Send className="size-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
