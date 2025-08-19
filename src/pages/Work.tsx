import { useState, useMemo } from 'react';
import { ProjectCard } from "@/components/ProjectCard";
import { Hero } from "@/components/Hero";
import { projects } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
export function Work() {
  const allMethods = useMemo(() => {
    const methods = new Set<string>();
    projects.forEach(p => p.methods.forEach(m => methods.add(m)));
    return Array.from(methods);
  }, [projects]);
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    projects.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [projects]);
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const filteredProjects = useMemo(() => {
    const nonArchived = projects.filter(p => !p.archived);
    let results = nonArchived;
    if (selectedMethod !== 'all') {
      results = results.filter(p => p.methods.includes(selectedMethod));
    }
    if (selectedTag !== 'all') {
      results = results.filter(p => p.tags?.includes(selectedTag));
    }
    return results;
  }, [selectedMethod, selectedTag, projects]);
  return (
    <>
      <Hero
        title="My Work"
        subtitle="A selection of projects where I've translated messy research and product data into clear decisions, measurable outcomes, and shippable design work."
      />
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="mb-8 flex justify-end space-x-4">
          <div>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {allMethods.map(method => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No projects match the selected filter.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}