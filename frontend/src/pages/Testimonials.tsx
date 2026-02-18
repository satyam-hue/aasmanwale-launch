import { Layout } from "@/components/layout/Layout";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    location: "Mumbai, Maharashtra",
    rating: 5,
    date: "December 2024",
    text: "Absolutely incredible experience! The views of the Dhauladhar range were breathtaking. The pilot was super professional and made me feel safe throughout the entire flight. The video they captured is just amazing - I've watched it like 100 times! Highly recommend AasmanWale to anyone looking for a paragliding adventure.",
    package: "High Fly Adventure",
    avatar: "PS",
  },
  {
    id: 2,
    name: "Michael Chen",
    location: "Singapore",
    rating: 5,
    date: "November 2024",
    text: "Best adventure activity I've ever done, and I've tried many! The team at AasmanWale is truly top-notch. From the pickup from my hotel to the landing, everything was perfectly organized. The pilot explained everything clearly and even did some amazing acrobatics. Worth every rupee!",
    package: "Cross Country Epic",
    avatar: "MC",
  },
  {
    id: 3,
    name: "Rahul Verma",
    location: "Delhi, NCR",
    rating: 5,
    date: "October 2024",
    text: "This was my first time paragliding and I was honestly terrified at first. But the instructors at AasmanWale made me feel completely at ease. They explained everything, answered all my questions, and before I knew it, I was soaring over the beautiful valleys. Life-changing experience!",
    package: "Short Joy Ride",
    avatar: "RV",
  },
  {
    id: 4,
    name: "Sarah Johnson",
    location: "London, UK",
    rating: 5,
    date: "September 2024",
    text: "Came to India specifically for this and it exceeded all expectations! The Himalayan views are simply unparalleled. The team is super professional and the equipment is well-maintained. If you're in India, you HAVE to do this!",
    package: "High Fly Adventure",
    avatar: "SJ",
  },
  {
    id: 5,
    name: "Amit Patel",
    location: "Ahmedabad, Gujarat",
    rating: 5,
    date: "August 2024",
    text: "Took my parents here for their anniversary - they're both in their 60s and had the time of their lives! The team was so patient and caring with them. Special thanks to pilot Vikram for making it such a memorable day for our family.",
    package: "Short Joy Ride",
    avatar: "AP",
  },
  {
    id: 6,
    name: "Jennifer Lee",
    location: "Sydney, Australia",
    rating: 5,
    date: "July 2024",
    text: "As someone who has paraglided in multiple countries, I can say that Bir Billing with AasmanWale is among the best experiences I've had. The altitude, the views, the thermals - everything was perfect. Already planning my next trip!",
    package: "Cross Country Epic",
    avatar: "JL",
  },
];

const stats = [
  { value: "5000+", label: "Happy Flyers" },
  { value: "4.9/5", label: "Average Rating" },
  { value: "98%", label: "Would Recommend" },
  { value: "500+", label: "5-Star Reviews" },
];

const Testimonials = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary to-accent">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-primary-foreground/80 font-display font-semibold text-sm uppercase tracking-wider mb-4">
            Testimonials
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-foreground mb-6">
            What Our Flyers Say
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Don't just take our word for it. Here's what adventurers from around 
            the world have to say about their experience with AasmanWale.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-mountain-dark">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display font-bold text-3xl lg:text-4xl text-accent mb-1">
                  {stat.value}
                </div>
                <div className="text-primary-foreground/70 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-card p-8 rounded-2xl shadow-lg relative card-hover"
              >
                {/* Quote Icon */}
                <div className="absolute top-6 right-6 text-primary/10">
                  <Quote className="h-12 w-12" />
                </div>

                {/* Package Badge */}
                <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-4">
                  {testimonial.package}
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-muted-foreground mb-6 leading-relaxed relative z-10 line-clamp-5">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-display font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {testimonial.location} • {testimonial.date}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-4">
            Ready to Create Your Own Story?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of happy adventurers who've experienced the magic of 
            flying over the Himalayas with AasmanWale.
          </p>
          <a
            href="/packages"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-3 rounded-lg font-display font-semibold hover:bg-accent/90 transition-colors"
          >
            Book Your Adventure
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Testimonials;
