import { ProjectCard } from "@/components/ProjectCard";
import { Hero } from "@/components/Hero";
import { projects } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
export function Archive() {
  const archivedProjects = projects.filter(p => p.archived);
  return (
    <>
      <Hero
        title="Project Archive"
        subtitle="A collection of earlier work, hackathon projects, and design challenges. These represent learning experiences and explorations along my journey."
      />
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        {archivedProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {archivedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No archived projects yet. Check back later!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}