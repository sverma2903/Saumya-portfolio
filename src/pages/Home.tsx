import { Hero } from "@/components/Hero";
import { ProjectCard } from "@/components/ProjectCard";
import { projects } from "@/lib/constants";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Crossword } from "@/components/Crossword";
import { Seo } from "@/components/Seo";
import { TestimonialsList } from "@/components/TestimonialsList";
const testimonials = [
  {
    quote: "Saumya's ability to synthesize complex data into actionable insights was a game-changer for our team. Her journey maps gave us a shared language and a clear path forward.",
    author: "Product Manager",
    role: "Conference of State Bank Supervisors (CSBS)",
  },
  {
    quote: "Her methodical approach to user testing and prototyping gave us the confidence to make bold product decisions. The usability lift was immediate and measurable.",
    author: "Lead Researcher",
    role: "UMD Digital Engagement Lab",
  },
];
export function Home() {
  const featuredProjects = projects.filter(p => p.featured);
  return (
    <>
      <Seo
        title="Home"
        description="Data-informed UXR & Product Designer. I turn research and product data into clear decisions and measurable outcomes."
      />
      <Hero
        title={
          <>
            Data-informed UXR & Product Designer.
            <br />
            <span className="text-primary">I turn research into decisions.</span>
          </>
        }
        subtitle="I translate messy research and product data into clear decisions and measurable outcomes."
        ctas={[
          { text: "View my work", href: "/work", variant: "default" },
          { text: "Get in touch", href: "/contact", variant: "outline" },
        ]}
        gradientBackground
        mediaRight={{
          src: "https://media.giphy.com/media/3o7btXIel4s5x3gG4w/giphy.gif",
          alt: "Animated GIF showing a data visualization process, representing data-driven UX.",
        }}
      />
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto max-w-6xl px-4 space-y-16">
          <Crossword />
          <TestimonialsList testimonials={testimonials} />
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-12">
              Featured Work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            <div className="text-center mt-12">
              <Button asChild variant="ghost">
                <Link to="/archive">
                  View project archive <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}