import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Package, Clock, Calendar, Plus, Trash2, Edit2, CheckCircle, XCircle, Wallet, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  calculateVendorEarnings, 
  getVendorWallet, 
  getVendorSettlements, 
  getVendorPayouts,
  getVendorBookingsFinancials,
  formatCurrency,
  formatDate
} from "@/lib/earningsCalculator";

interface VendorPackage {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  max_altitude: string | null;
  includes: string[] | null;
  is_active: boolean;
}

interface TimeSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_available: boolean;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  packages: { name: string } | null;
  time_slots: { slot_date: string; start_time: string } | null;
}

interface VendorEarnings {
  total_gross: number;
  commission: number;
  earnings: number;
  completed_count: number;
  pending_count: number;
  confirmed_count: number;
}

interface SettlementTx {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

const VendorDashboard = () => {
  const { user, vendorId } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<any>(null);
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);

  // Earnings states
  const [earnings, setEarnings] = useState<VendorEarnings | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [settlements, setSettlements] = useState<SettlementTx[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);

  const [packageForm, setPackageForm] = useState({
    name: "", description: "", duration_minutes: 30, price: 0,
    max_altitude: "", includes: "",
  });

  const [slotForm, setSlotForm] = useState({
    slot_date: "", start_time: "08:00", end_time: "09:00", capacity: 1,
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!vendorId) { navigate("/vendor/register"); return; }
    fetchData();
  }, [user, vendorId]);

  const fetchData = async () => {
    if (!vendorId) return;

    const [vendorRes, pkgRes, slotsRes, bookingsRes] = await Promise.all([
      supabase.from("vendors").select("*").eq("id", vendorId).single(),
      supabase.from("packages").select("*").eq("vendor_id", vendorId).order("created_at"),
      supabase.from("time_slots").select("*").eq("vendor_id", vendorId).order("slot_date"),
      supabase.from("bookings").select("*, packages(name), time_slots(slot_date, start_time)").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
    ]);

    if (vendorRes.data) setVendor(vendorRes.data);
    if (pkgRes.data) setPackages(pkgRes.data);
    if (slotsRes.data) setTimeSlots(slotsRes.data);
    if (bookingsRes.data) setBookings(bookingsRes.data as any);

    // Fetch earnings data
    fetchEarningsData();
  };

  const fetchEarningsData = async () => {
    if (!vendorId) return;
    setEarningsLoading(true);
    try {
      const [earnData, walletData, settlementData, payoutData] = await Promise.all([
        calculateVendorEarnings(vendorId),
        getVendorWallet(vendorId),
        getVendorSettlements(vendorId),
        getVendorPayouts(vendorId),
      ]);

      setEarnings(earnData);
      setWalletBalance(walletData?.balance || 0);
      setSettlements(settlementData || []);
      setPayouts(payoutData || []);
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    } finally {
      setEarningsLoading(false);
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;

    const includesArr = packageForm.includes.split(",").map((s) => s.trim()).filter(Boolean);

    const payload = {
      vendor_id: vendorId,
      name: packageForm.name,
      description: packageForm.description,
      duration_minutes: packageForm.duration_minutes,
      price: packageForm.price,
      max_altitude: packageForm.max_altitude || null,
      includes: includesArr.length > 0 ? includesArr : null,
    };

    let error;
    if (editingPackage) {
      ({ error } = await supabase.from("packages").update(payload).eq("id", editingPackage));
    } else {
      ({ error } = await supabase.from("packages").insert(payload));
    }

    if (error) { toast.error(error.message); return; }
    toast.success(editingPackage ? "Package updated!" : "Package added!");
    setShowPackageForm(false);
    setEditingPackage(null);
    setPackageForm({ name: "", description: "", duration_minutes: 30, price: 0, max_altitude: "", includes: "" });
    fetchData();
  };

  const handleDeletePackage = async (id: string) => {
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Package deleted");
    fetchData();
  };

  const handleEditPackage = (pkg: VendorPackage) => {
    setPackageForm({
      name: pkg.name,
      description: pkg.description || "",
      duration_minutes: pkg.duration_minutes,
      price: pkg.price,
      max_altitude: pkg.max_altitude || "",
      includes: (pkg.includes || []).join(", "),
    });
    setEditingPackage(pkg.id);
    setShowPackageForm(true);
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;

    const { error } = await supabase.from("time_slots").insert({
      vendor_id: vendorId,
      ...slotForm,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Time slot added!");
    setShowSlotForm(false);
    setSlotForm({ slot_date: "", start_time: "08:00", end_time: "09:00", capacity: 1 });
    fetchData();
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase.from("time_slots").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Slot deleted");
    fetchData();
  };

  const handleBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Booking ${status}`);
    fetchData();
  };

  if (!vendor) return <Layout><div className="pt-32 pb-20 text-center"><p>Loading...</p></div></Layout>;

  return (
    <Layout>
      <section className="pt-32 pb-8 bg-gradient-to-br from-primary via-sky-light to-accent">
        <div className="container mx-auto px-4">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-primary-foreground mb-2">
            Vendor Dashboard
          </h1>
          <p className="text-primary-foreground/80">
            {vendor.company_name} {!vendor.is_approved && <span className="bg-accent/20 text-accent-foreground px-2 py-1 rounded text-xs ml-2">Pending Approval</span>}
          </p>
        </div>
      </section>

      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="packages">
            <TabsList className="mb-6">
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="slots">Time Slots</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

            {/* PACKAGES TAB */}
            <TabsContent value="packages">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display font-bold text-xl text-foreground">Your Packages</h2>
                <Button onClick={() => { setShowPackageForm(!showPackageForm); setEditingPackage(null); }} variant="default" size="sm">
                  <Plus className="h-4 w-4" /> Add Package
                </Button>
              </div>

              {showPackageForm && (
                <div className="bg-card p-6 rounded-xl shadow-md mb-6">
                  <form onSubmit={handleAddPackage} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input placeholder="Package Name" value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} required />
                      <Input type="number" placeholder="Price (₹)" value={packageForm.price || ""} onChange={(e) => setPackageForm({ ...packageForm, price: Number(e.target.value) })} required />
                    </div>
                    <Textarea placeholder="Description" value={packageForm.description} onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })} />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input type="number" placeholder="Duration (minutes)" value={packageForm.duration_minutes} onChange={(e) => setPackageForm({ ...packageForm, duration_minutes: Number(e.target.value) })} />
                      <Input placeholder="Max Altitude" value={packageForm.max_altitude} onChange={(e) => setPackageForm({ ...packageForm, max_altitude: e.target.value })} />
                    </div>
                    <Input placeholder="Includes (comma-separated)" value={packageForm.includes} onChange={(e) => setPackageForm({ ...packageForm, includes: e.target.value })} />
                    <div className="flex gap-2">
                      <Button type="submit" variant="hero" size="sm">{editingPackage ? "Update" : "Save"} Package</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setShowPackageForm(false); setEditingPackage(null); }}>Cancel</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-card p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-display font-semibold text-lg text-foreground">{pkg.name}</h3>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditPackage(pkg)} className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeletePackage(pkg.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{pkg.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {pkg.duration_minutes} min</span>
                      <span className="font-display font-bold text-primary text-lg">₹{pkg.price}</span>
                    </div>
                    {pkg.includes && pkg.includes.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        {pkg.includes.map((item, i) => <li key={i}>• {item}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
                {packages.length === 0 && <p className="text-muted-foreground col-span-full">No packages yet. Add your first package!</p>}
              </div>
            </TabsContent>

            {/* TIME SLOTS TAB */}
            <TabsContent value="slots">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display font-bold text-xl text-foreground">Time Slots</h2>
                <Button onClick={() => setShowSlotForm(!showSlotForm)} variant="default" size="sm">
                  <Plus className="h-4 w-4" /> Add Slot
                </Button>
              </div>

              {showSlotForm && (
                <div className="bg-card p-6 rounded-xl shadow-md mb-6">
                  <form onSubmit={handleAddSlot} className="space-y-4">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Input type="date" value={slotForm.slot_date} onChange={(e) => setSlotForm({ ...slotForm, slot_date: e.target.value })} required />
                      <Input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} required />
                      <Input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} required />
                      <Input type="number" placeholder="Capacity" value={slotForm.capacity} onChange={(e) => setSlotForm({ ...slotForm, capacity: Number(e.target.value) })} min={1} required />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" variant="hero" size="sm">Save Slot</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowSlotForm(false)}>Cancel</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-display font-semibold text-foreground">Date</th>
                      <th className="p-3 font-display font-semibold text-foreground">Time</th>
                      <th className="p-3 font-display font-semibold text-foreground">Capacity</th>
                      <th className="p-3 font-display font-semibold text-foreground">Booked</th>
                      <th className="p-3 font-display font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot) => (
                      <tr key={slot.id} className="border-b">
                        <td className="p-3 text-foreground">{slot.slot_date}</td>
                        <td className="p-3 text-muted-foreground">{slot.start_time} - {slot.end_time}</td>
                        <td className="p-3 text-muted-foreground">{slot.capacity}</td>
                        <td className="p-3 text-muted-foreground">{slot.booked_count}</td>
                        <td className="p-3">
                          <button onClick={() => handleDeleteSlot(slot.id)} className="text-destructive hover:underline text-xs">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {timeSlots.length === 0 && (
                      <tr><td colSpan={5} className="p-3 text-muted-foreground text-center">No time slots yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* EARNINGS TAB */}
            <TabsContent value="earnings">
              <h2 className="font-display font-bold text-xl text-foreground mb-6">Earnings & Commissions</h2>
              
              {earningsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading earnings data...</div>
              ) : earnings ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Wallet Balance</span>
                        <Wallet className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-display font-bold text-2xl text-primary">{formatCurrency(walletBalance)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Available for withdrawal</p>
                    </div>

                    <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Gross Amount</span>
                        <TrendingUp className="h-4 w-4 text-secondary" />
                      </div>
                      <p className="font-display font-bold text-2xl text-secondary">{formatCurrency(earnings.total_gross)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{earnings.completed_count} completed</p>
                    </div>

                    <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Commission Paid</span>
                        <TrendingUp className="h-4 w-4 text-accent" />
                      </div>
                      <p className="font-display font-bold text-2xl text-accent">{formatCurrency(earnings.commission)}</p>
                      <p className="text-xs text-muted-foreground mt-1">~{((earnings.commission / earnings.total_gross) * 100).toFixed(1)}% of gross</p>
                    </div>

                    <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Your Earnings</span>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="font-display font-bold text-2xl text-green-500">{formatCurrency(earnings.earnings)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{earnings.confirmed_count + earnings.pending_count} active</p>
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                    <h3 className="font-display font-semibold text-lg text-foreground mb-4">Booking Status Breakdown</h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Completed Bookings</p>
                        <p className="font-display font-bold text-lg text-secondary">{earnings.completed_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Confirmed & Pending</p>
                        <p className="font-display font-bold text-lg text-accent">{earnings.confirmed_count + earnings.pending_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                        <p className="font-display font-bold text-lg text-primary">{formatCurrency(earnings.total_gross)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Settlements Table */}
                  {settlements.length > 0 && (
                    <div className="bg-card p-6 rounded-xl shadow-md border border-border overflow-x-auto">
                      <h3 className="font-display font-semibold text-lg text-foreground mb-4">Settlement History</h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-3 font-display font-semibold text-foreground">Date</th>
                            <th className="p-3 font-display font-semibold text-foreground">Reason</th>
                            <th className="p-3 font-display font-semibold text-foreground text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlements.map((tx) => (
                            <tr key={tx.id} className="border-b">
                              <td className="p-3 text-muted-foreground">{formatDate(tx.created_at)}</td>
                              <td className="p-3 text-foreground">{tx.reason}</td>
                              <td className="p-3 text-right font-semibold text-primary">{formatCurrency(tx.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Payouts Table */}
                  {payouts.length > 0 && (
                    <div className="bg-card p-6 rounded-xl shadow-md border border-border overflow-x-auto">
                      <h3 className="font-display font-semibold text-lg text-foreground mb-4">Payout History</h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-3 font-display font-semibold text-foreground">Date</th>
                            <th className="p-3 font-display font-semibold text-foreground">Amount</th>
                            <th className="p-3 font-display font-semibold text-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payouts.map((payout) => (
                            <tr key={payout.id} className="border-b">
                              <td className="p-3 text-muted-foreground">{formatDate(payout.created_at)}</td>
                              <td className="p-3 font-semibold text-primary">{formatCurrency(payout.amount)}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  payout.status === "completed" ? "bg-green-100 text-green-700" :
                                  payout.status === "pending" ? "bg-accent/20 text-accent" :
                                  "bg-destructive/20 text-destructive"
                                }`}>{payout.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No earnings data available yet.</div>
              )}
            </TabsContent>
            <TabsContent value="bookings">
              <h2 className="font-display font-bold text-xl text-foreground mb-6">Bookings</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-3 font-display font-semibold text-foreground">Customer</th>
                      <th className="p-3 font-display font-semibold text-foreground">Package</th>
                      <th className="p-3 font-display font-semibold text-foreground">Date</th>
                      <th className="p-3 font-display font-semibold text-foreground">Amount</th>
                      <th className="p-3 font-display font-semibold text-foreground">Status</th>
                      <th className="p-3 font-display font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b">
                        <td className="p-3 text-foreground">{b.customer_name}<br /><span className="text-xs text-muted-foreground">{b.customer_email}</span></td>
                        <td className="p-3 text-muted-foreground">{b.packages?.name || "-"}</td>
                        <td className="p-3 text-muted-foreground">{b.time_slots?.slot_date || "-"}</td>
                        <td className="p-3 text-foreground font-semibold">₹{b.total_amount}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            b.status === "confirmed" ? "bg-secondary/20 text-secondary" :
                            b.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                            "bg-accent/20 text-accent"
                          }`}>{b.status}</span>
                        </td>
                        <td className="p-3 flex gap-1">
                          {b.status === "pending" && (
                            <>
                              <button onClick={() => handleBookingStatus(b.id, "confirmed")} className="text-secondary hover:underline text-xs flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Confirm
                              </button>
                              <button onClick={() => handleBookingStatus(b.id, "cancelled")} className="text-destructive hover:underline text-xs flex items-center gap-1 ml-2">
                                <XCircle className="h-3 w-3" /> Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr><td colSpan={6} className="p-3 text-muted-foreground text-center">No bookings yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default VendorDashboard;
