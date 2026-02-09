import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  const phoneNumber = "919876543210"; // Replace with actual WhatsApp number
  const message = encodeURIComponent(
    "Hi AasmanWale! I'm interested in booking a paragliding experience at Bir Billing. Can you help me with the available packages and dates?"
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Book via WhatsApp"
    >
      <div className="relative">
        {/* Pulse animation ring */}
        <div className="absolute inset-0 bg-secondary rounded-full animate-ping opacity-30" />
        
        {/* Button */}
        <div className="relative flex items-center gap-3 bg-secondary text-secondary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-float group-hover:scale-105">
          <MessageCircle className="h-6 w-6" />
          <span className="font-display font-semibold text-sm hidden sm:block">
            Book on WhatsApp
          </span>
        </div>
      </div>
    </a>
  );
}
