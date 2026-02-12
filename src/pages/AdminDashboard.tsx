import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Settings, Users, DollarSign, BookOpen, Plus } from "lucide-react";

interface Vendor {
  id: string;
  company_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  location: string | null;
  is_approved: boolean;
  created_at: string;
}

interface AdminBooking {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  commission_amount: number;
  vendor_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  vendors: { company_name: string } | null;
  packages: { name: string } | null;
}

const AdminDashboard = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [commission, setCommission] = useState<number>(15);
  const [commissionId, setCommissionId] = useState<string | null>(null);
  const [allPackages, setAllPackages] = useState<{ id: string; name: string; vendor_id: string; vendors: { company_name: string } | null }[]>([]);
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualForm, setManualForm] = useState({
    package_id: "",
    vendor_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    notes: "",
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (role && role !== "admin") { navigate("/"); return; }
    if (role === "admin") fetchData();
  }, [user, role]);

  const fetchData = async () => {
    const [vendorRes, bookingRes, commissionRes, pkgRes] = await Promise.all([
      supabase.from("vendors").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("*, vendors(company_name), packages(name)").order("created_at", { ascending: false }),
      supabase.from("commission_settings").select("*").limit(1).single(),
      supabase.from("packages").select("id, name, vendor_id, vendors(company_name)").eq("is_active", true),
    ]);

    if (vendorRes.data) setVendors(vendorRes.data);
    if (bookingRes.data) setBookings(bookingRes.data as any);
    if (commissionRes.data) {
      setCommission(Number(commissionRes.data.percentage));
      setCommissionId(commissionRes.data.id);
    }
    if (pkgRes.data) setAllPackages(pkgRes.data as any);
  };

  const handleApproveVendor = async (vendorId: string, approve: boolean) => {
    const { error } = await supabase.from("vendors").update({ is_approved: approve }).eq("id", vendorId);
    if (error) { toast.error(error.message); return; }

    if (approve) {
      // Add vendor role to user
      const vendor = vendors.find((v) => v.id === vendorId);
      if (vendor) {
        const { data: vendorData } = await supabase.from("vendors").select("user_id").eq("id", vendorId).single();
        if (vendorData) {
          await supabase.from("user_roles").upsert(
            { user_id: vendorData.user_id, role: "vendor" as any },
            { onConflict: "user_id,role" }
          );
        }
      }
    }

    toast.success(approve ? "Vendor approved!" : "Vendor rejected");
    fetchData();
  };

  const handleUpdateCommission = async () => {
    if (!commissionId) return;
    const { error } = await supabase.from("commission_settings").update({ percentage: commission, updated_by: user?.id }).eq("id", commissionId);
    if (error) { toast.error(error.message); return; }
    toast.success("Commission updated!");
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: { ...manualForm, is_manual_booking: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Manual booking created!");
      setShowManualBooking(false);
      setManualForm({ package_id: "", vendor_id: "", customer_name: "", customer_email: "", customer_phone: "", notes: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    } finally {
      setManualLoading(false);
    }
  };

  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalCommission = bookings.reduce((sum, b) => sum + Number(b.commission_amount), 0);

  if (role !== "admin") return <Layout><div className="pt-32 pb-20 text-center"><p>Loading...</p></div></Layout>;

  return (
    <Layout>
      <section className="pt-32 pb-8 bg-gradient-to-br from-primary via-sky-light to-accent">
        <div className="container mx-auto px-4">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-primary-foreground mb-2">Admin Dashboard</h1>
          <p className="text-primary-foreground/80">Manage vendors, bookings, and platform settings</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-6 bg-background border-b">
        <div className="container mx-auto px-4 grid sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Vendors", value: vendors.length },
            { icon: BookOpen, label: "Total Bookings", value: bookings.length },
            { icon: DollarSign, label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}` },
            { icon: Settings, label: "Commission Earned", value: `₹${totalCommission.toLocaleString()}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-card p-4 rounded-xl shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-display font-bold text-lg text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="vendors">
            <TabsList className="mb-6">
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* VENDORS TAB */}
            <TabsContent value="vendors">
              <h2 className="font-display font-bold text-xl text-foreground mb-6">Vendor Management</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-display font-semibold text-foreground">Company</th>
                      <th className="p-3 font-display font-semibold text-foreground">Email</th>
                      <th className="p-3 font-display font-semibold text-foreground">Location</th>
                      <th className="p-3 font-display font-semibold text-foreground">Status</th>
                      <th className="p-3 font-display font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.id} className="border-b">
                        <td className="p-3 text-foreground font-medium">{v.company_name}</td>
                        <td className="p-3 text-muted-foreground">{v.contact_email}</td>
                        <td className="p-3 text-muted-foreground">{v.location}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${v.is_approved ? "bg-secondary/20 text-secondary" : "bg-accent/20 text-accent"}`}>
                            {v.is_approved ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td className="p-3 flex gap-2">
                          {!v.is_approved && (
                            <button onClick={() => handleApproveVendor(v.id, true)} className="text-secondary hover:underline text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Approve
                            </button>
                          )}
                          {v.is_approved && (
                            <button onClick={() => handleApproveVendor(v.id, false)} className="text-destructive hover:underline text-xs flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {vendors.length === 0 && <tr><td colSpan={5} className="p-3 text-muted-foreground text-center">No vendors yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* BOOKINGS TAB */}
            <TabsContent value="bookings">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display font-bold text-xl text-foreground">All Bookings</h2>
                <Button onClick={() => setShowManualBooking(!showManualBooking)} variant="default" size="sm">
                  <Plus className="h-4 w-4" /> Manual Booking
                </Button>
              </div>

              {showManualBooking && (
                <div className="bg-card p-6 rounded-xl shadow-md mb-6 max-w-lg">
                  <h3 className="font-display font-semibold text-foreground mb-4">Create Manual Booking</h3>
                  <form onSubmit={handleManualBooking} className="space-y-3">
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={manualForm.package_id}
                      onChange={(e) => {
                        const pkg = allPackages.find((p) => p.id === e.target.value);
                        setManualForm({ ...manualForm, package_id: e.target.value, vendor_id: pkg?.vendor_id || "" });
                      }}
                      required
                    >
                      <option value="">Select Package</option>
                      {allPackages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({(p.vendors as any)?.company_name})</option>
                      ))}
                    </select>
                    <Input placeholder="Customer Name" value={manualForm.customer_name} onChange={(e) => setManualForm({ ...manualForm, customer_name: e.target.value })} required />
                    <Input type="email" placeholder="Customer Email" value={manualForm.customer_email} onChange={(e) => setManualForm({ ...manualForm, customer_email: e.target.value })} required />
                    <Input placeholder="Phone (optional)" value={manualForm.customer_phone} onChange={(e) => setManualForm({ ...manualForm, customer_phone: e.target.value })} />
                    <div className="flex gap-2">
                      <Button type="submit" variant="hero" size="sm" disabled={manualLoading}>{manualLoading ? "Creating..." : "Create Booking"}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowManualBooking(false)}>Cancel</Button>
                    </div>
                  </form>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-display font-semibold text-foreground">Customer</th>
                      <th className="p-3 font-display font-semibold text-foreground">Vendor</th>
                      <th className="p-3 font-display font-semibold text-foreground">Package</th>
                      <th className="p-3 font-display font-semibold text-foreground">Total</th>
                      <th className="p-3 font-display font-semibold text-foreground">Commission</th>
                      <th className="p-3 font-display font-semibold text-foreground">Vendor Amt</th>
                      <th className="p-3 font-display font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b">
                        <td className="p-3 text-foreground">{b.customer_name}</td>
                        <td className="p-3 text-muted-foreground">{b.vendors?.company_name || "-"}</td>
                        <td className="p-3 text-muted-foreground">{b.packages?.name || "-"}</td>
                        <td className="p-3 text-foreground font-semibold">₹{b.total_amount}</td>
                        <td className="p-3 text-accent font-semibold">₹{b.commission_amount}</td>
                        <td className="p-3 text-secondary font-semibold">₹{b.vendor_amount}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            b.status === "confirmed" ? "bg-secondary/20 text-secondary" :
                            b.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                            "bg-accent/20 text-accent"
                          }`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && <tr><td colSpan={7} className="p-3 text-muted-foreground text-center">No bookings yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings">
              <h2 className="font-display font-bold text-xl text-foreground mb-6">Platform Settings</h2>
              <div className="bg-card p-6 rounded-xl shadow-md max-w-md">
                <h3 className="font-display font-semibold text-foreground mb-4">Commission Rate</h3>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={commission}
                    onChange={(e) => setCommission(Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">%</span>
                  <Button onClick={handleUpdateCommission} variant="hero" size="sm">Update</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">This percentage is deducted from each booking as platform commission.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default AdminDashboard;
