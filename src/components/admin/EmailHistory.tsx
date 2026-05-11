import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Inbox } from "lucide-react";

interface EmailLog {
  id: string;
  recipient_name: string | null;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export const EmailHistory = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false });
      setLogs((data as EmailLog[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        (l.recipient_name || "").toLowerCase().includes(q) ||
        l.recipient_email.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by recipient name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent To</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date &amp; Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="w-10 h-10 opacity-50" />
                      <p className="font-medium">No emails sent yet</p>
                      <p className="text-sm">Emails you send from the Inquiries tab will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No emails match your search
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.recipient_name || "—"}</TableCell>
                    <TableCell>{l.recipient_email}</TableCell>
                    <TableCell className="max-w-xs truncate">{l.subject}</TableCell>
                    <TableCell>
                      {l.status === "sent" ? (
                        <Badge className="bg-green-600 hover:bg-green-600 text-white capitalize">Sent</Badge>
                      ) : (
                        <Badge variant="destructive" className="capitalize" title={l.error_message || undefined}>
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(l.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailHistory;
