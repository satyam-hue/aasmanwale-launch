import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Users, Camera, Check, Star, ArrowRight, Calendar, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchCustomerPackages } from "@/lib/packageQueries";
import tandemImage from "@/assets/tandem-flight.jpg";
import takeoffImage from "@/assets/bir-billing-takeoff.jpg";
import canopyImage from "@/assets/paraglider-canopy.jpg";

const fallbackImages = [tandemImage, takeoffImage, canopyImage];

interface VendorPackage {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  max_altitude: string | null;
  includes: string[] | null;
  is_active: boolean;
  vendor_id: string;
  vendors: { company_name: string; location: string | null } | null;
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

const addons = [
  { name: "Extra HD Video", price: 500, description: "Additional camera angle footage" },
  { name: "Drone Footage", price: 1500, description: "Stunning aerial drone video" },
  { name: "Photo Package+", price: 800, description: "50+ professionally edited photos" },
  { name: "Private Slot", price: 1000, description: "Skip the queue, priority takeoff" },
];

const Packages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    notes: "",
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const publishedPackages = await fetchCustomerPackages();
      setPackages(publishedPackages as any);
      
      // Debug log to help identify visibility issues
      if (publishedPackages.length === 0) {
        console.warn(
          "[PACKAGE VISIBILITY DEBUG] No packages returned. Possible causes:",
          "- No vendors are approved",
          "- No packages are active (is_active=true)",
          "- No future time slots exist with available capacity",
          "- RLS policies blocking access"
        );
      } else {
        console.log(`[PACKAGE VISIBILITY] Showing ${publishedPackages.length} bookable packages`);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Failed to load packages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = async (pkg: VendorPackage) => {
    setSelectedPackage(pkg.id);
    setSelectedSlot(null);
    setShowBookingForm(false);

    // Fetch available time slots for this vendor
    const { data } = await supabase
      .from("time_slots")
      .select("*")
      .eq("vendor_id", pkg.vendor_id)
      .eq("is_available", true)
      .gte("slot_date", new Date().toISOString().split("T")[0])
      .order("slot_date")
      .order("start_time");

    setTimeSlots((data || []).filter((s) => s.booked_count < s.capacity));
  };

  const handleBookNow = () => {
    if (!selectedPackage) {
      toast.error("Please select a package first");
      return;
    }
    if (!user) {
      toast.error("Please sign in to book");
      return;
    }
    setShowBookingForm(true);
    setBookingForm({
      customer_name: "",
      customer_email: user.email || "",
      customer_phone: "",
      notes: "",
    });
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    const pkg = packages.find((p) => p.id === selectedPackage);
    if (!pkg) return;

    setBookingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          package_id: pkg.id,
          vendor_id: pkg.vendor_id,
          time_slot_id: selectedSlot || null,
          ...bookingForm,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Booking created successfully! You'll receive a confirmation email.");
      setShowBookingForm(false);
      setSelectedPackage(null);
      setSelectedSlot(null);
    } catch (err: any) {
      toast.error(err.message || "Booking failed");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-primary via-sky-light to-accent">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-display font-semibold text-sm uppercase tracking-wider mb-4">
            Packages & Pricing
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-foreground mb-6">
            Choose Your Flight
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            From quick joy rides to epic cross-country adventures — find the 
            perfect paragliding experience for you.
          </p>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading packages...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No packages available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {packages.map((pkg, index) => (
                <div
                  key={pkg.id}
                  className={`bg-card rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                    selectedPackage === pkg.id ? "ring-2 ring-accent scale-105" : "hover:shadow-xl"
                  }`}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  {/* Image */}
                  <div className="aspect-video image-zoom">
                    <img
                      src={fallbackImages[index % fallbackImages.length]}
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">
                        {pkg.vendors?.company_name || "Vendor"} {pkg.vendors?.location ? `• ${pkg.vendors.location}` : ""}
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-2xl text-foreground mb-2">
                      {pkg.name}
                    </h2>
                    <p className="text-muted-foreground mb-4">{pkg.description}</p>

                    {/* Details */}
                    <div className="flex flex-wrap gap-4 mb-6 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        {pkg.duration_minutes} min
                      </div>
                      {pkg.max_altitude && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4 text-primary" />
                          {pkg.max_altitude}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Camera className="h-4 w-4 text-primary" />
                        Tandem Flight
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-3 mb-6">
                      <span className="font-display font-bold text-3xl text-primary">
                        ₹{pkg.price.toLocaleString()}
                      </span>
                    </div>

                    {/* Includes */}
                    {pkg.includes && pkg.includes.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-display font-semibold text-sm text-foreground mb-3">
                          What's Included:
                        </h4>
                        <ul className="space-y-2">
                          {pkg.includes.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CTA */}
                    <Button
                      variant={selectedPackage === pkg.id ? "hero" : "default"}
                      className="w-full"
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPackage(pkg);
                        handleBookNow();
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                      Book This Package
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Time Slot Selection */}
          {selectedPackage && timeSlots.length > 0 && (
            <div className="mt-12 max-w-2xl mx-auto">
              <h3 className="font-display font-bold text-xl text-foreground mb-4">Select a Time Slot</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedSlot === slot.id
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <p className="font-display font-semibold text-foreground">{slot.slot_date}</p>
                    <p className="text-sm text-muted-foreground">{slot.start_time} - {slot.end_time}</p>
                    <p className="text-xs text-muted-foreground mt-1">{slot.capacity - slot.booked_count} spots left</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Booking Form */}
          {showBookingForm && (
            <div className="mt-8 max-w-lg mx-auto bg-card p-8 rounded-2xl shadow-lg">
              <h3 className="font-display font-bold text-xl text-foreground mb-6">Complete Your Booking</h3>
              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                  <Input
                    value={bookingForm.customer_name}
                    onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                  <Input
                    type="email"
                    value={bookingForm.customer_email}
                    onChange={(e) => setBookingForm({ ...bookingForm, customer_email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <Input
                    value={bookingForm.customer_phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                  <Input
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    placeholder="Any special requirements..."
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={bookingLoading}>
                  {bookingLoading ? "Processing..." : "Confirm Booking"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-4">
              Enhance Your Experience
            </h2>
            <p className="text-muted-foreground">
              Add these extras to make your flight even more memorable.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {addons.map((addon) => (
              <div
                key={addon.name}
                className="bg-card p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {addon.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-3">{addon.description}</p>
                <div className="font-display font-bold text-xl text-accent">
                  +₹{addon.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Info */}
      <section className="py-16 bg-mountain-dark text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display font-bold text-2xl sm:text-3xl mb-6">
              How to Book
            </h2>
            <div className="grid sm:grid-cols-3 gap-8 mb-10">
              {[
                { step: "1", title: "Choose Package", desc: "Select your preferred flight experience" },
                { step: "2", title: "Pick a Date", desc: "Choose from available slots" },
                { step: "3", title: "Confirm & Pay", desc: "Secure your spot with easy payment" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground font-display font-bold text-xl flex items-center justify-center mx-auto mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-primary-foreground/70 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="hero" size="xl">
              <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                Start Booking
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Packages;