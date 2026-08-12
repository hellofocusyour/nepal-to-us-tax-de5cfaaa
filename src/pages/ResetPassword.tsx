import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";

const ResetPassword = () => {
  useSEO({
    title: "Reset Password | Focus Academy",
    description: "Set a new password for your Focus Academy student account.",
    path: "/reset-password",
    noIndex: true,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setValidLink(true);
        setReady(true);
      }
    });

    (async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const code = new URLSearchParams(window.location.search).get("code");

      if (params.get("access_token") && params.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({
          access_token: params.get("access_token")!,
          refresh_token: params.get("refresh_token")!,
        });
        setValidLink(!error);
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setValidLink(!error);
      } else {
        const { data } = await supabase.auth.getSession();
        setValidLink(!!data.session);
      }
      setReady(true);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", description: "Please retype your new password.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: "Could not reset password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You can now sign in with your new password." });
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display">Set a new password</CardTitle>
            <CardDescription>Choose a strong password for your Focus Academy account.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">Checking your reset link…</p>
          ) : !validLink ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired. Request a new one from the login page.
              </p>
              <Button asChild className="w-full"><Link to="/login">Back to login</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input id="password" type={show ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full"
                    onClick={() => setShow(!show)}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input id="confirm" type={show ? "text" : "password"} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
