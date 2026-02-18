import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { X } from "lucide-react";
import heroImage from "@/assets/hero-paragliding.jpg";
import tandemImage from "@/assets/tandem-flight.jpg";
import takeoffImage from "@/assets/bir-billing-takeoff.jpg";
import canopyImage from "@/assets/paraglider-canopy.jpg";

const images = [
  { id: 1, src: heroImage, alt: "Paragliding at sunset over Himalayas", category: "flights" },
  { id: 2, src: tandemImage, alt: "Tandem paragliding experience", category: "tandem" },
  { id: 3, src: takeoffImage, alt: "Takeoff site at Bir Billing", category: "location" },
  { id: 4, src: canopyImage, alt: "Colorful paraglider canopy", category: "flights" },
  { id: 5, src: heroImage, alt: "Evening flight over valleys", category: "flights" },
  { id: 6, src: tandemImage, alt: "Happy flyers in the sky", category: "tandem" },
  { id: 7, src: takeoffImage, alt: "Morning at the takeoff point", category: "location" },
  { id: 8, src: canopyImage, alt: "Pilot preparing for flight", category: "flights" },
];

const categories = [
  { id: "all", name: "All Photos" },
  { id: "flights", name: "In-Flight" },
  { id: "tandem", name: "Tandem" },
  { id: "location", name: "Bir Billing" },
];

const Gallery = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedImage, setSelectedImage] = useState<typeof images[0] | null>(null);

  const filteredImages = activeCategory === "all" 
    ? images 
    : images.filter(img => img.category === activeCategory);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-mountain-dark to-primary">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-accent font-display font-semibold text-sm uppercase tracking-wider mb-4">
            Gallery
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-foreground mb-6">
            Captured Moments
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Explore breathtaking views and unforgettable experiences from our 
            flights over the majestic Himalayas.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-8 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-6 py-2 rounded-full font-display font-medium text-sm transition-all duration-300 ${
                  activeCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="aspect-square overflow-hidden rounded-xl cursor-pointer group"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-mountain-dark/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-primary-foreground hover:text-accent transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Video Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-4">
            See It in Action
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Watch our compilation of the most thrilling moments captured during 
            flights over Bir Billing.
          </p>
          <div className="aspect-video max-w-4xl mx-auto bg-mountain-dark rounded-2xl flex items-center justify-center">
            <p className="text-primary-foreground/60">
              Video content coming soon...
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Gallery;
