/*
# Create Core Schema for AI Code Review Assistant

1. New Tables
- `profiles`: User profile data extending auth.users
  - id (uuid, PK, references auth.users)
  - name (text)
  - email (text, unique)
  - created_at (timestamptz)
- `projects`: User projects for organizing code reviews
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, DEFAULT auth.uid())
  - name (text, not null)
  - description (text)
  - created_at (timestamptz)
- `files`: Uploaded source code files
  - id (uuid, PK)
  - project_id (uuid, FK to projects, CASCADE)
  - file_name (text, not null)
  - file_path (text, not null)
  - language (text)
  - size (bigint)
  - uploaded_at (timestamptz)
- `ai_provider_configs`: Configurable AI providers
  - id (uuid, PK)
  - user_id (uuid, FK to auth.users, DEFAULT auth.uid())
  - provider_name (text, not null)
  - base_url (text, not null)
  - api_key (text, not null)
  - model_name (text, not null)
  - is_active (boolean, default true)
  - created_at (timestamptz)
- `reviews`: Code review records
  - id (uuid, PK)
  - project_id (uuid, FK to projects, CASCADE)
  - user_id (uuid, FK to auth.users, DEFAULT auth.uid())
  - type (text: 'single-file' | 'multi-file' | 'project')
  - summary (text)
  - strengths (text)
  - status (text: 'pending' | 'in-progress' | 'completed' | 'failed')
  - created_at (timestamptz)
- `review_issues`: Individual issues found during review
  - id (uuid, PK)
  - review_id (uuid, FK to reviews, CASCADE)
  - file_name (text)
  - line_number (integer)
  - severity (text: 'high' | 'medium' | 'low')
  - title (text, not null)
  - description (text)
  - suggestion (text)

2. Security
- RLS enabled on all tables
- Owner-scoped CRUD policies for all user-owned tables
- Profiles: users can read/update own profile
- Projects: owner-scoped CRUD
- Files: scoped through project ownership
- AI configs: owner-scoped CRUD
- Reviews: scoped through project ownership
- Review issues: scoped through review ownership

3. Indexes
- projects(user_id) for dashboard queries
- files(project_id) for file listing
- reviews(project_id) for review listing
- reviews(user_id) for user review history
- review_issues(review_id) for issue listing
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  language text,
  size bigint DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_files" ON files;
CREATE POLICY "select_own_files" ON files FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = files.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_files" ON files;
CREATE POLICY "insert_own_files" ON files FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = files.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_files" ON files;
CREATE POLICY "update_own_files" ON files FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = files.project_id AND projects.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = files.project_id AND projects.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_files" ON files;
CREATE POLICY "delete_own_files" ON files FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = files.project_id AND projects.user_id = auth.uid())
  );

-- AI Provider Configs table
CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  base_url text NOT NULL,
  api_key text NOT NULL,
  model_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_configs" ON ai_provider_configs;
CREATE POLICY "select_own_ai_configs" ON ai_provider_configs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_configs" ON ai_provider_configs;
CREATE POLICY "insert_own_ai_configs" ON ai_provider_configs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_configs" ON ai_provider_configs;
CREATE POLICY "update_own_ai_configs" ON ai_provider_configs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_configs" ON ai_provider_configs;
CREATE POLICY "delete_own_ai_configs" ON ai_provider_configs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'single-file' CHECK (type IN ('single-file', 'multi-file', 'project')),
  summary text,
  strengths text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reviews" ON reviews;
CREATE POLICY "select_own_reviews" ON reviews FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reviews" ON reviews;
CREATE POLICY "insert_own_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reviews" ON reviews;
CREATE POLICY "update_own_reviews" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reviews" ON reviews;
CREATE POLICY "delete_own_reviews" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Review Issues table
CREATE TABLE IF NOT EXISTS review_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  file_name text,
  line_number integer,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  title text NOT NULL,
  description text,
  suggestion text
);

ALTER TABLE review_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_review_issues" ON review_issues;
CREATE POLICY "select_own_review_issues" ON review_issues FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_issues.review_id AND reviews.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_review_issues" ON review_issues;
CREATE POLICY "insert_own_review_issues" ON review_issues FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_issues.review_id AND reviews.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_review_issues" ON review_issues;
CREATE POLICY "update_own_review_issues" ON review_issues FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_issues.review_id AND reviews.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_issues.review_id AND reviews.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_review_issues" ON review_issues;
CREATE POLICY "delete_own_review_issues" ON review_issues FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_issues.review_id AND reviews.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_review_issues_review_id ON review_issues(review_id);
CREATE INDEX IF NOT EXISTS idx_ai_configs_user_id ON ai_provider_configs(user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
