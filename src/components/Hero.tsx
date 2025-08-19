import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
interface CTA {
  text: string;
  href: string;
  variant: "default" | "outline" | "secondary" | "ghost" | "link";
  isDownload?: boolean;
}
interface HeroProps {
  title: React.ReactNode;
  subtitle: string;
  ctas?: CTA[];
  gradientBackground?: boolean;
  mediaRight?: {
    src: string;
    alt: string;
    className?: string;
  };
}
export function Hero({ title, subtitle, ctas, gradientBackground = false, mediaRight }: HeroProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionProps = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay },
        };
  const hasMedia = !!mediaRight;
  return (
    <section
      className={cn(
        "py-20 md:py-32",
        gradientBackground && "bg-gradient-to-b from-orange-50 via-amber-50 to-transparent dark:from-gray-900 dark:to-background"
      )}
    >
      <div className="container mx-auto max-w-6xl px-4">
        <div className={cn(
          "grid items-center gap-8",
          hasMedia ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        )}>
          <div className={cn(
            hasMedia ? "text-left" : "text-center max-w-4xl mx-auto"
          )}>
            <motion.h1
              {...motionProps(0)}
              className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight"
            >
              {title}
            </motion.h1>
            <motion.p
              {...motionProps(0.1)}
              className={cn(
                "mt-6 text-lg sm:text-xl text-muted-foreground",
                !hasMedia && "max-w-2xl mx-auto"
              )}
            >
              {subtitle}
            </motion.p>
            {ctas && (
              <motion.div
                {...motionProps(0.2)}
                className={cn(
                  "mt-8 flex flex-wrap gap-4",
                  !hasMedia && "justify-center"
                )}
              >
                {ctas.map((cta) => (
                  <Button key={cta.text} asChild size="lg" variant={cta.variant}>
                    {cta.isDownload ? (
                      <a href={cta.href} download>{cta.text}</a>
                    ) : (
                      <Link to={cta.href}>{cta.text}</Link>
                    )}
                  </Button>
                ))}
              </motion.div>
            )}
          </div>
          {mediaRight && (
            <motion.div {...motionProps(0.2)} className="flex justify-center items-center">
              <img
                src={mediaRight.src}
                alt={mediaRight.alt}
                loading="lazy"
                className={cn("rounded-lg shadow-lg border w-full max-w-md", mediaRight.className)}
              />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}