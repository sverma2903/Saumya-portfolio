import { projects } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Download, ImageOff } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useState } from 'react';
import { CaseStudyLayout } from '@/components/CaseStudyLayout';
export function CsbsCaseStudy() {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const project = projects.find(p => p.slug === 'csbs');
  if (!project) {
    return <div>Project not found</div>;
  }
  const { caseStudy } = project;
  const journeyMapsAssetPath = '/assets/csbs-journey-maps.zip';
  const downloadsButton = (
    <Button asChild variant="outline" className="mt-4">
      <a href={journeyMapsAssetPath} download>
        <Download className="mr-2 h-4 w-4" /> Download Journey Maps
      </a>
    </Button>
  );
  return (
    <div>
      <Seo
        title={project.title}
        description={caseStudy.hero.subtitle}
      />
      <CaseStudyLayout
        title={caseStudy.hero.title}
        subtitle={caseStudy.hero.subtitle}
        meta={caseStudy.summary}
      >
        <div className="container mx-auto max-w-3xl px-4 py-12 md:py-16 space-y-12">
          <div className="flex flex-wrap gap-2" aria-hidden={true}>
            {project.methods.map(method => <Badge key={method}>{method}</Badge>)}
          </div>
          {caseStudy.sections.map((section, index) => (
            <section key={index} aria-labelledby={`section-title-${index}`}>
              <h2 id={`section-title-${index}`} className="text-2xl md:text-3xl font-bold font-display">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {Array.isArray(section.content) ? (
                  <ul className="space-y-2 list-inside">
                    {section.content.map((item, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-lg text-muted-foreground leading-relaxed">{section.content}</p>
                )}
                {section.visual && section.visual.type === 'image' && (
                  <div className="py-6">
                    {typeof section.visual.data === 'string' && section.visual.data.trim() !== '' && !failedImages[section.visual.data] ? (
                      <figure>
                        <img
                          src={section.visual.data}
                          alt={section.visual.alt}
                          loading="lazy"
                          className="rounded-lg border shadow-md w-full"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            setFailedImages(prev => ({ ...prev, [String(target.src)]: true }));
                          }}
                        />
                        <figcaption className="text-center text-sm text-muted-foreground mt-2">{section.visual.alt}</figcaption>
                      </figure>
                    ) : (
                      <Card className="bg-muted/50">
                        <CardContent className="p-8 text-center">
                          <ImageOff className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Visual asset for this section is currently unavailable.</p>
                          <Button variant="outline" className="mt-4" disabled>
                            <Download className="mr-2 h-4 w-4" /> Download Unavailable
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                {section.title.includes('Key Deliverable') && downloadsButton}
              </div>
            </section>
          ))}
        </div>
      </CaseStudyLayout>
    </div>
  );
}