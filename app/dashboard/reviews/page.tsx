'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Review } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadReviews();
  }, [user]);

  async function loadReviews() {
    if (!user) return;
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setReviews(data || []);
    setLoading(false);
  }

  const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Review History</h1>
          <p className="text-muted-foreground text-sm mt-1">All your past code reviews</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No reviews yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create a project, upload code, and run an AI review to see results here.
            </p>
            <Link href="/dashboard/projects">
              <Button variant="outline">Go to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((review) => (
                <Link key={review.id} href={`/dashboard/reviews/${review.id}`}>
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        review.status === 'completed' ? 'default' :
                        review.status === 'failed' ? 'destructive' :
                        'secondary'
                      } className="gap-1">
                        {review.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                        {review.status === 'in-progress' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {review.status === 'failed' && <XCircle className="h-3 w-3" />}
                        {review.status === 'pending' && <Clock className="h-3 w-3" />}
                        {review.status}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium capitalize">{review.type} review</p>
                        {review.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{review.summary}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(review.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
