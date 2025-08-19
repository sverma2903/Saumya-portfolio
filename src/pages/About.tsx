import { Hero } from "@/components/Hero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Mail, Phone } from "lucide-react";
import { Seo } from "@/components/Seo";
const achievements = [
  "First Place & Social Innovation Prize, CMU XHacks 2025",
  "Winner, Usabilathon 2025 (Transurban)",
  "M.S. in Human-Computer Interaction, University of Maryland (4.0 GPA)",
];
const workPrinciples = [
  { title: "Discover", description: "Precise questions, right-sized methods, thoughtful sampling." },
  { title: "Synthesize", description: "Sharp insights, strong naming, visual maps that unlock alignment." },
  { title: "Decide", description: "Problem framing, trade-offs, and rationale that stakeholders can trust." },
  { title: "Validate", description: "Usability checks, small experiments, and measurable outcomes." },
  { title: "Evolve", description: "Components and patterns that scale decisions beyond a single screen." },
];
export function About() {
  const pageDescription = "I'm a data-informed UX Researcher and Product Designer who thrives on turning complexity into clarity. My background in architecture trained my eye for structure, constraints, and composition.";
  return (
    <>
      <Seo
        title="About"
        description={pageDescription}
      />
      <Hero
        title="About Saumya Verma"
        subtitle="I'm a data-informed UX Researcher and Product Designer who thrives on turning complexity into clarity."
      />
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl md:text-3xl font-bold font-display mb-4">My Story</h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>I gravitate to complex, rule-heavy systems because I enjoy the challenge of breaking ambiguity into understandable, actionable steps. My background in architecture trained my eye for structure, constraints, and composition—skills I now apply to digital experiences. I believe in balancing thoroughness with momentum, ensuring that research leads to real-world impact, not just reports.</p>
                <p>I treat stakeholders as partners, not hurdles, fostering a collaborative environment where we can solve problems together. My approach is methodical without being rigid, imaginative without being indulgent, and relentlessly focused on achieving measurable outcomes for both users and the business.</p>
              </div>
            </section>
            <section>
              <h2 className="text-2xl md:text-3xl font-bold font-display mb-4">How I Work</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {workPrinciples.map(p => (
                  <Card key={p.title}>
                    <CardHeader>
                      <CardTitle>{p.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{p.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-2xl md:text-3xl font-bold font-display mb-4">Tools of the Trade</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                I'm proficient with a range of tools including Figma, Framer, Adobe Creative Suite, Qualtrics, Miro, and Dovetail. I also have a working familiarity with HTML, CSS, JavaScript, Python, and R, which helps me communicate effectively with engineering partners.
              </p>
            </section>
          </div>
          <aside className="space-y-8 lg:sticky lg:top-24 self-start">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src="/images/saumya-verma.jpg" alt="A professional headshot of Saumya Verma." loading="lazy" />
                  <AvatarFallback>SV</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">Saumya Verma</h3>
                <p className="text-muted-foreground">College Park, MD</p>
                <div className="mt-4 space-y-2 w-full">
                  <Button variant="outline" asChild className="w-full">
                    <a href="mailto:sverma17@umd.edu"><Mail className="mr-2 h-4 w-4" /> Email</a>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <a href="tel:+12407911738"><Phone className="mr-2 h-4 w-4" /> Phone</a>
                  </Button>
                  <Button asChild className="w-full">
                    <a href="https://www.saumyaverma.com/Saumya-Verma-Resume.pdf" target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" /> Resume</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {achievements.map(a => <Badge key={a} variant="secondary" className="mr-2 mb-2 whitespace-normal text-left">{a}</Badge>)}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}