import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { signupCustomer, signupVendor, getDashboardRoute } from "@/lib/roleManagement";
import { useDashboardRouting } from "@/lib/dashboardRouting";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [signupType, setSignupType] = useState<"customer" | "vendor" | null>(null); // NEW
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState(""); // NEW
  const [companyPhone, setCompanyPhone] = useState(""); // NEW
  const [location, setLocation] = useState(""); // NEW
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role, vendorApproved, vendorId, loading: authLoading } = useAuth();

  // Use explicit dashboard routing hook for reliable role-based navigation
  useDashboardRouting({
    user,
    role,
    vendorId,
    vendorApproved,
    authLoading,
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signupCustomer(email, password, fullName);
      if (!result.success) throw new Error(result.error);
      toast.success(
        "Account created! Check your email to verify. After verification, you can book your first flight!"
      );
      // Reset and switch back to login
      setEmail("");
      setPassword("");
      setFullName("");
      setSignupType(null);
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !companyPhone || !location) {
      toast.error("Please fill in all company details");
      return;
    }

    setLoading(true);

    try {
      const result = await signupVendor(
        email,
        password,
        fullName,
        companyName,
        companyPhone,
        location
      );
      if (!result.success) throw new Error(result.error);
      toast.success(
        "Vendor account created! Check your email to verify. Our team will review and approve your account shortly."
      );
      // Reset and switch back to login
      setEmail("");
      setPassword("");
      setFullName("");
      setCompanyName("");
      setCompanyPhone("");
      setLocation("");
      setSignupType(null);
      setIsLogin(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Show loading state while auth is being processed and routed */}
      {authLoading && user ? (
        <section className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-primary via-sky-light to-accent flex items-center justify-center">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground mx-auto mb-6"></div>
            <h2 className="font-display font-bold text-2xl text-primary-foreground mb-2">
              Preparing your dashboard...
            </h2>
            <p className="text-primary-foreground/80">Setting up your personalized experience</p>
          </div>
        </section>
      ) : (
        <section className="pt-32 pb-20 bg-gradient-to-br from-primary via-sky-light to-accent">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-primary-foreground mb-6">
            {isLogin
              ? "Welcome Back"
              : signupType
              ? signupType === "customer"
                ? "Join as a Customer"
                : "Become a Vendor"
              : "Join AasmanWale"}
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            {isLogin
              ? "Sign in to manage your account"
              : signupType
              ? signupType === "customer"
                ? "Create an account to start booking amazing flights"
                : "Register your flying service and reach customers"
              : "Choose how you want to join"}
          </p>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card p-8 rounded-2xl shadow-lg">
            {isLogin ? (
              // LOGIN FORM
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            ) : signupType === null ? (
              // SIGNUP TYPE SELECTION
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Select how you'd like to join AasmanWale
                </p>
                <Button
                  onClick={() => setSignupType("customer")}
                  variant="outline"
                  size="lg"
                  className="w-full h-20 flex flex-col gap-2 items-center justify-center"
                >
                  <span className="text-lg font-semibold">🪂 Book Flights</span>
                  <span className="text-xs text-muted-foreground">Sign up as a customer</span>
                </Button>
                <Button
                  onClick={() => setSignupType("vendor")}
                  variant="outline"
                  size="lg"
                  className="w-full h-20 flex flex-col gap-2 items-center justify-center"
                >
                  <span className="text-lg font-semibold">✈️ Offer Flights</span>
                  <span className="text-xs text-muted-foreground">Sign up as a vendor</span>
                </Button>
              </div>
            ) : signupType === "customer" ? (
              // CUSTOMER SIGNUP
              <form onSubmit={handleCustomerSignup} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              </form>
            ) : (
              // VENDOR SIGNUP
              <form onSubmit={handleVendorSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Company Name</label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Sky Adventures"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Company Phone</label>
                  <Input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+91 98789 87898"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Himachal Pradesh"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Registering..." : "Register as Vendor"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              {!signupType && !isLogin ? (
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-primary hover:underline text-sm"
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSignupType(null);
                    setIsLogin(!isLogin);
                    setEmail("");
                    setPassword("");
                    setFullName("");
                    setCompanyName("");
                    setCompanyPhone("");
                    setLocation("");
                  }}
                  className="text-primary hover:underline text-sm"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Back"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      )}
    </Layout>
  );
};

export default Auth;
