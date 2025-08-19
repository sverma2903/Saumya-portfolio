import { Link, NavLink, Outlet } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { prefetchImage } from "@/components/PrefetchImage";
import { projects } from "@/lib/constants";
const navLinks = [
  { to: "/", label: "Home" },
  { to: "/work", label: "Work" },
  { to: "/notes", label: "Notes" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/archive", label: "Archive" },
];
const externalOrigins = [
  "https://www.saumyaverma.com",
  "https://media.giphy.com",
  "https://fonts.googleapis.com",
  "https://cdn.jsdelivr.net",
];
const firstFeaturedProjectImage = projects.find(p => p.featured)?.imageUrl;
const heroGifUrl = firstFeaturedProjectImage ?? "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb252a2ZqZ2Z0a2Z0a2Z0a2Z0a2Z0a2Z0a2Z0a2Z0/l3q2SaisW2UWWiaKA/giphy.gif";
export function Layout() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return false;
    }
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);
  useEffect(() => {
    const head = document.head;
    const addedLinks: HTMLLinkElement[] = [];
    externalOrigins.forEach(origin => {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = origin;
      head.appendChild(preconnectLink);
      addedLinks.push(preconnectLink);
      const dnsPrefetchLink = document.createElement('link');
      dnsPrefetchLink.rel = 'dns-prefetch';
      dnsPrefetchLink.href = origin;
      head.appendChild(dnsPrefetchLink);
      addedLinks.push(dnsPrefetchLink);
    });
    if (heroGifUrl) prefetchImage(heroGifUrl);
    if (firstFeaturedProjectImage && firstFeaturedProjectImage !== heroGifUrl) prefetchImage(firstFeaturedProjectImage);
    return () => {
      addedLinks.forEach(link => head.removeChild(link));
    };
  }, []);
  const toggleTheme = () => setIsDark(!isDark);
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to main content
      </a>
      <header role="banner" aria-label="Primary header" className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            to="/"
            className="font-display text-xl font-bold"
            aria-label="Saumya Verma homepage"
            onMouseEnter={() => prefetchImage(heroGifUrl)}
          >
            Saumya Verma
          </Link>
          <div className="flex items-center gap-4">
            <nav role="navigation" aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onMouseEnter={() => {
                    if (label === 'Home') prefetchImage(heroGifUrl);
                    if (label === 'Work' && firstFeaturedProjectImage) prefetchImage(firstFeaturedProjectImage);
                  }}
                  className={({ isActive }) =>
                    `transition-colors hover:text-primary ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <Button variant="outline" asChild className="hidden md:inline-flex">
              <a href="https://www.saumyaverma.com/Saumya-Verma-Resume.pdf" target="_blank" rel="noopener noreferrer" aria-label="Download resume (opens in new tab)">Resume</a>
            </Button>
            <Button onClick={toggleTheme} variant="ghost" size="icon" aria-label="Toggle color theme">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <nav role="navigation" aria-label="Primary mobile" className="flex flex-col gap-6 mt-8 text-lg">
                    {navLinks.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `transition-colors hover:text-primary ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`
                        }
                      >
                        {label}
                      </NavLink>
                    ))}
                     <Button variant="outline" asChild>
                        <a href="https://www.saumyaverma.com/Saumya-Verma-Resume.pdf" target="_blank" rel="noopener noreferrer" aria-label="Download resume (opens in new tab)">Resume</a>
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}