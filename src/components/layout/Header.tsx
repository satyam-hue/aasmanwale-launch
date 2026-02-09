import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Packages", href: "/packages" },
  { name: "Gallery", href: "/gallery" },
  { name: "Safety", href: "/safety" },
  { name: "FAQs", href: "/faqs" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-card/95 backdrop-blur-md shadow-lg py-2"
          : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className={cn(
              "p-2 rounded-lg transition-all duration-300",
              isScrolled ? "bg-primary" : "bg-primary-foreground/20 backdrop-blur-sm"
            )}>
              <Mountain className={cn(
                "h-6 w-6 transition-colors",
                isScrolled ? "text-primary-foreground" : "text-primary-foreground"
              )} />
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "font-display font-bold text-xl leading-tight transition-colors",
                isScrolled ? "text-primary" : "text-primary-foreground"
              )}>
                AasmanWale
              </span>
              <span className={cn(
                "text-xs font-medium leading-tight transition-colors hidden sm:block",
                isScrolled ? "text-muted-foreground" : "text-primary-foreground/80"
              )}>
                Fly Above the Himalayas
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "font-medium text-sm transition-colors hover:text-accent relative group",
                  location.pathname === item.href
                    ? isScrolled ? "text-accent" : "text-accent"
                    : isScrolled ? "text-foreground" : "text-primary-foreground"
                )}
              >
                {item.name}
                <span className={cn(
                  "absolute -bottom-1 left-0 h-0.5 bg-accent transition-all duration-300",
                  location.pathname === item.href ? "w-full" : "w-0 group-hover:w-full"
                )} />
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:block">
            <Button asChild variant={isScrolled ? "hero" : "hero"} size="lg">
              <Link to="/packages">Book Now</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              "lg:hidden p-2 rounded-lg transition-colors",
              isScrolled 
                ? "text-foreground hover:bg-muted" 
                : "text-primary-foreground hover:bg-primary-foreground/10"
            )}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        <div className={cn(
          "lg:hidden overflow-hidden transition-all duration-300",
          isMobileMenuOpen ? "max-h-96 mt-4" : "max-h-0"
        )}>
          <div className={cn(
            "rounded-xl p-4 space-y-2",
            isScrolled ? "bg-muted" : "bg-primary-foreground/10 backdrop-blur-md"
          )}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block px-4 py-2 rounded-lg font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : isScrolled 
                      ? "text-foreground hover:bg-background"
                      : "text-primary-foreground hover:bg-primary-foreground/10"
                )}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-2">
              <Button asChild variant="hero" className="w-full">
                <Link to="/packages">Book Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
