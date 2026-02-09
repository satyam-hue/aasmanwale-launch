import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, Play } from "lucide-react";
import heroImage from "@/assets/hero-paragliding.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Paragliding over Himalayan mountains at sunset"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-full px-4 py-2 mb-6 animate-fade-in-up">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-primary-foreground text-sm font-medium">
              #1 Rated Paragliding in Bir Billing
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-primary-foreground mb-6 leading-tight text-shadow-lg animate-fade-in-up animation-delay-200">
            Fly Above the
            <span className="block text-gradient-sky bg-clip-text text-transparent bg-gradient-to-r from-sky-light to-accent">
              Himalayas
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-primary-foreground/90 text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed text-shadow animate-fade-in-up animation-delay-400">
            Experience the thrill of soaring over the world's highest mountains 
            with India's most trusted paragliding experts at Bir Billing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-600">
            <Button asChild variant="hero" size="xl">
              <Link to="/packages">Book Your Adventure</Link>
            </Button>
            <Button asChild variant="heroOutline" size="xl">
              <Link to="/gallery" className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Watch Videos
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-xl mx-auto animate-fade-in-up animation-delay-600">
            {[
              { value: "5000+", label: "Happy Flyers" },
              { value: "10+", label: "Years Experience" },
              { value: "100%", label: "Safety Record" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display font-bold text-2xl sm:text-3xl text-accent mb-1">
                  {stat.value}
                </div>
                <div className="text-primary-foreground/70 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-8 w-8 text-primary-foreground/60" />
      </div>
    </section>
  );
}
