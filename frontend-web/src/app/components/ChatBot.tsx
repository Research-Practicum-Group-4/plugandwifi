import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
      text: "Hi! I'm your Plug & Wifi assistant. I can help you find the perfect workspace. Try asking me things like 'Find a quiet place near Times Square' or 'I need a space with good coffee in Brooklyn'.",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Check for location-based queries
    if (lowerMessage.includes("near") || lowerMessage.includes("nearby") || lowerMessage.includes("close")) {
      return "I found 3 workspaces near you:\n\n1. **The Grand Hotel Lobby** - $5/hr, 5 mins away\n   Quiet atmosphere with complimentary coffee\n\n2. **Cafe Moderna** - $3/hr, 8 mins away\n   Relaxed vibe with power outlets at every table\n\n3. **Downtown Business Lounge** - $7/hr, 12 mins away\n   Professional setting with meeting rooms available\n\nWould you like to book one of these?";
    }

    // Check for travel/location queries
    if (lowerMessage.includes("paris") || lowerMessage.includes("travel") || lowerMessage.includes("staying")) {
      return "Great! For Paris, I recommend checking our partner workspaces:\n\n• **Le Marais Workspace** - Historic district, €6/hr\n• **Montmartre Creative Hub** - Artistic area, €8/hr\n• **Latin Quarter Study Lounge** - Student-friendly, €4/hr\n\nI can set up alerts for when you arrive. What dates will you be there?";
    }

    // Check for amenity-based queries
    if (lowerMessage.includes("quiet") || lowerMessage.includes("silent") || lowerMessage.includes("no noise")) {
      return "Here are our quietest spaces:\n\n1. **Downtown Business Lounge** - No loud music policy, $7/hr\n2. **The Grand Hotel Lobby** - Library-quiet atmosphere, $5/hr\n\nBoth have 4.8+ ratings for peaceful work environments!";
    }

    if (lowerMessage.includes("coffee") || lowerMessage.includes("drinks") || lowerMessage.includes("beverage")) {
      return "Workspaces with great coffee:\n\n1. **Cafe Moderna** - Specialty coffee included, $3/hr\n2. **The Grand Hotel Lobby** - Complimentary coffee & tea, $5/hr\n\nBoth offer free refills during your booking!";
    }

    // Check for price-related queries
    if (lowerMessage.includes("cheap") || lowerMessage.includes("affordable") || lowerMessage.includes("budget")) {
      return "Here are our most affordable options:\n\n1. **Cafe Moderna** - $3/hr\n2. **Riverside Coffee House** - $4/hr\n3. **The Grand Hotel Lobby** - $5/hr\n\nAll include WiFi and power outlets!";
    }

    // Default response
    return "I can help you find the perfect workspace! Try asking me:\n\n• 'Show me quiet places nearby'\n• 'Find affordable spaces with good coffee'\n• 'I need a workspace in [neighborhood]'\n• 'Places that allow phone calls'\n\nWhat are you looking for?";
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(input),
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
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
          className="size-16 rounded-full shadow-lg"
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
                    />
                    <Button
                      type="submit"
                      size="icon"
                      style={{ backgroundColor: '#2f8a64' }}
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
