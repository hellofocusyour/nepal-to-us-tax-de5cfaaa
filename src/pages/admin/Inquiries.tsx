import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmailComposeModal, type EmailRecipient } from "@/components/admin/EmailComposeModal";
import { EmailHistory } from "@/components/admin/EmailHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Mail } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Inquiry = Tables<"inquiries">;

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  contacted: "secondary",
  converted: "default",
  dropped: "destructive",
};

const Inquiries = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipients, setComposeRecipients] = useState<EmailRecipient[]>([]);

  const fetchInquiries = async () => {
    let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter as Inquiry["status"]);
    const { data } = await query;
    setInquiries(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchInquiries(); }, [statusFilter]);

  const filtered = useMemo(
    () => inquiries.filter(i =>
      i.full_name.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase())
    ),
    [inquiries, search]
  );

  const allVisibleSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id));
  const someVisibleSelected = filtered.some(i => selectedIds.has(i.id));

  const toggleAll = (checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) filtered.forEach(i => next.add(i.id));
    else filtered.forEach(i => next.delete(i.id));
    setSelectedIds(next);
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const updateStatus = async (id: string, status: Inquiry["status"]) => {
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Status updated");
    fetchInquiries();
  };

  const openComposeFor = (recipients: Inquiry[]) => {
    if (recipients.length === 0) return;
    setComposeRecipients(recipients.map(r => ({ name: r.full_name, email: r.email })));
    setComposeOpen(true);
  };

  const selectedCount = selectedIds.size;
  const selectedInquiries = inquiries.filter(i => selectedIds.has(i.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Inquiries</h1>
        <p className="text-muted-foreground">Manage form submissions</p>
      </div>

      <Tabs defaultValue="inquiries" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
          <TabsTrigger value="emails">Email History</TabsTrigger>
        </TabsList>

        <TabsContent value="inquiries" className="space-y-6">
          <Card className="border border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search inquiries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="dropped">Dropped</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-2">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button size="sm" onClick={() => openComposeFor(selectedInquiries)}>
            <Mail className="w-4 h-4 mr-2" />
            Send Email to Selected ({selectedCount})
          </Button>
        </div>
      )}

      <Card className="border border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(c) => toggleAll(Boolean(c))}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Background</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No inquiries found</TableCell></TableRow>
              ) : (
                filtered.map((inquiry) => (
                  <TableRow key={inquiry.id} data-state={selectedIds.has(inquiry.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(inquiry.id)}
                        onCheckedChange={(c) => toggleOne(inquiry.id, Boolean(c))}
                        aria-label={`Select ${inquiry.full_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{inquiry.full_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{inquiry.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{inquiry.phone || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell capitalize">{inquiry.background || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[inquiry.status] || "outline"} className="capitalize">{inquiry.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select onValueChange={(v) => updateStatus(inquiry.id, v as Inquiry["status"])}>
                          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => openComposeFor([inquiry])}
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="emails">
          <EmailHistory />
        </TabsContent>
      </Tabs>

      <EmailComposeModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        recipients={composeRecipients}
      />
    </div>
  );
};

export default Inquiries;
