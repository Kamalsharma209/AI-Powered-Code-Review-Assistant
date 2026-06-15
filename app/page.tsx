'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Code2, Shield, Zap, FileSearch, ArrowRight, GitBranch, Brain } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Configurable AI providers review your code for bugs, security issues, and performance bottlenecks with structured, actionable feedback.',
  },
  {
    icon: FileSearch,
    title: 'Smart Code Explorer',
    description: 'Browse uploaded files in a VS Code-like tree view with syntax highlighting, multi-tab support, and instant file search.',
  },
  {
    icon: Shield,
    title: 'Security-First Reviews',
    description: 'Detect vulnerabilities, injection risks, and OWASP top 10 issues before they reach production with severity-tagged findings.',
  },
  {
    icon: GitBranch,
    title: 'Multi-Provider Support',
    description: 'Use OpenAI, LM Studio, Ollama, or any OpenAI-compatible endpoint. Configure base URLs, API keys, and models per provider.',
  },
  {
    icon: Zap,
    title: 'Structured Reports',
    description: 'Every review includes summary, strengths, problems with severity levels, and actionable suggestions with file and line references.',
  },
  {
    icon: Code2,
    title: 'Project Organization',
    description: 'Organize reviews into projects, upload ZIP files, and manage your codebase reviews in one clean dashboard.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">CodeReview AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm mb-6">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>AI-powered code reviews in seconds</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
            Ship better code with{' '}
            <span className="text-primary">intelligent reviews</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Upload your source code and receive structured, actionable feedback on bugs, security issues,
            performance bottlenecks, and code quality — powered by configurable AI providers.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Reviewing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything you need for code quality</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From upload to actionable insights — a complete code review workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 transition-colors hover:border-primary/30"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to improve your code?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Create a free account and start receiving AI-powered code reviews in minutes.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            <span>CodeReview AI</span>
          </div>
          <p>Built with Next.js, Supabase, and configurable AI providers</p>
        </div>
      </footer>
    </div>
  );
}
