import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Building2 } from "lucide-react";

const VendorRegister = () => {
  const { user, role, vendorId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    description: "",
    contact_phone: "",
    contact_email: "",
    location: "",
  });

  useEffect(() => {
    if (!user) navigate("/auth");
    if (vendorId) navigate("/vendor/dashboard");
  }, [user, vendorId, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Create vendor profile (role assignment happens when admin approves)
      const { error: vendorError } = await supabase.from("vendors").insert({
        user_id: user.id,
        ...formData,
      });

      if (vendorError) throw vendorError;

      toast.success("Vendor registration submitted! Please wait for admin approval.");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary via-sky-light to-accent">
        <div className="container mx-auto px-4 text-center">
          <Building2 className="h-12 w-12 text-primary-foreground mx-auto mb-4" />
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-primary-foreground mb-6">
            Register as a Vendor
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            List your paragliding services on AasmanWale and reach more customers.
          </p>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-card p-8 rounded-2xl shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company Name *</label>
                <Input name="company_name" value={formData.company_name} onChange={handleChange} placeholder="Your Company Name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <Textarea name="description" value={formData.description} onChange={handleChange} placeholder="Tell us about your services..." rows={4} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone *</label>
                  <Input name="contact_phone" value={formData.contact_phone} onChange={handleChange} placeholder="+91 98765 43210" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                  <Input name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} placeholder="company@email.com" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <Input name="location" value={formData.location} onChange={handleChange} placeholder="Bir Billing, Himachal Pradesh" />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Registration"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default VendorRegister;
