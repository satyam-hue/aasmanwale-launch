import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { signupCustomer, signupVendor } from "@/lib/roleManagement";
import { useDashboardRouting } from "@/lib/dashboardRouting";
import { Loader2, CheckCircle2, Mail } from "lucide-react";

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  companyName?: string;
  companyPhone?: string;
  location?: string;
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [signupType, setSignupType] = useState<"customer" | "vendor" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<"customer" | "vendor" | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { user, role, vendorApproved, vendorId, loading: authLoading } = useAuth();

  useDashboardRouting({ user, role, vendorId, vendorApproved, authLoading });

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validatePhone = (val: string) => /^\+?[\d\s-]{7,15}$/.test(val);

  const validateForm = (type: "login" | "customer" | "vendor"): boolean => {
    const newErrors: FieldErrors = {};

    if (!email) newErrors.email = "Email is required";
    else if (!validateEmail(email)) newErrors.email = "Enter a valid email";

    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (type !== "login") {
      if (!fullName.trim()) newErrors.fullName = "Full name is required";
    }

    if (type === "vendor") {
      if (!companyName.trim()) newErrors.companyName = "Company name is required";
      if (!companyPhone.trim()) newErrors.companyPhone = "Phone is required";
      else if (!validatePhone(companyPhone)) newErrors.companyPhone = "Enter a valid phone number";
      if (!location.trim()) newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setCompanyName("");
    setCompanyPhone("");
    setLocation("");
    setErrors({});
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm("login")) return;
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
    if (!validateForm("customer")) return;
    setLoading(true);
    try {
      const result = await signupCustomer(email, password, fullName);
      if (!result.success) throw new Error(result.error);
      setSignupSuccess("customer");
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm("vendor")) return;
    setLoading(true);
    try {
      const result = await signupVendor(email, password, fullName, companyName, companyPhone, location);
      if (!result.success) throw new Error(result.error);
      setSignupSuccess("vendor");
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const FieldError = ({ message }: { message?: string }) =>
    message ? <p className="text-destructive text-xs mt-1">{message}</p> : null;

  // Success confirmation screen
  if (signupSuccess) {
    return (
      <Layout>
        <section className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-primary via-sky-light to-accent flex items-center justify-center">
          <div className="container mx-auto px-4 max-w-md">
            <div className="bg-card p-8 rounded-2xl shadow-xl border border-border/50 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <h2 className="font-display font-bold text-2xl text-foreground mb-3">
                Check Your Email
              </h2>
              <p className="text-muted-foreground mb-4">
                {signupSuccess === "vendor"
                  ? "We've sent a verification link to your email. After verifying, our team will review and approve your vendor account."
                  : "We've sent a verification link to your email. Once verified, you can log in and start booking flights!"}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSignupSuccess(null);
                  setSignupType(null);
                  setIsLogin(true);
                }}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {authLoading && user ? (
        <section className="pt-32 pb-20 min-h-screen bg-gradient-to-br from-primary via-sky-light to-accent flex items-center justify-center">
          <div className="container mx-auto px-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-foreground mx-auto mb-6" />
            <h2 className="font-display font-bold text-2xl text-primary-foreground mb-2">
              Preparing your dashboard...
            </h2>
            <p className="text-primary-foreground/80">Setting up your personalized experience</p>
          </div>
        </section>
      ) : (
        <>
          <section className="pt-32 pb-20 bg-gradient-to-br from-primary via-sky-light to-accent">
            <div className="container mx-auto px-4 text-center">
              <h1 className="font-display font-bold text-4xl sm:text-5xl text-primary-foreground mb-4 drop-shadow-md">
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

          <section className="py-16 bg-background">
            <div className="container mx-auto px-4 max-w-md">
              <div className="bg-card p-8 rounded-2xl shadow-xl border border-border/50">
                {isLogin ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
                      <FieldError message={errors.email} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                      <FieldError message={errors.password} />
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
                    </Button>
                  </form>
                ) : signupType === null ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Select how you'd like to join AasmanWale
                    </p>
                    <Button
                      onClick={() => setSignupType("customer")}
                      variant="outline"
                      size="lg"
                      className="w-full h-20 flex flex-col gap-1 items-center justify-center hover:border-primary/50 transition-colors"
                    >
                      <span className="text-lg font-semibold">🪂 Book Flights</span>
                      <span className="text-xs text-muted-foreground">Sign up as a customer</span>
                    </Button>
                    <Button
                      onClick={() => setSignupType("vendor")}
                      variant="outline"
                      size="lg"
                      className="w-full h-20 flex flex-col gap-1 items-center justify-center hover:border-primary/50 transition-colors"
                    >
                      <span className="text-lg font-semibold">✈️ Offer Flights</span>
                      <span className="text-xs text-muted-foreground">Sign up as a vendor</span>
                    </Button>
                  </div>
                ) : signupType === "customer" ? (
                  <form onSubmit={handleCustomerSignup} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                      <FieldError message={errors.fullName} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
                      <FieldError message={errors.email} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                      <FieldError message={errors.password} />
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Account"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVendorSignup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                      <FieldError message={errors.fullName} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
                      <FieldError message={errors.email} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Company Name</label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sky Adventures" />
                      <FieldError message={errors.companyName} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Company Phone</label>
                      <Input type="tel" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+91 98789 87898" />
                      <FieldError message={errors.companyPhone} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Location</label>
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Himachal Pradesh" />
                      <FieldError message={errors.location} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                      <FieldError message={errors.password} />
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</> : "Register as Vendor"}
                    </Button>
                  </form>
                )}

                <div className="mt-6 text-center">
                  {!signupType && !isLogin ? (
                    <button onClick={() => setIsLogin(true)} className="text-primary hover:underline text-sm">
                      Already have an account? Sign in
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSignupType(null);
                        setIsLogin(!isLogin);
                        resetForm();
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
        </>
      )}
    </Layout>
  );
};

export default Auth;
