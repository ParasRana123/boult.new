import React, { useState, useEffect } from 'react';
import { FolderTree, FileCode, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { FileItem } from '../types';

interface FileExplorerProps {
  files: FileItem[];
  selectedFile?: FileItem | null;
  onFileSelect: (file: FileItem) => void;
}

interface FileNodeProps {
  item: FileItem;
  depth: number;
  selectedFile?: FileItem | null;
  onFileClick: (file: FileItem) => void;
}

function FileNode({ item, depth, selectedFile, onFileClick }: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedFile && selectedFile.path === item.path;

  // Automatically expand parent folder if selected/active file is inside it
  useEffect(() => {
    if (selectedFile && selectedFile.path && item.type === 'folder') {
      if (selectedFile.path.startsWith(item.path + '/') || selectedFile.path === item.path) {
        setIsExpanded(true);
      }
    }
  }, [selectedFile, item.path, item.type]);

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(item);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all text-xs font-mono ${
          isSelected
            ? 'bg-purple-950/70 text-purple-200 border border-purple-500/60 shadow-sm font-semibold'
            : 'text-gray-300 hover:bg-gray-800/80 hover:text-gray-100 border border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        onClick={handleClick}
      >
        {item.type === 'folder' && (
          <span className="text-gray-400">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
        {item.type === 'folder' ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-purple-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-purple-400 flex-shrink-0" />
          )
        ) : (
          <FileCode className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-purple-300' : 'text-blue-400'}`} />
        )}
        <span className="truncate">{item.name}</span>
      </div>
      {item.type === 'folder' && isExpanded && item.children && (
        <div className="space-y-0.5">
          {item.children.map((child, index) => (
            <FileNode
              key={`${child.path}-${index}`}
              item={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({ files, selectedFile, onFileSelect }: FileExplorerProps) {
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 h-full overflow-auto border border-gray-800 flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-purple-400" />
          <h2 className="text-base font-semibold text-gray-100">Files</h2>
        </div>
        <span className="text-xs text-gray-400 font-mono px-2 py-0.5 rounded bg-gray-800 border border-gray-700">
          {files.length} {files.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="space-y-0.5 flex-1 overflow-y-auto pr-1">
        {files.length === 0 ? (
          <div className="text-xs text-gray-500 italic p-2 font-mono">Generating project tree...</div>
        ) : (
          files.map((file, index) => (
            <FileNode
              key={`${file.path}-${index}`}
              item={file}
              depth={0}
              selectedFile={selectedFile}
              onFileClick={onFileSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}