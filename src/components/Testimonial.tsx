import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
}
export function Testimonial({ quote, author, role }: TestimonialProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-6 h-full flex flex-col">
        <Quote className="w-8 h-8 text-primary mb-4" aria-hidden="true" />
        <figure className="flex flex-col flex-grow">
          <blockquote className="flex-grow">
            <p className="text-muted-foreground italic">"{quote}"</p>
          </blockquote>
          <figcaption className="mt-4 pt-4 border-t">
            <p className="font-semibold text-foreground">{author}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}