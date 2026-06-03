import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Search, Inbox as InboxIcon, FileText, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Platform, platformMeta, relativeTime } from "@/lib/messaging";

interface Conversation {
  id: string;
  conversation_key: string;
  platform: Platform;
  customer_id: string;
  customer_name: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
}

interface Attachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

interface Message {
  id: string;
  conversation_key: string;
  platform: Platform;
  direction: "inbound" | "outbound";
  text: string | null;
  created_at: string;
  sender_name: string | null;
  attachments: Attachment[] | null;
}

const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "web", label: "Web" },
  { key: "instagram", label: "Instagram" },
  { key: "messenger", label: "Messenger" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "unread", label: "Unread" },
];

const Inbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      setConversations((data as Conversation[]) ?? []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("admin-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load messages when selection changes + reset unread
  useEffect(() => {
    if (!selectedKey) return;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_key", selectedKey)
        .order("created_at", { ascending: true });
      setMessages(((data as unknown) as Message[]) ?? []);
    };
    load();
    supabase.from("conversations").update({ unread_count: 0 }).eq("conversation_key", selectedKey).then();
  }, [selectedKey]);

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.conversation_key === selectedKey) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        } else if (m.direction === "inbound") {
          toast(`New message from ${m.platform}`, { description: m.text?.slice(0, 80) });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Sign URLs for attachments in chat-attachments bucket
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

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === "unread" && c.unread_count <= 0) return false;
      if (filter !== "all" && filter !== "unread" && c.platform !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(c.customer_name ?? "").toLowerCase().includes(q) &&
            !(c.last_message_preview ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [conversations, filter, search]);

  const selected = conversations.find((c) => c.conversation_key === selectedKey) ?? null;

  // 24h WhatsApp window
  const whatsappWindowExpired = useMemo(() => {
    if (!selected || selected.platform !== "whatsapp") return false;
    const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
    if (!lastInbound) return true;
    return Date.now() - new Date(lastInbound.created_at).getTime() > 24 * 60 * 60 * 1000;
  }, [selected, messages]);

  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_MIME = [
    "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
  ];

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) { toast.error(`${f.name} exceeds 5MB.`); continue; }
      if (!ALLOWED_MIME.includes(f.type)) { toast.error(`${f.name} type not allowed.`); continue; }
      valid.push(f);
    }
    setPending((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePending = (idx: number) => setPending((prev) => prev.filter((_, i) => i !== idx));

  const uploadAll = async (userId: string): Promise<Attachment[]> => {
    if (pending.length === 0) return [];
    const uploaded: Attachment[] = [];
    for (const f of pending) {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, f, { contentType: f.type, upsert: false });
      if (error) {
        toast.error(`Upload failed: ${f.name}`);
        throw error;
      }
      uploaded.push({ path, name: f.name, size: f.size, type: f.type });
    }
    return uploaded;
  };

  const send = async () => {
    const text = reply.trim();
    if ((!text && pending.length === 0) || !selected || sending) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // For non-web platforms with attachments, block (external APIs not wired for media here)
      if (selected.platform !== "web" && pending.length > 0) {
        throw new Error("Attachments only supported on Web conversations.");
      }

      if (selected.platform === "web") {
        const attachments = await uploadAll(userId);
        const { data: profile } = await supabase
          .from("profiles").select("full_name, email").eq("user_id", userId).maybeSingle();
        const senderName = profile?.full_name?.trim() || profile?.email || "Admin";
        const row: Record<string, unknown> = {
          conversation_key: selected.conversation_key,
          platform: "web",
          direction: "outbound",
          sender_id: userId,
          sender_name: senderName,
          message_type: attachments.length > 0 ? "file" : "text",
        };
        if (text) row.text = text;
        if (attachments.length > 0) row.attachments = attachments;
        const { error } = await supabase.from("messages").insert(row as never);
        if (error) throw error;
        const preview = text || `📎 ${attachments.map((a) => a.name).join(", ")}`;
        await supabase.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: preview.slice(0, 200),
        }).eq("conversation_key", selected.conversation_key);
      } else {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ platform: selected.platform, recipient_id: selected.customer_id, text }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Send failed");
        }
      }
      setReply("");
      setPending([]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] bg-card border border-border rounded-lg overflow-hidden flex">
      {/* Left pane */}
      <div className="w-80 border-r border-border flex flex-col bg-muted/20">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors",
                  filter === f.key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <InboxIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No conversations yet
            </div>
          )}
          {filtered.map((c) => {
            const meta = platformMeta[c.platform];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedKey(c.conversation_key)}
                className={cn(
                  "w-full text-left p-3 border-b border-border hover:bg-accent/50 transition-colors flex gap-3",
                  selectedKey === c.conversation_key && "bg-accent"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", meta.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{c.customer_name ?? c.customer_id}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", meta.badge)}>
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message_preview ?? "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground">{relativeTime(c.last_message_at)}</span>
                  {c.unread_count > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right pane */}
      <div className="flex-1 flex flex-col">
        {!selected && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <InboxIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a conversation to start replying</p>
            </div>
          </div>
        )}
        {selected && (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <Badge variant="outline" className={platformMeta[selected.platform].badge}>
                {platformMeta[selected.platform].label}
              </Badge>
              <div>
                <p className="font-semibold text-sm">{selected.customer_name ?? selected.customer_id}</p>
                <p className="text-xs text-muted-foreground">{selected.customer_id}</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div className="max-w-[70%]">
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm break-words",
                        m.direction === "outbound"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border rounded-bl-sm"
                      )}
                    >
                      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                      {m.attachments?.map(renderAttachment)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {m.direction === "outbound" && m.sender_name && (
                        <span className="font-medium">{m.sender_name} · </span>
                      )}
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {whatsappWindowExpired && (
              <div className="bg-yellow-50 border-t border-yellow-200 text-yellow-800 text-xs px-4 py-2">
                ⚠ WhatsApp 24-hour reply window expired. Use approved template only.
              </div>
            )}

            {pending.length > 0 && (
              <div className="px-3 pt-2 flex flex-wrap gap-2 border-t border-border">
                {pending.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[160px]">{f.name}</span>
                    <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                    <button type="button" onClick={() => removePending(i)} className="text-muted-foreground hover:text-foreground" aria-label="Remove">
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
                disabled={sending || (selected?.platform !== "web")}
                aria-label="Attach file"
                title={selected?.platform !== "web" ? "Attachments only on Web" : "Attach file"}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type your reply… (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-40"
                maxLength={4000}
              />
              <Button onClick={send} disabled={(!reply.trim() && pending.length === 0) || sending}>
                <Send className="w-4 h-4 mr-1" /> Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Inbox;
