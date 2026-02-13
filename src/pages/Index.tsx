import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { PackagesPreview } from "@/components/home/PackagesPreview";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { useAuth } from "@/hooks/useAuth";
import { getCustomerBookings, formatCurrency, formatDate } from "@/lib/earningsCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, User, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerBooking {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  packages?: { name: string } | null;
  time_slots?: { slot_date: string; start_time: string } | null;
  vendors?: { company_name: string } | null;
}

const Index = () => {
  const { user, role } = useAuth();
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    if (user && role === "customer") {
      fetchCustomerBookings();
    }
  }, [user, role]);

  const fetchCustomerBookings = async () => {
    if (!user) return;
    setBookingsLoading(true);
    try {
      const bookingData = await getCustomerBookings(user.id);
      setBookings(bookingData as any);
    } catch (error) {
      console.error("Error fetching customer bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Show customer dashboard if logged in as customer
  if (user && role === "customer") {
    return (
      <Layout>
        <section className="pt-32 pb-8 bg-gradient-to-br from-primary via-sky-light to-accent">
          <div className="container mx-auto px-4">
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-primary-foreground mb-2">
              Welcome, {user.user_metadata?.full_name || "Explorer"}!
            </h1>
            <p className="text-primary-foreground/80">Your booking dashboard</p>
          </div>
        </section>

        <section className="py-8 bg-background">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="bookings">
              <TabsList className="mb-6">
                <TabsTrigger value="bookings">My Bookings</TabsTrigger>
                <TabsTrigger value="packages">Explore Packages</TabsTrigger>
              </TabsList>

              {/* BOOKINGS TAB */}
              <TabsContent value="bookings">
                <h2 className="font-display font-bold text-xl text-foreground mb-6">Your Bookings</h2>

                {bookingsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading your bookings...</div>
                ) : bookings.length > 0 ? (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-card p-4 rounded-xl shadow-md border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Bookings</p>
                          <p className="font-display font-bold text-lg text-foreground">{bookings.length}</p>
                        </div>
                      </div>

                      <div className="bg-card p-4 rounded-xl shadow-md border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Confirmed</p>
                          <p className="font-display font-bold text-lg text-foreground">{bookings.filter(b => b.status === "confirmed").length}</p>
                        </div>
                      </div>

                      <div className="bg-card p-4 rounded-xl shadow-md border border-border flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Spent</p>
                          <p className="font-display font-bold text-lg text-foreground">{formatCurrency(bookings.reduce((sum, b) => sum + b.total_amount, 0))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bookings List */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-3 font-display font-semibold text-foreground">Package</th>
                            <th className="p-3 font-display font-semibold text-foreground">Vendor</th>
                            <th className="p-3 font-display font-semibold text-foreground">Date</th>
                            <th className="p-3 font-display font-semibold text-foreground">Amount</th>
                            <th className="p-3 font-display font-semibold text-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((b) => (
                            <tr key={b.id} className="border-b">
                              <td className="p-3 text-foreground font-medium">{b.packages?.name || "Package"}</td>
                              <td className="p-3 text-muted-foreground">{b.vendors?.company_name || "-"}</td>
                              <td className="p-3 text-muted-foreground">{b.time_slots?.slot_date || "-"}</td>
                              <td className="p-3 text-foreground font-semibold">{formatCurrency(b.total_amount)}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  b.status === "confirmed" ? "bg-secondary/20 text-secondary" :
                                  b.status === "completed" ? "bg-green-100 text-green-700" :
                                  b.status === "cancelled" ? "bg-destructive/20 text-destructive" :
                                  "bg-accent/20 text-accent"
                                }`}>{b.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card rounded-xl border border-border">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No bookings yet. Explore packages to book your adventure!</p>
                  </div>
                )}
              </TabsContent>

              {/* PACKAGES TAB */}
              <TabsContent value="packages">
                <PackagesPreview />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <CTASection />
      </Layout>
    );
  }

  // Show default home page for non-logged-in users or other roles
  return (
    <Layout>
      <HeroSection />
      <PackagesPreview />
      <WhyChooseUs />
      <TestimonialsSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
