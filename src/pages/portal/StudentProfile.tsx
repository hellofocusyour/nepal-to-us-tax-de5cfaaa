import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Bell, AlertTriangle, Save, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const StudentProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [background, setBackground] = useState("");
  const [address, setAddress] = useState("");
  const [occupation, setOccupation] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // notification prefs (client-only for now)
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*")
        .eq("user_id", user.id).maybeSingle();
      if (data) {
        setProfileId(data.id);
        setFullName(data.full_name);
        setPhone(data.phone || "");
        setEmail(data.email);
        setBackground(data.background || "");
      } else {
        setEmail(user.email || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { full_name: fullName, phone: phone || null, background: background || null };
    const { error } = profileId
      ? await supabase.from("profiles").update(payload).eq("id", profileId)
      : await supabase.from("profiles").insert({ user_id: user.id, email: user.email || email, ...payload });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved" });
    setSaving(false);
  };

  const requestPasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Check your email", description: "Password reset link sent." });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const initials = fullName.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase()).join("") || "?";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal info and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="sm:sticky sm:top-20">
          <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {/* Avatar header */}
      <Card>
        <CardContent className="pt-6 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-display font-bold">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-lg">{fullName || "Your name"}</h2>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          <Button variant="outline" size="sm" disabled>Upload photo</Button>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date of birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">Email <Badge variant="outline" className="text-xs">Verified</Badge></Label>
            <Input value={email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977-XXXXXXXXXX" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Used on certificate" />
          </div>
          <div className="space-y-2">
            <Label>Background</Label>
            <Select value={background} onValueChange={setBackground}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fresher">Fresher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Occupation</Label>
            <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Accountant" />
          </div>
        </CardContent>
      </Card>

      {/* Account & security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Account & security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row icon={Lock} title="Password" desc="Change your sign-in password.">
            <Button variant="outline" size="sm" onClick={requestPasswordReset}>Change</Button>
          </Row>
          <Separator />
          <Row icon={Mail} title="Two-factor (OTP)" desc="Recommended — adds SMS code at sign-in.">
            <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
          </Row>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notifications</CardTitle>
          <CardDescription>Choose what we email or text you about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row title="Email alerts" desc="Receipts, payment confirmations, announcement digests.">
            <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
          </Row>
          <Separator />
          <Row title="SMS alerts" desc="Fee reminders and class change alerts. OTPs always send.">
            <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
          </Row>
          <Separator />
          <Row title="Marketing emails" desc="New course launches and promotions.">
            <Switch checked={marketing} onCheckedChange={setMarketing} />
          </Row>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Danger zone
          </CardTitle>
          <CardDescription>
            Account deletion is reviewed by admin. Payment records are retained for accounting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={() => toast({ title: "Request sent", description: "Admin will contact you within 7 days." })}>
            Request deletion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const Row = ({ icon: Icon, title, desc, children }: {
  icon?: typeof User; title: string; desc: string; children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-start gap-3 min-w-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export default StudentProfile;
