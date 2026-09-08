import React from 'react';
import { Code2, Eye } from 'lucide-react';

interface TabViewProps {
  activeTab: 'code' | 'preview';
  onTabChange: (tab: 'code' | 'preview') => void;
}

export function TabView({ activeTab, onTabChange }: TabViewProps) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
      <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 shadow-inner">
        <button
          onClick={() => onTabChange('code')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'code'
              ? 'bg-purple-600/90 text-white shadow-sm shadow-purple-900/50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-850'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Code Editor
        </button>
        <button
          onClick={() => onTabChange('preview')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'preview'
              ? 'bg-purple-600/90 text-white shadow-sm shadow-purple-900/50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-850'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Live Preview
        </button>
      </div>

      <div className="text-[11px] font-mono text-gray-500 hidden sm:block">
        {activeTab === 'code' ? 'Interactive Monaco Workspace' : 'WebContainer Live Sandbox'}
      </div>
    </div>
  );
}