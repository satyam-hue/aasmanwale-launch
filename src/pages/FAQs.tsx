import { Layout } from "@/components/layout/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqCategories = [
  {
    name: "Booking & Pricing",
    faqs: [
      {
        question: "How do I book a paragliding flight?",
        answer: "You can book directly through our website by selecting your preferred package, choosing a date, and completing the payment. Alternatively, you can WhatsApp us at +91 98765 43210 or call us directly. We recommend booking at least 2-3 days in advance during peak season.",
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit/debit cards, UPI, net banking, and popular wallets like Paytm, PhonePe, and Google Pay. For international visitors, we also accept PayPal. Cash payment is available at our office in Bir.",
      },
      {
        question: "What is your cancellation policy?",
        answer: "We offer free cancellation up to 24 hours before your scheduled flight. Cancellations within 24 hours will incur a 50% fee. Weather-related cancellations are always fully refunded or rescheduled for free.",
      },
      {
        question: "Are there any hidden charges?",
        answer: "No, the price you see includes everything mentioned in the package. The only additional costs are optional add-ons like extra video footage or drone shots, which are clearly priced on our packages page.",
      },
    ],
  },
  {
    name: "Before Your Flight",
    faqs: [
      {
        question: "What should I wear for the flight?",
        answer: "Wear comfortable, layered clothing as it gets colder at altitude. Closed-toe shoes are mandatory. Avoid loose items like scarves or dangling jewelry. We provide windbreaker jackets if needed. In winter, bring a warm jacket.",
      },
      {
        question: "What is the weight limit for paragliding?",
        answer: "For safety reasons, participants must weigh between 30 kg and 110 kg. This is to ensure optimal glider performance and safety during flight. If you're close to the limit, please contact us to discuss.",
      },
      {
        question: "Is there an age restriction?",
        answer: "The minimum age is 12 years, and participants under 18 require written parental consent. There's no upper age limit as long as you're in reasonable health. We've successfully flown many guests in their 70s!",
      },
      {
        question: "What if I have health issues?",
        answer: "If you have heart conditions, severe respiratory issues, recent surgeries, or spinal problems, we recommend consulting your doctor first. Pregnant women should not fly. Please inform us of any health conditions when booking.",
      },
    ],
  },
  {
    name: "During Your Flight",
    faqs: [
      {
        question: "Is paragliding safe?",
        answer: "Tandem paragliding with experienced pilots is very safe. Our pilots have 10+ years of experience and hold international certifications. We use top-quality equipment, follow strict safety protocols, and only fly in suitable weather conditions.",
      },
      {
        question: "Will I feel scared or sick?",
        answer: "Most people don't experience motion sickness as paragliding is smooth and gentle - quite different from roller coasters! Initial nervousness is normal but usually disappears within minutes of takeoff. Our pilots are experts at keeping you comfortable.",
      },
      {
        question: "How high will we fly?",
        answer: "Depending on your package, you'll fly between 2,000-6,000 ft above the landing site. The takeoff point at Billing is at 2,400m (7,900 ft) altitude. The views of the Dhauladhar range are spectacular!",
      },
      {
        question: "Can I do acrobatics?",
        answer: "Yes! Our High Fly Adventure and Cross Country packages include optional acrobatic maneuvers like wingover and spiral dives. Just let your pilot know if you're interested (or not interested!) before the flight.",
      },
    ],
  },
  {
    name: "Weather & Timing",
    faqs: [
      {
        question: "What is the best time to visit Bir Billing?",
        answer: "The best flying months are March to June and September to November. July-August has monsoon rains. December-February can be cold but offers stunning snow-capped mountain views. We fly year-round weather permitting.",
      },
      {
        question: "What happens if the weather is bad?",
        answer: "Safety is our top priority. If weather conditions are unsuitable, we'll either reschedule your flight to later in the day, the next day, or issue a full refund. We monitor weather constantly and will inform you in advance if there are concerns.",
      },
      {
        question: "What time of day is best for flying?",
        answer: "Morning flights (8-11 AM) typically have calmer conditions, perfect for beginners. Afternoon flights (2-5 PM) have stronger thermals, allowing for longer flights and more acrobatics. Both offer stunning views!",
      },
    ],
  },
  {
    name: "Logistics",
    faqs: [
      {
        question: "Do you provide transportation?",
        answer: "Our High Fly Adventure and Cross Country packages include free hotel pickup within Bir. For Short Joy Ride, pickup is available at an additional cost. We'll drive you to the Billing takeoff site (about 30 minutes) and you'll fly back to Bir landing.",
      },
      {
        question: "How do I reach Bir Billing?",
        answer: "The nearest airport is Dharamshala/Gaggal (50 km). You can also take a train to Pathankot (120 km) or bus from Delhi (10-12 hours). From Dharamshala, Bir is about 1.5 hours by taxi. We can help arrange transportation.",
      },
      {
        question: "Where can I stay in Bir?",
        answer: "Bir has many accommodation options from budget hostels (₹500/night) to luxury resorts (₹5,000+/night). We can recommend places based on your budget. Book in advance during peak season (Oct-Nov, Mar-May).",
      },
    ],
  },
];

const FAQs = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-mountain-dark to-primary">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-4">
            FAQs
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-foreground mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Got questions? We've got answers. Find everything you need to know 
            about paragliding with AasmanWale.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {faqCategories.map((category) => (
            <div key={category.name} className="mb-12">
              <h2 className="font-display font-bold text-2xl text-foreground mb-6 flex items-center gap-3">
                <HelpCircle className="h-6 w-6 text-primary" />
                {category.name}
              </h2>
              <Accordion type="single" collapsible className="space-y-4">
                {category.faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`${category.name}-${index}`}
                    className="bg-card rounded-xl px-6 shadow-sm border-none"
                  >
                    <AccordionTrigger className="text-left font-display font-medium text-foreground hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-4">
            Still Have Questions?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Can't find what you're looking for? Our team is here to help!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://wa.me/919876543210"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:bg-secondary/90 transition-colors"
            >
              WhatsApp Us
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:bg-primary/90 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FAQs;
