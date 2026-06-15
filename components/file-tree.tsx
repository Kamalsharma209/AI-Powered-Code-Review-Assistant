'use client';

import { TreeNode } from '@/types';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FileTreeProps {
  tree: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  searchTerm?: string;
}

export function FileTree({ tree, selectedPath, onSelect, searchTerm }: FileTreeProps) {
  const filteredTree = searchTerm
    ? filterTree(tree, searchTerm.toLowerCase())
    : tree;

  return (
    <div className="text-sm">
      {filteredTree.length === 0 ? (
        <div className="px-3 py-8 text-center text-muted-foreground text-xs">
          {searchTerm ? 'No matching files' : 'No files uploaded'}
        </div>
      ) : (
        filteredTree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isFolder = node.type === 'folder';
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div
        className={cn(
          'file-tree-item flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm',
          isSelected && 'active'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            onSelect(node.path);
          }
        }}
      >
        {isFolder ? (
          <>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            {expanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-primary" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {isFolder && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function filterTree(nodes: TreeNode[], term: string): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.name.toLowerCase().includes(term) || node.path.toLowerCase().includes(term)) {
        result.push(node);
      }
    } else if (node.children) {
      const filteredChildren = filterTree(node.children, term);
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(term)) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }
  return result;
}
