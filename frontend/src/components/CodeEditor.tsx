import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { FileCode, Loader2, Sparkles, Copy, Check, Edit3, RotateCcw } from 'lucide-react';
import { FileItem } from '../types';

interface CodeEditorProps {
  file: FileItem | null;
  isWriting?: boolean;
  onChange?: (path: string, newContent: string) => void;
  originalContent?: string;
  onRevert?: (path: string) => void;
}

function getLanguage(path?: string): string {
  if (!path) return 'typescript';
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.jsx') || path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  return 'typescript';
}

export function CodeEditor({
  file,
  isWriting = false,
  onChange,
  originalContent,
  onRevert,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Auto-scroll to the bottom of the editor while file is actively writing
  useEffect(() => {
    if (editorRef.current && isWriting && file?.content) {
      const lineCount = editorRef.current.getModel()?.getLineCount() || 1;
      editorRef.current.revealLine(lineCount);
    }
  }, [file?.content, isWriting]);

  const handleCopy = async () => {
    if (!file?.content) return;
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code to clipboard', err);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!isWriting && file && onChange) {
      onChange(file.path, value ?? '');
    }
  };

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950 rounded-b-lg border border-t-0 border-gray-800">
        <FileCode className="w-12 h-12 mb-3 text-gray-600" />
        <p className="text-sm font-medium">Select a file from the explorer or wait for build steps</p>
      </div>
    );
  }

  const language = getLanguage(file.path);
  const lineCount = (file.content || '').split('\n').length;
  const isModified = originalContent !== undefined && originalContent !== file.content;

  return (
    <div className="h-full flex flex-col bg-gray-950 rounded-b-lg border border-t-0 border-gray-800 overflow-hidden">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="font-mono text-gray-200 font-medium truncate">
            {file.path || file.name}
          </span>
          <span className="text-gray-500 font-mono flex-shrink-0">({lineCount} lines)</span>
          {isModified && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-600/50 flex-shrink-0">
              Edited
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Revert Button if modified */}
          {isModified && !isWriting && onRevert && (
            <button
              onClick={() => onRevert(file.path)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-amber-300 transition-colors border border-gray-700/70 text-[11px] font-mono"
              title="Revert to AI-generated version"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white transition-colors border border-gray-700/70 text-[11px] font-mono"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Status Indicator */}
          {isWriting ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-500/50 text-purple-300 font-mono animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
              <span>AI Writing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-[11px]">
              <Edit3 className="w-3 h-3 text-emerald-400" />
              <span>Live Edit</span>
            </div>
          )}

          {/* Language Tag */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono uppercase text-[10px]">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{language}</span>
          </div>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 w-full h-full">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={file.content || ''}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            readOnly: isWriting,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            formatOnPaste: true,
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}