import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, ImageOff } from "lucide-react";
import type { Project } from "@/lib/constants";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

interface ProjectCardProps {
  project: Project;
}

function ImageWrapper({ projectTitle, imageUrl }: { projectTitle: string; imageUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);

  if (!imageUrl || imgError) {
    return (
      <div className="w-full h-40 sm:h-48 bg-muted flex items-center justify-center overflow-hidden">
        <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <img
        src={imageUrl}
        alt={`${projectTitle} screenshot`}
        loading="lazy"
        onError={() => setImgError(true)}
        className="w-full h-40 sm:h-48 object-cover transition-transform duration-300 group-hover:scale-105 motion-safe:group-hover:scale-105"
      />
    </div>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
        whileHover: {
          y: -5,
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
      };

  return (
    <motion.div {...motionProps} className="h-full group">
      <Card
        role="article"
        tabIndex={0}
        className="flex flex-col h-full overflow-hidden transition-all duration-300 border-border/60 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <ImageWrapper projectTitle={project.title} imageUrl={project.imageUrl} />
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{project.title}</CardTitle>
          {project.archived && (
            <Badge variant="secondary" className="w-fit">
              Archived
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
          <div>
            <p className="font-semibold text-sm text-primary">Problem</p>
            <CardDescription>{project.shortProblem}</CardDescription>
          </div>
          <div>
            <p className="font-semibold text-sm text-primary">Outcome</p>
            <CardDescription>{project.shortOutcome}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {project.methods.slice(0, 3).map((method) => (
              <Badge key={method} variant="outline">
                {method}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          {project.archived ? (
            <Button variant="outline" className="w-full" disabled aria-disabled="true">
              View case study <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button asChild variant="default" className="w-full">
              <Link to={`/work/${project.slug}`}>
                View case study <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
//