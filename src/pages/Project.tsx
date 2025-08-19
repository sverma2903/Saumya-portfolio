import { useParams } from 'react-router-dom';
import { projects } from '@/lib/constants';
import { NotFound } from '@/pages/NotFound';
import { Seo } from '@/components/Seo';
import { CaseStudyLayout } from '@/components/CaseStudyLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle2, TrendingUp, MessageSquareQuote, Download } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
export function Project() {
  const { slug } = useParams<{ slug: string }>();
  const project = projects.find(p => p.slug === slug);
  const prefersReducedMotion = useReducedMotion();
  if (!project || !project.caseStudy || !project.caseStudy.summary?.scope || !Array.isArray(project.caseStudy.sections) || !project.caseStudy.hero?.title || !project.caseStudy.hero?.subtitle) {
    return <NotFound />;
  }
  const { caseStudy } = project;
  const handleDownload = (chartData: any[], fileName: string) => {
    if (!chartData || chartData.length === 0) return;
    const headers = Object.keys(chartData[0]);
    const rows = chartData.map((row: any) =>
      headers.map(header => {
        const cell = row[header];
        if (cell == null) return '';
        const cellStr = String(cell);
        if (cellStr.includes('"')) return `"${cellStr.replace(/"/g, '""')}"`;
        if (cellStr.includes(',')) return `"${cellStr}"`;
        return cellStr;
      }).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  // Special handling for Smart Story layout
  if (project.slug === 'smart-story') {
    const chartData = caseStudy.sections.find(s => s.visual?.type === 'chart')?.visual?.data ?? [];
    const qualitativeSection = caseStudy.sections.find(s => s.title === 'Qualitative Insights');
    return (
      <>
        <Seo title={project.title} description={caseStudy.hero.subtitle} />
        <CaseStudyLayout title={caseStudy.hero.title} subtitle={caseStudy.hero.subtitle} meta={caseStudy.summary}>
          <div className="flex flex-wrap gap-2">
            {(project.methods ?? []).map(method => <Badge key={method}>{method}</Badge>)}
          </div>
          {caseStudy.sections.filter(s => !s.visual && s.title !== 'Qualitative Insights').map((section, index) => (
            <section key={index} className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold font-display">{section.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{section.content}</p>
            </section>
          ))}
          <Tabs defaultValue="quantitative" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quantitative"><TrendingUp className="mr-2 h-4 w-4" />Quantitative</TabsTrigger>
              <TabsTrigger value="qualitative"><MessageSquareQuote className="mr-2 h-4 w-4" />Qualitative</TabsTrigger>
            </TabsList>
            <TabsContent value="quantitative">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>A/B Test Results</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(chartData, 'smart-story-data')}>
                    <Download className="mr-2 h-4 w-4" /> CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">The "Smart Story" format showed a significant usability lift across key metrics.</p>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" label={{ value: 'SUS Score', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--destructive))" label={{ value: 'Time (s)', angle: -90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="SUS Score" fill="hsl(var(--primary))" isAnimationActive={!prefersReducedMotion} />
                        <Bar yAxisId="right" dataKey="Time on Task (s)" fill="hsl(var(--destructive))" isAnimationActive={!prefersReducedMotion} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="qualitative">
              <Card>
                <CardHeader><CardTitle>User Feedback</CardTitle></CardHeader>
                <CardContent>
                  <blockquote className="mt-6 border-l-2 pl-6 italic text-muted-foreground">
                    "{qualitativeSection?.content}"
                  </blockquote>
                  <p className="text-right mt-2 text-sm">- Participant 4</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CaseStudyLayout>
      </>
    );
  }
  // Generic layout for other case studies
  return (
    <>
      <Seo title={project.title} description={caseStudy.hero.subtitle} />
      <CaseStudyLayout title={caseStudy.hero.title} subtitle={caseStudy.hero.subtitle} meta={caseStudy.summary}>
        <div className="space-y-12">
          <div className="flex flex-wrap gap-2">
            {(project.methods ?? []).map(method => <Badge key={method}>{method}</Badge>)}
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
                {section.visual?.type === 'image' && typeof section.visual.data === 'string' && (
                  <figure className="py-6">
                    <img src={section.visual.data} alt={section.visual.alt} loading="lazy" className="rounded-lg border shadow-md w-full" />
                    <figcaption className="text-center text-sm text-muted-foreground mt-2">{section.visual.alt}</figcaption>
                  </figure>
                )}
                {section.visual?.type === 'gallery' && Array.isArray(section.visual.data) && (
                  <div role="group" aria-label={section.visual.alt} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    {section.visual.data.map((img: { src: string; alt: string }, i: number) => (
                      <figure key={i} tabIndex={0} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
                        <img src={img.src} alt={img.alt} loading="lazy" className="rounded-lg border shadow-sm w-full aspect-square object-cover" />
                        <figcaption className="text-center text-xs text-muted-foreground mt-2">{img.alt}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </CaseStudyLayout>
    </>
  );
}