'use client';

import { useState } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark, vs } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { useTheme } from 'next-themes';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  path: string;
  name: string;
  language: string;
}

interface CodeViewerProps {
  tabs: Tab[];
  activeTab: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  content: string | null;
  loading?: boolean;
}

export function CodeViewer({ tabs, activeTab, onSelectTab, onCloseTab, content, loading }: CodeViewerProps) {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b bg-muted/30 overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            className={cn(
              'editor-tab flex items-center gap-1 px-3 py-2 text-sm border-r cursor-pointer whitespace-nowrap',
              activeTab === tab.path ? 'active bg-card font-medium' : 'text-muted-foreground hover:bg-accent/50'
            )}
            onClick={() => onSelectTab(tab.path)}
          >
            <span>{tab.name}</span>
            <button
              className="ml-1 rounded-sm hover:bg-muted p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.path);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {/* Code area */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : content ? (
          <SyntaxHighlighter
            language={tabs.find((t) => t.path === activeTab)?.language || 'text'}
            style={theme === 'dark' ? atomOneDark : vs}
            showLineNumbers
            wrapLines
            customStyle={{
              margin: 0,
              borderRadius: 0,
              minHeight: '100%',
            }}
          >
            {content}
          </SyntaxHighlighter>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
}
