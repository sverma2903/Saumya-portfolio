import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion';
const grid = [
  ['D', 'A', 'T', 'A', 'I', 'N', 'F', 'O', 'R', 'M', 'E', 'D'],
  ['E', 'F', 'I', 'G', 'M', 'A', 'L', 'P', 'E', 'O', 'V', 'E'],
  ['S', 'I', 'N', 'T', 'E', 'R', 'V', 'I', 'E', 'W', 'S', 'S'],
  ['I', 'N', 'S', 'I', 'G', 'H', 'T', 'S', 'S', 'E', 'A', 'I'],
  ['G', 'T', 'E', 'R', 'A', 'T', 'I', 'O', 'N', 'A', 'R', 'G'],
  ['N', 'E', 'S', 'T', 'I', 'N', 'G', 'U', 'T', 'R', 'C', 'N'],
];
const words = [
  { id: 'data', text: 'DATA', coords: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'design', text: 'DESIGN', coords: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]] },
  { id: 'figma', text: 'FIGMA', coords: [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5]] },
  { id: 'interviews', text: 'INTERVIEWS', coords: [[2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [2, 11]] },
  { id: 'insights', text: 'INSIGHTS', coords: [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8]] },
  { id: 'testing', text: 'TESTING', coords: [[5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8]] },
];
const coordSet = new Set(words.flatMap(w => w.coords.map(c => `${c[0]},${c[1]}`)));
export function Crossword() {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [pinnedWord, setPinnedWord] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: 0.2 },
      };
  const highlightedWordId = pinnedWord || hoveredWord;
  const highlightedCoords = new Set(
    words.find(w => w.id === highlightedWordId)?.coords?.map(c => `${c[0]},${c[1]}`) ?? []
  );
  const handleWordClick = (wordId: string) => {
    setPinnedWord(prev => (prev === wordId ? null : wordId));
  };
  const pinnedWordData = words.find(w => w.id === pinnedWord);
  return (
    <motion.div
      {...motionProps}
      className="grid grid-cols-1 md:grid-cols-3 items-center justify-center gap-8 md:gap-12 p-4"
    >
      <div className="flex flex-wrap justify-center md:flex-col gap-2 md:justify-self-end">
        {words.map(word => (
          <Button
            key={word.id}
            onMouseEnter={() => setHoveredWord(word.id)}
            onMouseLeave={() => setHoveredWord(null)}
            onFocus={() => setHoveredWord(word.id)}
            onBlur={() => setHoveredWord(null)}
            onClick={() => handleWordClick(word.id)}
            aria-pressed={pinnedWord === word.id}
            variant="ghost"
            className={cn(
              'px-3 py-1 rounded-md text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              highlightedWordId === word.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/20'
            )}
          >
            {word.text}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-1 font-mono text-sm">
        {grid.flat().map((letter, i) => {
          const row = Math.floor(i / 12);
          const col = i % 12;
          const coord = `${row},${col}`;
          const isHighlighted = highlightedCoords.has(coord);
          const isPartOfAnyWord = coordSet.has(coord);
          return (
            <motion.div
              key={i}
              animate={{ scale: isHighlighted && !prefersReducedMotion ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-sm transition-colors duration-200',
                isHighlighted ? 'bg-primary text-primary-foreground' : 'bg-muted',
                !isPartOfAnyWord && 'opacity-30'
              )}
            >
              {letter}
            </motion.div>
          );
        })}
      </div>
      <div className="h-24 md:h-full flex items-center justify-center md:justify-self-start">
        <AnimatePresence>
          {pinnedWordData && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="font-display text-4xl md:text-5xl font-bold text-primary tracking-widest"
            >
              {pinnedWordData.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}