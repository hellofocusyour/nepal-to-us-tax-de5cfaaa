import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Inbox, Trash2, Eye, MousePointerClick } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EmailLog {
  id: string;
  recipient_name: string | null;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  created_at: string;
  opens_count: number | null;
  clicks_count: number | null;
  last_opened_at: string | null;
  last_clicked_at: string | null;
}

export const EmailHistory = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<EmailLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false });
    setLogs((data as EmailLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = Date.now();
    const rangeMs: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    return logs.filter((l) => {
      if (statusFilter !== "all") {
        const isSent = l.status === "sent";
        if (statusFilter === "sent" && !isSent) return false;
        if (statusFilter === "failed" && isSent) return false;
      }
      if (rangeFilter !== "all" && rangeMs[rangeFilter]) {
        if (now - new Date(l.created_at).getTime() > rangeMs[rangeFilter]) return false;
      }
      if (q) {
        const hay = `${l.recipient_name || ""} ${l.recipient_email} ${l.subject}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, statusFilter, rangeFilter]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from("email_logs").delete().eq("id", pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setLogs((prev) => prev.filter((l) => l.id !== pendingDelete.id));
    toast.success("Email log deleted");
    setPendingDelete(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient name, email, or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rangeFilter} onValueChange={setRangeFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue placeholder="Date range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
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
                <TableHead>Opens</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Inbox className="w-10 h-10 opacity-50" />
                      <p className="font-medium">No emails sent yet</p>
                      <p className="text-sm">Emails you send from the Inquiries tab will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1 text-sm"
                        title={l.last_opened_at ? `Last opened: ${formatDate(l.last_opened_at)}` : "Not opened yet"}
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        {l.opens_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1 text-sm"
                        title={l.last_clicked_at ? `Last clicked: ${formatDate(l.last_clicked_at)}` : "No clicks yet"}
                      >
                        <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                        {l.clicks_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(l.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setPendingDelete(l)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email log?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the record for <strong>{pendingDelete?.recipient_email}</strong> ({pendingDelete?.subject}) from your history. The recipient still has the email — only the log is removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailHistory;
