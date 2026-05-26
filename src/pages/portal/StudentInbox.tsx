import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Send, Inbox as InboxIcon, Paperclip, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Attachment {
  path: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  text: string | null;
  created_at: string;
  attachments: Attachment[] | null;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const StudentInbox = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversationKey = user ? `web:${user.id}` : null;

  useEffect(() => {
    if (!user || !conversationKey) return;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, direction, text, created_at, attachments")
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

  // Sign URLs for any new attachments
  useEffect(() => {
    const paths = messages
      .flatMap((m) => m.attachments ?? [])
      .map((a) => a.path)
      .filter((p) => p && !signedUrls[p]);
    if (paths.length === 0) return;
    (async () => {
      const { data } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrls(paths, 60 * 60);
      if (!data) return;
      setSignedUrls((prev) => {
        const next = { ...prev };
        data.forEach((d) => {
          if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
        });
        return next;
      });
    })();
  }, [messages, signedUrls]);

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

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        toast({ title: "File too large", description: `${f.name} exceeds 5MB.`, variant: "destructive" });
        continue;
      }
      if (!ALLOWED_MIME.includes(f.type)) {
        toast({ title: "Unsupported file", description: `${f.name} type not allowed.`, variant: "destructive" });
        continue;
      }
      valid.push(f);
    }
    setPending((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePending = (idx: number) =>
    setPending((prev) => prev.filter((_, i) => i !== idx));

  const uploadAll = async (): Promise<Attachment[]> => {
    if (!user || pending.length === 0) return [];
    const uploaded: Attachment[] = [];
    for (const f of pending) {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) {
        toast({ title: "Upload failed", description: `${f.name}: ${error.message}`, variant: "destructive" });
        throw error;
      }
      uploaded.push({ path, name: f.name, size: f.size, type: f.type });
    }
    return uploaded;
  };

  const send = async () => {
    const trimmed = text.trim();
    if ((!trimmed && pending.length === 0) || !user || !conversationKey || sending) return;
    setSending(true);
    try {
      await ensureConversation();
      const attachments = await uploadAll();
      const { error } = await supabase.from("messages").insert({
        conversation_key: conversationKey,
        platform: "web",
        direction: "inbound",
        sender_id: user.id,
        text: trimmed || null,
        message_type: attachments.length > 0 ? "file" : "text",
        attachments: attachments.length > 0 ? attachments : null,
      });
      if (error) throw error;
      const preview = trimmed || `📎 ${attachments.map((a) => a.name).join(", ")}`;
      const { data: conv } = await supabase
        .from("conversations")
        .select("unread_count")
        .eq("conversation_key", conversationKey)
        .maybeSingle();
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: preview.slice(0, 200),
          unread_count: (conv?.unread_count ?? 0) + 1,
        })
        .eq("conversation_key", conversationKey);
      setText("");
      setPending([]);
    } catch (e) {
      // toast already shown for upload errors
    } finally {
      setSending(false);
    }
  };

  const renderAttachment = (a: Attachment) => {
    const url = signedUrls[a.path];
    const isImage = a.type.startsWith("image/");
    if (isImage && url) {
      return (
        <a key={a.path} href={url} target="_blank" rel="noreferrer" className="block mt-1">
          <img src={url} alt={a.name} className="max-w-[240px] max-h-48 rounded-md border border-border object-cover" />
        </a>
      );
    }
    return (
      <a
        key={a.path}
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1.5 text-xs hover:bg-background/70"
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="truncate max-w-[180px]">{a.name}</span>
        <span className="text-muted-foreground">{formatBytes(a.size)}</span>
      </a>
    );
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
                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                {m.attachments?.map(renderAttachment)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="px-3 pt-2 flex flex-wrap gap-2 border-t border-border">
          {pending.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[160px]">{f.name}</span>
              <span className="text-muted-foreground">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => removePending(i)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-border flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_MIME.join(",")}
          className="hidden"
          onChange={onPickFiles}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          aria-label="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
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
        <Button onClick={send} disabled={(!text.trim() && pending.length === 0) || sending}>
          {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
          Send
        </Button>
      </div>
      <p className="px-3 pb-2 text-[10px] text-muted-foreground">
        Max 5MB per file. Images, PDF, Office docs, and text files only.
      </p>
    </div>
  );
};

export default StudentInbox;
