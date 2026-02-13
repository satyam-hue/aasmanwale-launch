import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: "admin" | "vendor" | "customer" | null;
  vendorId: string | null;
  vendorApproved: boolean;  // NEW: Track vendor approval status
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  vendorId: null,
  vendorApproved: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"admin" | "vendor" | "customer" | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorApproved, setVendorApproved] = useState(false);

  const fetchUserRole = async (userId: string) => {
    try {
      // Fetch user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (roles && roles.length > 0) {
        // Priority: admin > vendor > customer
        const roleList = roles.map((r) => r.role);
        if (roleList.includes("admin")) setRole("admin");
        else if (roleList.includes("vendor")) setRole("vendor");
        else setRole("customer");
      } else {
        setRole("customer");
      }

      // Check for vendor profile and approval status
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, is_approved")
        .eq("user_id", userId)
        .maybeSingle();

      if (vendor) {
        setVendorId(vendor.id);
        setVendorApproved(vendor.is_approved);
      } else {
        setVendorId(null);
        setVendorApproved(false);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Small delay to ensure database triggers have completed
          setTimeout(() => fetchUserRole(session.user.id), 500);
        } else {
          setRole(null);
          setVendorId(null);
          setVendorApproved(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setVendorId(null);
    setVendorApproved(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, vendorId, vendorApproved, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
