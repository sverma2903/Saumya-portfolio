import { projects } from '@/lib/constants';
import { CaseStudyLayout } from '@/components/CaseStudyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
export function MumbaiTransitCaseStudy() {
  const project = projects.find(p => p.slug === 'mumbai-transit');
  if (!project) {
    return <div>Project not found</div>;
  }
  const { caseStudy } = project;
  const painPointsSection = caseStudy.sections.find(s => s.title.includes('Pain Points'));
  const gallerySection = caseStudy.sections.find(s => s.visual?.type === 'gallery');
  return (
    <div>
      <Seo
        title={project.title}
        description={caseStudy.hero.subtitle}
      />
      <CaseStudyLayout title={caseStudy.hero.title} subtitle={caseStudy.hero.subtitle} meta={caseStudy.summary}>
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2">
            {project.methods.map(method => <Badge key={method}>{method}</Badge>)}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>At a Glance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><h3 className="font-semibold mb-2">Scope</h3><p className="text-muted-foreground">{caseStudy.summary.scope}</p></div>
              <div><h3 className="font-semibold mb-2">Evidence</h3><p className="text-muted-foreground">{caseStudy.summary.evidence}</p></div>
              <div><h3 className="font-semibold mb-2">Decisions</h3><p className="text-muted-foreground">{caseStudy.summary.decisions}</p></div>
              <div><h3 className="font-semibold mb-2">Outcomes</h3><p className="text-muted-foreground">{caseStudy.summary.outcomes}</p></div>
            </CardContent>
          </Card>
          {caseStudy.sections.filter(s => !s.visual && !s.title.includes('Pain Points')).map((section, index) => (
            <section key={index} aria-labelledby={`section-title-${index}`}>
              <h2 id={`section-title-${index}`} className="text-2xl md:text-3xl font-bold font-display">{section.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">{section.content}</p>
            </section>
          ))}
          {painPointsSection && (
            <section aria-labelledby="pain-points-title">
              <h2 id="pain-points-title" className="text-2xl md:text-3xl font-bold font-display">{painPointsSection.title}</h2>
              {Array.isArray(painPointsSection.content) && (
                <ul className="space-y-2 list-inside mt-4">
                  {painPointsSection.content.map((item, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {gallerySection && (
            <section aria-labelledby="gallery-title">
              <h2 id="gallery-title" className="text-2xl md:text-3xl font-bold font-display">{gallerySection.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mt-4">{gallerySection.content}</p>
              <div role="group" aria-label={gallerySection.visual?.alt} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                {(gallerySection.visual?.data || []).map((img: {src: string, alt: string}) => (
                  <figure key={img.src} tabIndex={0} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
                    <img src={img.src} alt={img.alt} loading="lazy" className="rounded-lg border shadow-sm w-full aspect-square object-cover" />
                    <figcaption className="text-center text-xs text-muted-foreground mt-2">{img.alt}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>
      </CaseStudyLayout>
    </div>
  );
}