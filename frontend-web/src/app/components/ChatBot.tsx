import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../services/api";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your Plug & Wifi assistant. I can help you find the perfect workspace in Manhattan. Try asking me things like 'Find a quiet place near Times Square' or 'I need a space with power plugs'.",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const data = await api.getChatbotReply(userText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Chatbot request failed:", err);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I failed to fetch recommendations from the AI agent. Please check your connectivity and try again.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          className="size-16 rounded-full shadow-lg cursor-pointer"
          style={{ backgroundColor: '#2f8a64' }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="size-6" />
          ) : (
            <MessageCircle className="size-6" />
          )}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[380px]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="shadow-2xl">
              <CardHeader style={{ backgroundColor: '#253c50' }} className="text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5" />
                  AI Workspace Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.sender === "user"
                              ? "text-white"
                              : "bg-muted"
                          }`}
                          style={
                            message.sender === "user"
                              ? { backgroundColor: '#253c50' }
                              : {}
                          }
                        >
                          <p className="text-sm whitespace-pre-line">{message.text}</p>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted max-w-[80%] rounded-lg px-4 py-2 text-muted-foreground flex items-center gap-2 text-xs">
                          <Loader2 className="animate-spin size-3.5 text-emerald-600" />
                          Thinking...
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1"
                      disabled={isTyping}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      style={{ backgroundColor: '#2f8a64' }}
                      disabled={isTyping}
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
