'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Review, ReviewIssue } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileCode2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;
  const [review, setReview] = useState<Review | null>(null);
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReview();
  }, [reviewId]);

  async function loadReview() {
    const [revRes, issuesRes] = await Promise.all([
      supabase.from('reviews').select('*').eq('id', reviewId).maybeSingle(),
      supabase.from('review_issues').select('*').eq('review_id', reviewId).order('severity'),
    ]);
    setReview(revRes.data);
    setIssues(issuesRes.data || []);
    setLoading(false);
  }

  const highIssues = issues.filter((i) => i.severity === 'high');
  const mediumIssues = issues.filter((i) => i.severity === 'medium');
  const lowIssues = issues.filter((i) => i.severity === 'low');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Review not found</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/reviews" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to reviews
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Code Review</h1>
            <Badge variant={
              review.status === 'completed' ? 'default' :
              review.status === 'in-progress' ? 'secondary' :
              review.status === 'failed' ? 'destructive' :
              'outline'
            }>
              {review.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {review.status === 'in-progress' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {review.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
              {review.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
              {review.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {review.type} review &middot; {format(new Date(review.created_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>

      {/* Status-specific content */}
      {review.status === 'in-progress' && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="font-medium">Review in progress...</p>
            <p className="text-sm text-muted-foreground mt-1">The AI is analyzing your code</p>
          </CardContent>
        </Card>
      )}

      {review.status === 'failed' && (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="py-12 text-center">
            <XCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
            <p className="font-medium">Review failed</p>
            <p className="text-sm text-muted-foreground mt-1">Check your AI provider settings and try again</p>
          </CardContent>
        </Card>
      )}

      {review.status === 'completed' && (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.summary || 'No summary available'}</p>
            </CardContent>
          </Card>

          {/* Strengths */}
          {review.strengths && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.strengths}</p>
              </CardContent>
            </Card>
          )}

          {/* Issue stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="border-destructive/20">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-destructive">{highIssues.length}</p>
                <p className="text-xs text-muted-foreground">High Severity</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/20">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{mediumIssues.length}</p>
                <p className="text-xs text-muted-foreground">Medium Severity</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/20">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{lowIssues.length}</p>
                <p className="text-xs text-muted-foreground">Low Severity</p>
              </CardContent>
            </Card>
          </div>

          {/* Issues list */}
          {issues.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Issues Found ({issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {issues.map((issue) => (
                    <div key={issue.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className={`severity-${issue.severity} inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 mt-0.5`}>
                          {issue.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{issue.title}</p>
                          </div>
                          {issue.file_name && (
                            <p className="text-xs text-primary font-mono mb-1">
                              {issue.file_name}
                              {issue.line_number ? ` : line ${issue.line_number}` : ''}
                            </p>
                          )}
                          {issue.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed mb-2">{issue.description}</p>
                          )}
                          {issue.suggestion && (
                            <div className="flex items-start gap-1.5 text-sm">
                              <Lightbulb className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                              <p className="text-muted-foreground">{issue.suggestion}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-medium">No issues found</p>
                <p className="text-sm text-muted-foreground">The code looks clean!</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
