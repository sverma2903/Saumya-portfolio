import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Send } from "lucide-react";
import { Link } from "react-router-dom";
interface CaseStudyLayoutProps {
  title: string;
  subtitle: string;
  meta: {
    scope: string;
    evidence: string;
    decisions: string;
    outcomes: string;
  };
  downloads?: { label: string; href: string }[];
  children: React.ReactNode;
}
export function CaseStudyLayout({ title, subtitle, meta, downloads, children }: CaseStudyLayoutProps) {
  return (
    <>
      <Hero title={title} subtitle={subtitle} gradientBackground />
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {children}
          </div>
          <aside className="space-y-8 lg:sticky lg:top-24 self-start">
            <Card>
              <CardHeader><CardTitle>At a Glance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Scope</h3>
                  <p className="text-sm text-muted-foreground">{meta.scope}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Evidence</h3>
                  <p className="text-sm text-muted-foreground">{meta.evidence}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Decisions</h3>
                  <p className="text-sm text-muted-foreground">{meta.decisions}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Outcomes</h3>
                  <p className="text-sm text-muted-foreground">{meta.outcomes}</p>
                </div>
              </CardContent>
            </Card>
            {downloads && downloads.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Downloads</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {downloads.map(d => (
                    <Button key={d.href} variant="outline" asChild className="w-full justify-start">
                      <a href={d.href} download>
                        <Download className="mr-2 h-4 w-4" /> {d.label}
                      </a>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>Let's Connect</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Interested in collaborating? I'd love to hear from you.</p>
                <Button asChild className="w-full">
                  <Link to="/contact"><Send className="mr-2 h-4 w-4" /> Get in Touch</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}