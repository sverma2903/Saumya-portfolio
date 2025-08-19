import { Testimonial } from "./Testimonial";
interface TestimonialData {
  quote: string;
  author: string;
  role: string;
}
interface TestimonialsListProps {
  testimonials: TestimonialData[];
}
export function TestimonialsList({ testimonials }: TestimonialsListProps) {
  if (!testimonials || testimonials.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold font-display text-center mb-12">
        What Collaborators Say
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {testimonials.map((testimonial, index) => (
          <Testimonial
            key={index}
            quote={testimonial.quote}
            author={testimonial.author}
            role={testimonial.role}
          />
        ))}
      </div>
    </section>
  );
}