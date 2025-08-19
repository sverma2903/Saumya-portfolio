import { Hero } from "@/components/Hero";
import { Seo } from "@/components/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Bot } from "lucide-react";
const notes = [
  {
    title: "Research with Intention",
    description: "The most effective research starts with precise questions. It's not about using the most complex method, but the right method for the right depth at the right time. A well-framed question saves weeks of work.",
    link: "/work/csbs",
    linkText: "See how this was applied in the CSBS project"
  },
  {
    title: "Outcomes Over Ornament",
    description: "Clarity and impact are my guiding principles. Every design decision should be traceable back to user evidence and a business goal. If it doesn't solve a problem or move a metric, it's just decoration.",
    link: "/work/smart-story",
    linkText: "View the Smart Story Suite case study"
  },
  {
    title: "Systems Thinking",
    description: "I focus on creating reusable patterns and coherent flows that scale beyond a single screen. A good design system is a force multiplier for any product team, ensuring consistency and speeding up development.",
  },
  {
    title: "Ethical Storytelling",
    description: "A case study should be an honest reflection of the work. I believe in transparently sharing what worked, what didn't, and what I'd test next. Acknowledging constraints and celebrating collaborators is non-negotiable.",
  }
];
export function Notes() {
  return (
    <>
      <Seo
        title="Notes & Writing"
        description="Practical reflections on UX research, design, and decision-making."
      />
      <Hero
        title="Notes & Writing"
        subtitle="A collection of brief, practical reflections on research, design, and decision-making."
        gradientBackground
      />
      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16 space-y-16">
        <section>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-12">
            Practical Reflections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {notes.map((note) => (
              <Card key={note.title} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{note.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription>{note.description}</CardDescription>
                </CardContent>
                {note.link && (
                  <div className="p-6 pt-0">
                    <Button asChild variant="link" className="p-0 h-auto">
                      <Link to={note.link}>
                        {note.linkText} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
        <section>
          <Card className="bg-muted/50 dark:bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="mr-3 h-6 w-6 text-primary" />
                How I Use AI in UX
              </CardTitle>
              <CardDescription>
                My perspective on leveraging AI as a tool to augment, not replace, human judgment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                I see AI as a powerful assistant. It excels at tasks that benefit from speed and scale, like generating first drafts of survey questions, suggesting thematic clusters in qualitative data, or summarizing long transcripts. It's a fantastic starting point.
              </p>
              <p>
                However, human judgment remains irreplaceable for the critical steps: synthesis, ethical considerations, and final decision-making. AI can spot patterns, but a researcher provides the context, understands the nuance, and frames the insights in a way that drives meaningful action. My role is to guide the tool, validate its outputs, and own the strategic interpretation.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}