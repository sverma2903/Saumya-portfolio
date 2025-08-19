import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
export function Footer() {
  return (
    <footer className="py-8 text-center text-sm text-muted-foreground border-t">
      <div className="max-w-6xl mx-auto px-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="mailto:sverma17@umd.edu" className="hover:text-primary transition-colors">sverma17@umd.edu</a>
          <span className="hidden sm:inline">•</span>
          <span>College Park, MD</span>
          <span className="hidden sm:inline">•</span>
          <a href="https://www.saumyaverma.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">www.saumyaverma.com</a>
        </div>
        <div className="flex items-center justify-center gap-4">
            <Button variant="outline" asChild>
                <a href="https://www.saumyaverma.com/Saumya-Verma-Resume.pdf" target="_blank" rel="noopener noreferrer">Download Resume</a>
            </Button>
            <Button asChild>
                <Link to="/contact">Get in touch</Link>
            </Button>
        </div>
        <p className="text-xs">
          This site is designed to be accessible and respects reduced motion preferences.
        </p>
        <p className="text-xs">
          Built with ♡ at Cloudflare
        </p>
      </div>
    </footer>
  );
}