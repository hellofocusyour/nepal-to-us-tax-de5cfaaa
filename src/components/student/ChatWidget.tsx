import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  text: string | null;
  created_at: string;
}

const ChatWidget = () => {
  const { user, isStudent } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationKey = user ? `web:${user.id}` : null;

  useEffect(() => {
    if (!user || !conversationKey) return;

    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, direction, text, created_at")
        .eq("conversation_key", conversationKey)
        .order("created_at", { ascending: true });
      setMessages((data as Msg[]) ?? []);
    };
    load();

    const channel = supabase
      .channel(`web-chat-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_key=eq.${conversationKey}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.direction === "outbound" && !open) setHasUnread(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationKey, open]);

  useEffect(() => {
    if (open) setHasUnread(false);
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages]);

  const ensureConversation = async () => {
    if (!user || !conversationKey) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("conversation_key")
      .eq("conversation_key", conversationKey)
      .maybeSingle();
    if (!existing) {
      await supabase.from("conversations").insert({
        conversation_key: conversationKey,
        platform: "web",
        customer_id: user.id,
        customer_name: user.email ?? "Student",
        last_message_preview: "",
      });
    }
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !conversationKey || sending) return;
    setSending(true);
    try {
      await ensureConversation();
      const { error } = await supabase.from("messages").insert({
        conversation_key: conversationKey,
        platform: "web",
        direction: "inbound",
        sender_id: user.id,
        text: trimmed,
      });
      if (error) throw error;
      // bump conversation
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: trimmed.slice(0, 200),
          unread_count: (await supabase
            .from("conversations")
            .select("unread_count")
            .eq("conversation_key", conversationKey)
            .maybeSingle()).data?.unread_count ?? 0,
        })
        .eq("conversation_key", conversationKey);
      // increment unread for admin
      const { data: conv } = await supabase
        .from("conversations")
        .select("unread_count")
        .eq("conversation_key", conversationKey)
        .maybeSingle();
      await supabase
        .from("conversations")
        .update({ unread_count: (conv?.unread_count ?? 0) + 1 })
        .eq("conversation_key", conversationKey);
      setText("");
    } finally {
      setSending(false);
    }
  };

  if (!user || !isStudent) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-destructive border-2 border-background" />
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Focus Academy</p>
              <p className="text-xs opacity-80">We typically reply in a few hours</p>
            </div>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20" onClick={() => setOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                👋 Hi! Send us a message and we'll get back to you soon.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.direction === "inbound" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words",
                    m.direction === "inbound"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border bg-card flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
              maxLength={2000}
            />
            <Button size="icon" onClick={send} disabled={!text.trim() || sending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
