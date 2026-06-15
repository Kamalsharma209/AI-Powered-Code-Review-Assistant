import { TreeNode, FileRecord } from '@/types';

export function buildFileTree(files: FileRecord[]): TreeNode[] {
  const root: TreeNode[] = [];

  const sorted = [...files].sort((a, b) => a.file_path.localeCompare(b.file_path));

  for (const file of sorted) {
    const parts = file.file_path.split('/').filter(Boolean);
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existingNode = currentLevel.find((n) => n.name === part);

      if (existingNode) {
        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children;
        }
      } else {
        const path = parts.slice(0, i + 1).join('/');
        const newNode: TreeNode = isFile
          ? { name: part, path, type: 'file', language: file.language || undefined }
          : { name: part, path, type: 'folder', children: [] };

        currentLevel.push(newNode);
        if (!isFile && newNode.children) {
          currentLevel = newNode.children;
        }
      }
    }
  }

  // Sort: folders first, then alphabetically
  function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((node) => {
      if (node.children) {
        return { ...node, children: sortNodes(node.children) };
      }
      return node;
    });
  }

  return sortNodes(root);
}
