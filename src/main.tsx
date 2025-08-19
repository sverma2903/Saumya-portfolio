import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { SuspenseFallback } from './components/SuspenseFallback';
// Lazy load pages
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Work = lazy(() => import('./pages/Work').then(module => ({ default: module.Work })));
const About = lazy(() => import('./pages/About').then(module => ({ default: module.About })));
const Contact = lazy(() => import('./pages/Contact').then(module => ({ default: module.Contact })));
const Archive = lazy(() => import('./pages/Archive').then(module => ({ default: module.Archive })));
const Notes = lazy(() => import('./pages/Notes').then(module => ({ default: module.Notes })));
const CsbsCaseStudy = lazy(() => import('./pages/case-studies/csbs').then(module => ({ default: module.CsbsCaseStudy })));
const SmartStoryCaseStudy = lazy(() => import('./pages/case-studies/smart-story').then(module => ({ default: module.SmartStoryCaseStudy })));
const MumbaiTransitCaseStudy = lazy(() => import('./pages/case-studies/mumbai-transit').then(module => ({ default: module.MumbaiTransitCaseStudy })));
const EducademyCaseStudy = lazy(() => import('./pages/case-studies/educademy').then(module => ({ default: module.EducademyCaseStudy })));
const Project = lazy(() => import('./pages/Project').then(module => ({ default: module.Project })));
const NotFound = lazy(() => import('./pages/NotFound').then(module => ({ default: module.NotFound })));
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Suspense fallback={<SuspenseFallback />}><Home /></Suspense> },
      { path: "work", element: <Suspense fallback={<SuspenseFallback />}><Work /></Suspense> },
      { path: "work/csbs", element: <Suspense fallback={<SuspenseFallback />}><CsbsCaseStudy /></Suspense> },
      { path: "work/smart-story", element: <Suspense fallback={<SuspenseFallback />}><SmartStoryCaseStudy /></Suspense> },
      { path: "work/mumbai-transit", element: <Suspense fallback={<SuspenseFallback />}><MumbaiTransitCaseStudy /></Suspense> },
      { path: "work/educademy", element: <Suspense fallback={<SuspenseFallback />}><EducademyCaseStudy /></Suspense> },
      { path: "work/:slug", element: <Suspense fallback={<SuspenseFallback />}><Project /></Suspense> },
      { path: "about", element: <Suspense fallback={<SuspenseFallback />}><About /></Suspense> },
      { path: "contact", element: <Suspense fallback={<SuspenseFallback />}><Contact /></Suspense> },
      { path: "archive", element: <Suspense fallback={<SuspenseFallback />}><Archive /></Suspense> },
      { path: "notes", element: <Suspense fallback={<SuspenseFallback />}><Notes /></Suspense> },
      { path: "*", element: <Suspense fallback={<SuspenseFallback />}><NotFound /></Suspense> },
    ]
  },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)