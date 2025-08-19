import { useMemo } from 'react';
import { projects } from '@/lib/constants';
import { CaseStudyLayout } from '@/components/CaseStudyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, MessageSquareQuote, Download } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
export function SmartStoryCaseStudy() {
  const project = useMemo(() => projects.find(p => p.slug === 'smart-story'), []);
  const prefersReducedMotion = useReducedMotion();
  if (!project) {
    return <div>Project not found</div>;
  }
  const { caseStudy } = project;
  const chartData = caseStudy.sections.find(s => s.visual?.type === 'chart')?.visual?.data ?? [];
  const handleDownload = () => {
    // Guard: if there's no chart data, create a minimal CSV (headers empty) and avoid calling Object.keys on undefined.
    const headers = Array.isArray(chartData) && chartData.length > 0 ? Object.keys(chartData[0]) : [];
    const rows = Array.isArray(chartData) && chartData.length > 0
      ? chartData.map((row: any) =>
          headers.map(header => {
            const cell = row[header];
            // Basic CSV escaping: wrap in quotes if contains comma or quote, escape internal quotes
            if (cell == null) return '';
            const cellStr = String(cell);
            if (cellStr.includes('"')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            if (cellStr.includes(',')) {
              return `"${cellStr}"`;
            }
            return cellStr;
          }).join(',')
        )
      : [];
    const csvContent = [
      headers.join(','),
      ...rows
    ].filter(Boolean).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'smart-story-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <CaseStudyLayout
      title={caseStudy.hero.title}
      subtitle={caseStudy.hero.subtitle}
      meta={caseStudy.summary}
    >
      <div className="flex flex-wrap gap-2">
        {project.methods.map(method => <Badge key={method}>{method}</Badge>)}
      </div>
      {caseStudy.sections.filter(s => !s.visual).map((section, index) => (
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
              <Button variant="outline" size="sm" onClick={handleDownload}>
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
                "I felt like I understood the key points immediately, and then I could choose where to dive deeper. It respects my time."
              </blockquote>
              <p className="text-right mt-2 text-sm">- Participant 4</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </CaseStudyLayout>
  );
}