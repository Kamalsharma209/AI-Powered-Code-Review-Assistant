'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Project, FileRecord, TreeNode } from '@/types';
import { buildFileTree } from '@/lib/file-tree';
import { getLanguageFromPath } from '@/lib/languages';
import { FileTree } from '@/components/file-tree';
import { CodeViewer } from '@/components/code-viewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Upload, FileCode2, Search, ChevronDown, Play, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import JSZip from 'jszip';
import { toast } from 'sonner';

interface Tab {
  path: string;
  name: string;
  language: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [contentLoading, setContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    setTree(buildFileTree(files));
  }, [files]);

  async function loadProject() {
    const [projRes, filesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase.from('files').select('*').eq('project_id', projectId).order('file_path'),
    ]);
    setProject(projRes.data);
    setFiles(filesRes.data || []);
  }

  async function loadFileContent(path: string) {
    if (fileContents[path] !== undefined) return;
    setContentLoading(true);
    const { data } = await supabase.storage
      .from('project-files')
      .download(`${user!.id}/${projectId}/${path}`);
    if (data) {
      const text = await data.text();
      setFileContents((prev) => ({ ...prev, [path]: text }));
    }
    setContentLoading(false);
  }

  function handleFileSelect(path: string) {
    setSelectedPath(path);
    const fileName = path.split('/').pop() || path;
    const language = getLanguageFromPath(path);
    if (!tabs.find((t) => t.path === path)) {
      setTabs((prev) => [...prev, { path, name: fileName, language }]);
    }
    loadFileContent(path);
  }

  function handleCloseTab(path: string) {
    const newTabs = tabs.filter((t) => t.path !== path);
    setTabs(newTabs);
    if (selectedPath === path) {
      setSelectedPath(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.name.endsWith('.zip')) {
          await processZipFile(file);
        } else {
          await processSingleFile(file);
        }
      }
      await loadProject();
      toast.success('Files uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload files');
      console.error(err);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function processZipFile(file: File) {
    const zip = await JSZip.loadAsync(file);
    const entries: { path: string; content: string; size: number }[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && !relativePath.startsWith('__MACOSX') && !relativePath.includes('/.git/')) {
        entries.push({
          path: relativePath,
          content: '',
          size: 0,
        });
      }
    });

    // Read all file contents
    const processed = await Promise.all(
      entries.map(async (entry) => {
        const blob = await zip.file(entry.path)?.async('blob');
        if (!blob) return null;
        const text = await blob.text();
        // Skip binary files
        if (text.includes('\0')) return null;
        return {
          path: entry.path,
          content: text,
          size: blob.size,
        };
      })
    );

    const validFiles = processed.filter(Boolean) as { path: string; content: string; size: number }[];

    // Upload files to storage and create records
    for (const f of validFiles) {
      const storagePath = `${user!.id}/${projectId}/${f.path}`;
      await supabase.storage.from('project-files').upload(storagePath, new Blob([f.content], { type: 'text/plain' }), {
        upsert: true,
      });

      const fileName = f.path.split('/').pop() || f.path;
      await supabase.from('files').insert({
        project_id: projectId,
        file_name: fileName,
        file_path: f.path,
        language: getLanguageFromPath(f.path),
        size: f.size,
      });
    }
  }

  async function processSingleFile(file: File) {
    const content = await file.text();
    const storagePath = `${user!.id}/${projectId}/${file.name}`;
    await supabase.storage.from('project-files').upload(storagePath, new Blob([content], { type: 'text/plain' }), {
      upsert: true,
    });
    await supabase.from('files').insert({
      project_id: projectId,
      file_name: file.name,
      file_path: file.name,
      language: getLanguageFromPath(file.name),
      size: file.size,
    });
  }

  async function startReview(type: 'single-file' | 'multi-file' | 'project') {
    if (!selectedPath && type === 'single-file') {
      toast.error('Select a file first');
      return;
    }
    if (files.length === 0) {
      toast.error('Upload files first');
      return;
    }

    // Check for AI provider config
    const { data: configs } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true);
    if (!configs || configs.length === 0) {
      toast.error('Configure an AI provider in Settings first');
      router.push('/dashboard/ai-settings');
      return;
    }

    setReviewLoading(true);
    const config = configs[0];

    // Create review record
    const { data: review } = await supabase
      .from('reviews')
      .insert({
        project_id: projectId,
        type,
        status: 'in-progress',
      })
      .select()
      .maybeSingle();

    if (!review) {
      toast.error('Failed to create review');
      setReviewLoading(false);
      return;
    }

    // Collect file contents for review
    let filesToReview: { path: string; content: string; language: string }[] = [];

    if (type === 'single-file' && selectedPath) {
      const content = fileContents[selectedPath] || '';
      filesToReview = [{ path: selectedPath, content, language: getLanguageFromPath(selectedPath) }];
    } else {
      // Load all files
      for (const file of files) {
        const { data: blob } = await supabase.storage
          .from('project-files')
          .download(`${user!.id}/${projectId}/${file.file_path}`);
        if (blob) {
          const text = await blob.text();
          filesToReview.push({ path: file.file_path, content: text, language: file.language || 'text' });
        }
      }
    }

    // Call edge function for AI review
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          reviewId: review.id,
          providerConfig: {
            baseUrl: config.base_url,
            apiKey: config.api_key,
            modelName: config.model_name,
          },
          files: filesToReview,
          reviewType: type,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error || `Review failed (${response.status})`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast.success('Review completed');
      router.push(`/dashboard/reviews/${review.id}`);
    } catch (err: any) {
      await supabase.from('reviews').update({ status: 'failed' }).eq('id', review.id);
      toast.error(err.message || 'Review failed');
    } finally {
      setReviewLoading(false);
      setReviewDialogOpen(false);
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <FolderKanban className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-semibold text-sm">{project.name}</h1>
            <p className="text-xs text-muted-foreground">{files.length} files</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label>
            <input type="file" className="hidden" accept=".zip,.ts,.tsx,.js,.jsx,.py,.rb,.go,.rs,.java,.html,.css,.json,.yaml,.yml,.md,.sql,.sh,.txt" onChange={handleUpload} multiple />
            <Button variant="outline" size="sm" className="gap-1.5" asChild disabled={uploading}>
              <span>
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading...' : 'Upload'}
              </span>
            </Button>
          </label>

          <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Review
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Code Review</DialogTitle>
                <DialogDescription>Choose the scope for your AI code review.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <Button
                  variant="outline"
                  className="justify-start text-left"
                  onClick={() => startReview('single-file')}
                  disabled={reviewLoading || !selectedPath}
                >
                  <div>
                    <p className="font-medium">Current File</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPath || 'Select a file first'}
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left"
                  onClick={() => startReview('multi-file')}
                  disabled={reviewLoading}
                >
                  <div>
                    <p className="font-medium">Multiple Files</p>
                    <p className="text-xs text-muted-foreground">Review all uploaded files</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left"
                  onClick={() => startReview('project')}
                  disabled={reviewLoading}
                >
                  <div>
                    <p className="font-medium">Full Project</p>
                    <p className="text-xs text-muted-foreground">Comprehensive project-wide review</p>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main content - file tree + code viewer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - file tree */}
        <div className="w-64 border-r flex flex-col bg-card shrink-0">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                className="pl-7 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto py-1">
            <FileTree
              tree={tree}
              selectedPath={selectedPath}
              onSelect={handleFileSelect}
              searchTerm={searchTerm}
            />
          </div>
        </div>

        {/* Code viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeViewer
            tabs={tabs}
            activeTab={selectedPath}
            onSelectTab={handleFileSelect}
            onCloseTab={handleCloseTab}
            content={selectedPath ? fileContents[selectedPath] || null : null}
            loading={contentLoading}
          />
        </div>
      </div>
    </div>
  );
}
