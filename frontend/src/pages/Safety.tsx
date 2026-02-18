import { Layout } from "@/components/layout/Layout";
import { Shield, Award, CheckCircle, AlertTriangle, HeartPulse, Cloud } from "lucide-react";
import tandemImage from "@/assets/tandem-flight.jpg";

const safetyFeatures = [
  {
    icon: Award,
    title: "Certified Pilots",
    description: "All our pilots hold international certifications including BHPA, APPI, and Indian paragliding licenses with minimum 500+ flight hours.",
  },
  {
    icon: Shield,
    title: "Premium Equipment",
    description: "We use only EN-certified gliders from top manufacturers like Advance, Nova, and Ozone, replaced every 2-3 years.",
  },
  {
    icon: HeartPulse,
    title: "Reserve Parachute",
    description: "Every flight includes a backup reserve parachute that is regularly repacked and tested for emergency situations.",
  },
  {
    icon: Cloud,
    title: "Weather Monitoring",
    description: "We use advanced weather stations and only fly in optimal conditions. If weather isn't suitable, we reschedule for free.",
  },
];

const protocols = [
  "Pre-flight safety briefing for all participants",
  "Thorough equipment check before every flight",
  "Two-way radio communication throughout the flight",
  "Experienced ground crew at landing site",
  "First-aid trained staff always present",
  "Regular pilot training and skill updates",
  "Insurance coverage for all participants",
  "Strict weight and health guidelines",
];

const restrictions = [
  { condition: "Weight", requirement: "Must be between 30-110 kg" },
  { condition: "Age", requirement: "Minimum 12 years (with parental consent for minors)" },
  { condition: "Health", requirement: "No serious heart, spine, or respiratory conditions" },
  { condition: "Pregnancy", requirement: "Not recommended for pregnant women" },
  { condition: "Alcohol", requirement: "No flying under influence of alcohol/drugs" },
  { condition: "Weather", requirement: "Flights subject to suitable weather conditions" },
];

const Safety = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={tandemImage}
            alt="Safe tandem paragliding"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-mountain-dark/95 to-mountain-dark/70" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-4">
              Safety First
            </span>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-foreground mb-6">
              Your Safety is Our Priority
            </h1>
            <p className="text-primary-foreground/80 text-lg">
              At AasmanWale, we maintain the highest safety standards in the 
              industry. Our flawless safety record is a testament to our 
              commitment to your well-being.
            </p>
          </div>
        </div>
      </section>

      {/* Safety Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">
              Our Safety <span className="text-primary">Standards</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Every aspect of our operation is designed with your safety in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {safetyFeatures.map((feature) => (
              <div
                key={feature.title}
                className="bg-card p-6 rounded-2xl shadow-md text-center card-hover"
              >
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Protocols & Restrictions */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Protocols */}
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-6 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-secondary" />
                Safety Protocols
              </h2>
              <ul className="space-y-4">
                {protocols.map((protocol) => (
                  <li key={protocol} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-secondary" />
                    </div>
                    <span className="text-muted-foreground">{protocol}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Restrictions */}
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-6 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-accent" />
                Flying Restrictions
              </h2>
              <div className="bg-card rounded-2xl p-6 shadow-md">
                <p className="text-muted-foreground mb-6">
                  For your safety and the safety of others, please ensure you meet 
                  the following requirements before booking:
                </p>
                <div className="space-y-4">
                  {restrictions.map((item) => (
                    <div key={item.condition} className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="font-display font-semibold text-foreground min-w-[100px]">
                        {item.condition}
                      </div>
                      <div className="text-muted-foreground">{item.requirement}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-4">
            Ready to Fly Safely?
          </h2>
          <p className="mb-6 max-w-2xl mx-auto opacity-90">
            With our impeccable safety record and professional team, you're in 
            the best hands for your Himalayan adventure.
          </p>
          <a
            href="/packages"
            className="inline-flex items-center gap-2 bg-primary-foreground text-secondary px-8 py-3 rounded-lg font-display font-semibold hover:bg-primary-foreground/90 transition-colors"
          >
            Book Your Safe Flight
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Safety;
