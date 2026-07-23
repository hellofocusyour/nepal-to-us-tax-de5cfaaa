import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Shield, UserPlus } from "lucide-react";
import { ALL_SECTIONS, AdminSection, useAdminAccess } from "@/hooks/useAdminAccess";

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  sections: AdminSection[];
  isSuper: boolean;
}

const Team = () => {
  const { user } = useAuth();
  const { isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newSections, setNewSections] = useState<Set<AdminSection>>(new Set());
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    // All users with admin role
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const userIds = (roles ?? []).map(r => r.user_id);
    if (userIds.length === 0) { setAdmins([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", userIds);
    const { data: perms } = await supabase.from("admin_permissions").select("user_id, section").in("user_id", userIds);
    const byUser: Record<string, AdminSection[]> = {};
    (perms ?? []).forEach((p: any) => {
      byUser[p.user_id] = [...(byUser[p.user_id] ?? []), p.section];
    });
    setAdmins((profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      sections: byUser[p.user_id] ?? [],
      isSuper: p.email?.toLowerCase() === "academy@focusyourfinance.com",
    })));
    setLoading(false);
  };

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin]);

  if (accessLoading) return <div className="p-8">Loading…</div>;
  if (!isSuperAdmin) return <Navigate to="/admin" replace />;

  const togglePermission = async (userId: string, section: AdminSection, currentlyHas: boolean) => {
    if (currentlyHas) {
      const { error } = await supabase.from("admin_permissions").delete()
        .eq("user_id", userId).eq("section", section);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("admin_permissions").insert({
        user_id: userId, section, granted_by: user?.id,
      });
      if (error) return toast.error(error.message);
    }
    load();
  };

  const addAdmin = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: {
          email,
          sections: Array.from(newSections),
          redirect_to: `${window.location.origin}/admin`,
        },
      });
      const serverErr = (data as any)?.error;
      if (error || serverErr) {
        // Try to read the response body from FunctionsHttpError for a clearer message
        let msg = serverErr || error?.message || "Failed to invite admin";
        try {
          const ctx: any = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch {}
        toast.error(msg);
        return;
      }
      toast.success(
        (data as any)?.invited
          ? "Invitation email sent. They'll get admin access once they accept."
          : "Admin access granted. A sign-in link was emailed to them.",
      );
      setNewEmail("");
      setNewSections(new Set());
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setAdding(false); }
  };

  const removeAdmin = async (userId: string) => {
    if (!confirm("Remove this admin? Their section access will also be revoked.")) return;
    await supabase.from("admin_permissions").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("Admin removed");
    load();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Team & Access
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage admin users and choose exactly which sections each can access. Only you (super admin) can modify this.
        </p>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite admin by email</h2>
        <div className="flex gap-2">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="user@example.com"
          />
          <Button onClick={addAdmin} disabled={!newEmail.trim() || adding}>
            {adding ? "Sending…" : "Send invite"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          If they don't have an account yet, they'll get an invitation email. If they do, they'll receive a sign-in link. Optionally pre-select sections to grant on acceptance.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
          {ALL_SECTIONS.map((s) => {
            const checked = newSections.has(s.key);
            return (
              <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-accent">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    const next = new Set(newSections);
                    if (checked) next.delete(s.key); else next.add(s.key);
                    setNewSections(next);
                  }}
                />
                {s.label}
              </label>
            );
          })}
        </div>
      </Card>

      {loading ? (
        <div>Loading admins…</div>
      ) : (
        <div className="space-y-4">
          {admins.map((a) => (
            <Card key={a.user_id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.full_name || a.email}</p>
                    {a.isSuper && <Badge className="bg-primary">Super Admin</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.email}</p>
                </div>
                {!a.isSuper && (
                  <Button variant="ghost" size="sm" onClick={() => removeAdmin(a.user_id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              {a.isSuper ? (
                <p className="text-sm text-muted-foreground italic">Has access to all sections.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ALL_SECTIONS.map((s) => {
                    const has = a.sections.includes(s.key);
                    return (
                      <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-accent">
                        <Checkbox
                          checked={has}
                          onCheckedChange={() => togglePermission(a.user_id, s.key, has)}
                        />
                        {s.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Team;
