import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isStudent: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isStudent: false,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = data?.map((r) => r.role) ?? [];
    const hasAdminRole = roles.includes("admin");
    setIsAdmin(hasAdminRole);
    setIsStudent(!hasAdminRole && roles.includes("student"));
    return { isAdmin: hasAdminRole, isStudent: !hasAdminRole && roles.includes("student") };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkRoles(session.user.id);
        } else {
          setIsAdmin(false);
          setIsStudent(false);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error as Error | null };
    setSession(data.session);
    setUser(data.user);
    const roles = await checkRoles(data.user.id);
    return { error: null, isAdmin: roles.isAdmin };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) return { error: error as Error | null };

    // Create profile if signup succeeded
    if (data.user) {
      await supabase.from("profiles").insert({
        user_id: data.user.id,
        full_name: fullName,
        email,
        phone: phone || null,
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsStudent(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isStudent, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
