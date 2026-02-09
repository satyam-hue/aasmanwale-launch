import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, ArrowRight } from "lucide-react";
import tandemImage from "@/assets/tandem-flight.jpg";
import takeoffImage from "@/assets/bir-billing-takeoff.jpg";

const packages = [
  {
    id: "short-flight",
    name: "Short Joy Ride",
    duration: "10-15 mins",
    altitude: "2000+ ft",
    price: 2500,
    originalPrice: 3000,
    description: "Perfect introduction to paragliding with stunning valley views.",
    image: tandemImage,
    popular: false,
  },
  {
    id: "medium-flight",
    name: "High Fly Adventure",
    duration: "20-25 mins",
    altitude: "4000+ ft",
    price: 3500,
    originalPrice: 4000,
    description: "Extended flight with acrobatic maneuvers and HD video included.",
    image: takeoffImage,
    popular: true,
  },
  {
    id: "long-flight",
    name: "Cross Country",
    duration: "30-45 mins",
    altitude: "6000+ ft",
    price: 5500,
    originalPrice: 6500,
    description: "Ultimate experience flying across valleys with panoramic views.",
    image: tandemImage,
    popular: false,
  },
];

export function PackagesPreview() {
  return (
    <section className="py-20 lg:py-32 section-gradient">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-3">
            Our Packages
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            Choose Your <span className="text-primary">Adventure</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            From thrilling short rides to epic cross-country flights, 
            we have the perfect package for every adventurer.
          </p>
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-card rounded-2xl overflow-hidden shadow-lg card-hover relative group"
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute top-4 right-4 z-10 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-display font-semibold flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Most Popular
                </div>
              )}

              {/* Image */}
              <div className="aspect-[4/3] image-zoom">
                <img
                  src={pkg.image}
                  alt={pkg.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="font-display font-bold text-xl text-foreground mb-2">
                  {pkg.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {pkg.description}
                </p>

                {/* Details */}
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-primary" />
                    {pkg.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-primary" />
                    Tandem
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="font-display font-bold text-2xl text-primary">
                    ₹{pkg.price.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground line-through text-sm">
                    ₹{pkg.originalPrice.toLocaleString()}
                  </span>
                  <span className="text-accent text-sm font-semibold">
                    {Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% OFF
                  </span>
                </div>

                {/* CTA */}
                <Button asChild variant={pkg.popular ? "hero" : "default"} className="w-full">
                  <Link to={`/packages#${pkg.id}`}>
                    Book Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/packages">
              View All Packages
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
