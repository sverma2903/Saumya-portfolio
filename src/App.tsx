import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
export function App() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const Container = prefersReducedMotion ? 'div' : motion.div;
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.5 },
      };
  return (
    <Container {...motionProps}>
      <Layout />
      <Toaster />
    </Container>
  );
}