import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Briefcase } from 'lucide-react';
import { Seo } from '@/components/Seo';
export function NotFound() {
  return (
    <>
      <Seo
        title="Page Not Found"
        description="The page you are looking for does not exist."
      />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] text-center px-4 py-16">
        <h1 className="text-6xl md:text-9xl font-bold font-display text-primary">404</h1>
        <h2 className="mt-4 text-2xl md:text-4xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mt-4 max-w-md text-muted-foreground">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or maybe it never existed.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/work">
              <Briefcase className="mr-2 h-4 w-4" />
              View My Work
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}