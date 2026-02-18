import { Shield, Award, Users, Camera, Headphones, MapPin } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "100% Safety Record",
    description: "All our pilots are certified with 10+ years of experience. Your safety is our top priority.",
  },
  {
    icon: Award,
    title: "Certified Instructors",
    description: "Our team holds international paragliding certifications and undergo regular training.",
  },
  {
    icon: Camera,
    title: "HD Video & Photos",
    description: "Every flight includes professional GoPro footage and stunning aerial photographs.",
  },
  {
    icon: Users,
    title: "5000+ Happy Flyers",
    description: "Join thousands of satisfied adventurers who've experienced the magic of Bir Billing.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our team is available round the clock to assist with bookings and queries.",
  },
  {
    icon: MapPin,
    title: "Prime Location",
    description: "Fly from Billing, Asia's second-highest paragliding site at 2400m altitude.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 lg:py-32 bg-mountain-dark text-primary-foreground relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-3">
            Why Choose Us
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4">
            Trusted by <span className="text-accent">Thousands</span> of Adventurers
          </h2>
          <p className="text-primary-foreground/70 text-lg">
            At AasmanWale, we combine safety, expertise, and unforgettable 
            experiences to make your dream of flying a reality.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10 hover:border-accent/50 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">
                {feature.title}
              </h3>
              <p className="text-primary-foreground/70 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
