# Usage instructions

- Built with
    * React Router 6 for declarative client-side routing
    * ShadCN UI (v2.3.0) for customizable and accessible UI components built on Radix UI primitives
    * Tailwind CSS for utility-first styling
    * Lucide Icons (React) for modern and lightweight iconography
    * ESLint with sensible defaults and TypeScript support
    * Cloudflare Workers for serving and server-side processing

- Restrictions:
  * When including `tailwind.config.js`, **hardcode custom colors** directly in the config file – do **not** define them in `index.css` unless specified

- Styling:
  * Must generate **fully responsive** and accessible layouts
  * Use Shadcn preinstalled components rather than writing custom ones when possible
  * Use **Tailwind's spacing, layout, and typography utilities** for all custom components

- Components
  * All Shadcn components are available and can be imported from @/components/ui/...
  * Do not write custom components if shadcn components are available
  * Icons from Lucide should be imported directly from `lucide-react`

**NOTE: ErrorBoundary and related Error handling components and code are already implemented but hidden**

- Animation:
  * Use `framer-motion`'s `motion` components to animate sections on scroll or page load
  * You can integrate variants and transitions using Tailwind utility classes alongside motion props

Components available:
```sh
$ ls -1 src/components/ui
accordion.tsx
alert-dialog.tsx
alert.tsx
aspect-ratio.tsx
avatar.tsx
badge.tsx
breadcrumb.tsx
button.tsx
calendar.tsx
card.tsx
carousel.tsx
chart.tsx
checkbox.tsx
collapsible.tsx
command.tsx
context-menu.tsx
dialog.tsx
drawer.tsx
dropdown-menu.tsx
form.tsx
hover-card.tsx
input-otp.tsx
input.tsx
label.tsx
menubar.tsx
navigation-menu.tsx
pagination.tsx
popover.tsx
progress.tsx
radio-group.tsx
resizable.tsx
scroll-area.tsx
select.tsx
separator.tsx
sheet.tsx
sidebar.tsx
skeleton.tsx
slider.tsx
sonner.tsx
switch.tsx
table.tsx
tabs.tsx
textarea.tsx
toast.tsx
toggle-group.tsx
toggle.tsx
tooltip.tsx
```

Usage Example:
```tsx file="example.tsx"
        import { Button } from '@/components/ui/button'
        import { CardContent, Card } from '@/components/ui/card'
        import { MousePointerClickIcon } from 'lucide-react';
        // custom hook for example ignore
        import { useStopwatch } from '../hooks/useStopwatch'

        export function Stopwatch({ initialTime = 0 }) {
        const { time, isRunning, start, pause, reset } = useStopwatch(initialTime);

        return (
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-4">
              <div 
                className="text-6xl font-bold tabular-nums" 
                aria-live="polite"
                aria-atomic="true"
              >
                {time}
              </div>
              <div className="flex gap-4">
                <Button 
                  onClick={isRunning ? pause : start}
                  aria-pressed={isRunning}
                >
                  <MousePointerClickIcon className="text-yellow-400 size-4" />
                  {isRunning ? 'Pause' : 'Start'}
                </Button>
                <Button 
                  onClick={reset}
                  disabled={time === 0 && !isRunning}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )
        }
```

The backend routes (worker logic) are defined in the `worker/index.ts` file. For any server-side processing, define appropriate routes, types and controllers in the worker, **BUT BE CAREFUL** You can easily break everything so make sure you follow the **exact** pattern in the worker file to add any new routes