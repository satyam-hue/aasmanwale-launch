import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import takeoffImage from "@/assets/bir-billing-takeoff.jpg";

export function CTASection() {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={takeoffImage}
          alt="Paragliders preparing for takeoff at Bir Billing"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-mountain-dark/95 via-mountain-dark/80 to-mountain-dark/60" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-4">
            Ready to Fly?
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-primary-foreground mb-6 leading-tight">
            Book Your Himalayan 
            <span className="text-accent"> Adventure </span>
            Today
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
            Don't just dream about flying — make it happen! Join thousands of 
            adventurers who've soared over the majestic Himalayas with AasmanWale. 
            Limited slots available for the season.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="hero" size="xl">
              <Link to="/packages">
                Book Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="heroOutline" size="xl">
              <a href="tel:+919876543210">
                <Phone className="h-5 w-5" />
                Call Us Now
              </a>
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="mt-10 flex flex-wrap items-center gap-6 text-primary-foreground/60 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              Instant Confirmation
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              Free Cancellation
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              Best Price Guarantee
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
