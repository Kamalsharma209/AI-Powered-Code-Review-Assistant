export interface Profile {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FileRecord {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  language: string | null;
  size: number;
  uploaded_at: string;
}

export interface AIProviderConfig {
  id: string;
  user_id: string;
  provider_name: string;
  base_url: string;
  api_key: string;
  model_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  user_id: string;
  type: 'single-file' | 'multi-file' | 'project';
  summary: string | null;
  strengths: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  created_at: string;
}

export interface ReviewIssue {
  id: string;
  review_id: string;
  file_name: string | null;
  line_number: number | null;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string | null;
  suggestion: string | null;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  language?: string;
}
