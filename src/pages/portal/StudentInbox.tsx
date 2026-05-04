import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Send, Inbox as InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  text: string | null;
  created_at: string;
}

const StudentInbox = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
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
      .channel(`student-inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_key=eq.${conversationKey}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
      const { data: conv } = await supabase
        .from("conversations")
        .select("unread_count")
        .eq("conversation_key", conversationKey)
        .maybeSingle();
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: trimmed.slice(0, 200),
          unread_count: (conv?.unread_count ?? 0) + 1,
        })
        .eq("conversation_key", conversationKey);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <p className="font-semibold text-sm">Focus Academy Support</p>
        <p className="text-xs text-muted-foreground">We typically reply in a few hours</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <InboxIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Send your first message to start the conversation</p>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.direction === "inbound" ? "justify-end" : "justify-start")}>
            <div className="max-w-[70%]">
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm break-words",
                  m.direction === "inbound"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                )}
              >
                {m.text}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type your message… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-40"
          maxLength={2000}
        />
        <Button onClick={send} disabled={!text.trim() || sending}>
          <Send className="w-4 h-4 mr-1" /> Send
        </Button>
      </div>
    </div>
  );
};

export default StudentInbox;
