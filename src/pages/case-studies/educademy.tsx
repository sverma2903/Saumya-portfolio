import { projects } from '@/lib/constants';
import { CaseStudyLayout } from '@/components/CaseStudyLayout';
import { Badge } from '@/components/ui/badge';
import { Seo } from '@/components/Seo';
import { CheckCircle2 } from 'lucide-react';
export function EducademyCaseStudy() {
  const project = projects.find(p => p.slug === 'educademy');
  if (!project) {
    return <div>Project not found</div>;
  }
  const { caseStudy } = project;
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
        <div className="space-y-12">
          <div className="flex flex-wrap gap-2">
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
              </div>
            </section>
          ))}
        </div>
      </CaseStudyLayout>
    </div>
  );
}