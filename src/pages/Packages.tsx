import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Clock, Users, Camera, Check, Star, ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import tandemImage from "@/assets/tandem-flight.jpg";
import takeoffImage from "@/assets/bir-billing-takeoff.jpg";
import canopyImage from "@/assets/paraglider-canopy.jpg";

const packages = [
  {
    id: "short-flight",
    name: "Short Joy Ride",
    duration: "10-15 minutes",
    altitude: "2000+ ft above landing",
    price: 2500,
    originalPrice: 3000,
    description: "Perfect first-time experience with stunning valley views. Ideal for those short on time or trying paragliding for the first time.",
    image: tandemImage,
    popular: false,
    includes: [
      "Tandem flight with certified pilot",
      "All safety equipment",
      "Pick-up from Bir landing site",
      "Basic photos (5-10 shots)",
      "Flight certificate",
    ],
  },
  {
    id: "medium-flight",
    name: "High Fly Adventure",
    duration: "20-25 minutes",
    altitude: "4000+ ft above landing",
    price: 3500,
    originalPrice: 4000,
    description: "Extended flight with optional acrobatic maneuvers. Perfect balance of thrill and scenic beauty with HD video included.",
    image: takeoffImage,
    popular: true,
    includes: [
      "Everything in Short Joy Ride",
      "HD GoPro video recording",
      "Professional photos (20+ shots)",
      "Optional acrobatic maneuvers",
      "Free hotel pick-up (within Bir)",
      "Refreshments post-flight",
    ],
  },
  {
    id: "long-flight",
    name: "Cross Country Epic",
    duration: "30-45 minutes",
    altitude: "6000+ ft above landing",
    price: 5500,
    originalPrice: 6500,
    description: "Ultimate Himalayan paragliding experience. Soar across multiple valleys with panoramic views of the Dhauladhar range.",
    image: canopyImage,
    popular: false,
    includes: [
      "Everything in High Fly Adventure",
      "Cross-country route over multiple valleys",
      "360° panoramic Himalayan views",
      "Advanced acrobatic options",
      "Priority booking & flexible timing",
      "Exclusive souvenir merchandise",
      "Free hotel pick-up & drop",
    ],
  },
];

const addons = [
  { name: "Extra HD Video", price: 500, description: "Additional camera angle footage" },
  { name: "Drone Footage", price: 1500, description: "Stunning aerial drone video" },
  { name: "Photo Package+", price: 800, description: "50+ professionally edited photos" },
  { name: "Private Slot", price: 1000, description: "Skip the queue, priority takeoff" },
];

const Packages = () => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

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
          <div className="grid lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                id={pkg.id}
                className={`bg-card rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                  selectedPackage === pkg.id ? "ring-2 ring-accent scale-105" : "hover:shadow-xl"
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="bg-accent text-accent-foreground text-center py-2 font-display font-semibold text-sm flex items-center justify-center gap-2">
                    <Star className="h-4 w-4" />
                    Most Popular Choice
                  </div>
                )}

                {/* Image */}
                <div className="aspect-video image-zoom">
                  <img
                    src={pkg.image}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h2 className="font-display font-bold text-2xl text-foreground mb-2">
                    {pkg.name}
                  </h2>
                  <p className="text-muted-foreground mb-4">{pkg.description}</p>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 mb-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      {pkg.duration}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      Tandem Flight
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Camera className="h-4 w-4 text-primary" />
                      Photos Included
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="font-display font-bold text-3xl text-primary">
                      ₹{pkg.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground line-through">
                      ₹{pkg.originalPrice.toLocaleString()}
                    </span>
                    <span className="bg-accent/10 text-accent px-2 py-1 rounded text-sm font-semibold">
                      Save ₹{(pkg.originalPrice - pkg.price).toLocaleString()}
                    </span>
                  </div>

                  {/* Includes */}
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

                  {/* CTA */}
                  <Button asChild variant={pkg.popular ? "hero" : "default"} className="w-full" size="lg">
                    <Link to="/contact">
                      <Calendar className="h-4 w-4" />
                      Book This Package
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
              <Link to="/contact">
                Start Booking
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Packages;
