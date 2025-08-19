import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Hero } from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Send } from "lucide-react";
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});
type ContactFormValues = z.infer<typeof contactFormSchema>;
export function Contact() {
  const [sent, setSent] = useState(false);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", message: "" },
  });
  const onSubmit = useCallback(async (values: ContactFormValues) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      if (result.success) {
        toast.success("Message sent successfully!");
        setSent(true);
        form.reset();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error("Contact form submission error:", error);
      toast.info("Could not send message directly. Opening your email client as a fallback.");
      // Use a non-blocking timeout to trigger the mailto link, allowing the toast to render.
      setTimeout(() => {
        const subject = encodeURIComponent(`Message from ${values.name}`);
        const body = encodeURIComponent(values.message);
        window.location.href = `mailto:sverma17@umd.edu?subject=${subject}&body=${body}`;
      }, 500);
    }
  }, [form]);
  const handleSendAnother = () => {
    setSent(false);
    form.reset();
  };
  return (
    <>
      <Hero
        title="Get in Touch"
        subtitle="I'm currently open to UX Research, Product Design, and Product Strategy/PM roles in NYC or remote. Let's build something great together."
      />
      <div className="container mx-auto max-w-xl px-4 py-12 md:py-16">
        <Card>
          {sent ? (
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 text-2xl font-semibold">Message Sent!</h2>
              <p className="mt-2 text-muted-foreground">
                Thank you for reaching out. I'll get back to you as soon as possible.
              </p>
              <Button onClick={handleSendAnother} className="mt-6">
                <Send className="mr-2 h-4 w-4" /> Send Another Message
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Send a Message</CardTitle>
                <CardDescription>
                  My preferred method of contact is via email at <a href="mailto:sverma17@umd.edu" className="text-primary underline">sverma17@umd.edu</a>, but feel free to use the form below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl><Input placeholder="Your Name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" placeholder="your.email@example.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl><Textarea placeholder="Your message..." className="min-h-[120px]" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </>
  );
}