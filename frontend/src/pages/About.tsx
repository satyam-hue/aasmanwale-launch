import { Layout } from "@/components/layout/Layout";
import { Mountain, Target, Heart, Award, Users } from "lucide-react";
import tandemImage from "@/assets/tandem-flight.jpg";
import takeoffImage from "@/assets/bir-billing-takeoff.jpg";

const stats = [
  { value: "10+", label: "Years Experience" },
  { value: "5000+", label: "Happy Flyers" },
  { value: "50+", label: "Expert Pilots" },
  { value: "100%", label: "Safety Record" },
];

const values = [
  {
    icon: Mountain,
    title: "Adventure Spirit",
    description: "We believe everyone deserves to experience the freedom of flight over the Himalayas.",
  },
  {
    icon: Target,
    title: "Safety First",
    description: "Every decision we make prioritizes the safety and well-being of our flyers.",
  },
  {
    icon: Heart,
    title: "Passion for Flying",
    description: "Our love for paragliding drives us to deliver exceptional experiences every day.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "We maintain the highest standards in equipment, training, and customer service.",
  },
];

const About = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={takeoffImage}
            alt="Bir Billing takeoff site"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-mountain-dark/80 to-mountain-dark/95" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-4">
            About Us
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-foreground mb-6">
            Our Story
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            From a small team of passionate pilots to India's most trusted 
            paragliding company — this is AasmanWale.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-3">
                Our Journey
              </span>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-6">
                Born from a Love for <span className="text-primary">the Sky</span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  AasmanWale was founded in 2014 by a group of passionate paragliding 
                  enthusiasts who fell in love with the skies above Bir Billing. What 
                  started as a small operation with just two pilots has grown into one 
                  of India's most respected paragliding companies.
                </p>
                <p>
                  The name "AasmanWale" — which translates to "People of the Sky" in 
                  Hindi — perfectly captures our philosophy. We believe that the sky 
                  belongs to everyone, and our mission is to share the incredible 
                  experience of free flight with adventurers from around the world.
                </p>
                <p>
                  Based in Bir Billing, Himachal Pradesh — renowned as the paragliding 
                  capital of India and host of the 2015 Paragliding World Cup — we 
                  offer tandem flights that combine breathtaking Himalayan views with 
                  the highest safety standards in the industry.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src={tandemImage}
                alt="Tandem paragliding experience"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -left-6 bg-accent text-accent-foreground p-6 rounded-xl shadow-lg">
                <div className="font-display font-bold text-4xl">2014</div>
                <div className="text-sm">Established</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-sky-light">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display font-bold text-4xl lg:text-5xl text-primary-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-primary-foreground/80 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-3">
              Our Values
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">
              What Drives Us
            </h2>
            <p className="text-muted-foreground text-lg">
              These core values guide everything we do at AasmanWale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-card p-6 rounded-2xl shadow-md text-center card-hover"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-3">
              Our Team
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">
              Meet the <span className="text-primary">Sky Masters</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Our certified pilots bring years of experience and a passion for 
              sharing the joy of flight with every adventurer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { name: "Vikram Singh", role: "Chief Pilot", exp: "15 years", initials: "VS" },
              { name: "Rajan Thakur", role: "Senior Instructor", exp: "12 years", initials: "RT" },
              { name: "Amit Sharma", role: "Operations Head", exp: "10 years", initials: "AS" },
            ].map((member) => (
              <div key={member.name} className="text-center group">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 text-primary-foreground font-display font-bold text-3xl group-hover:scale-110 transition-transform duration-300">
                  {member.initials}
                </div>
                <h3 className="font-display font-semibold text-xl text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="text-primary font-medium text-sm mb-1">{member.role}</p>
                <p className="text-muted-foreground text-sm">{member.exp} experience</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
