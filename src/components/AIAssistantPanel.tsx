import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Loader2, Save, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useNotes } from "@/hooks/useNotes";
import { useProject } from "@/contexts/ProjectContext";
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  userQuestion?: string;
  sources?: Array<{id: string, name: string}>;
}

export const AIAssistantPanel = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I can help you analyze your documents, organize your notes, and manage your tasks. What would you like to know?",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const { createNote } = useNotes();
  const { selectedProjectId } = useProject();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSaveAsNote = async (message: Message) => {
    setSavingNoteId(message.id);
    try {
      // Prefer stored userQuestion, otherwise find the latest user message before this assistant reply
      let question = message.userQuestion;
      if (!question) {
        const idx = messages.findIndex((m) => m.id === message.id);
        if (idx > 0) {
          for (let i = idx - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
              question = messages[i].content;
              break;
            }
          }
        }
      }

      const title = question
        ? `${question} - ${message.timestamp}`
        : `AI Response - ${message.timestamp}`;

      console.log("Saving note with title:", title);
      console.log("User question:", question);

      createNote({
        title,
        content: message.content,
      });
      // Success toast handled by mutation
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleCopy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying:', error);
      toast({
        title: "Error",
        description: "Failed to copy. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userQuestion = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userQuestion,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [...messages, userMessage].map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          projectId: selectedProjectId || null
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        userQuestion: userQuestion,
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h2 className="font-semibold">AI Assistant</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions about your sources, notes, and todos
        </p>
      </div>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${message.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'} rounded-lg p-4`}>
                {message.role === 'assistant' ? (
                  <>
                    <MarkdownRenderer content={message.content} className="text-sm" />
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Sources referenced:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.sources.map((source) => (
                            <span key={source.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {source.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {message.timestamp}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(message)}
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleSaveAsNote(message)}
                          disabled={savingNoteId === message.id}
                          title="Save as note"
                        >
                          {savingNoteId === message.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-2 text-primary-foreground/70">
                      {message.timestamp}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
