const extensionMap: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  php: 'php',
  swift: 'swift',
  r: 'r',
  lua: 'lua',
  vue: 'html',
  svelte: 'html',
  dart: 'dart',
  toml: 'toml',
  ini: 'ini',
  dockerfile: 'dockerfile',
  txt: 'text',
};

export function getLanguageFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  if (fileName === 'Dockerfile') return 'dockerfile';
  if (fileName.endsWith('.config.js')) return 'javascript';
  if (fileName.endsWith('.config.ts')) return 'typescript';
  if (fileName.endsWith('.module.css')) return 'css';
  if (fileName.endsWith('.d.ts')) return 'typescript';
  if (fileName.endsWith('.test.js')) return 'javascript';
  if (fileName.endsWith('.test.ts')) return 'typescript';
  if (fileName.endsWith('.spec.js')) return 'javascript';
  if (fileName.endsWith('.spec.ts')) return 'typescript';

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return extensionMap[ext] || 'text';
}
