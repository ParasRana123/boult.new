import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Sparkles, ArrowRight, Code, Layers, Zap } from 'lucide-react';

const SUGGESTIONS = [
  "Todo app with Kanban board and priority Eisenhower matrix",
  "Modern SaaS landing page with interactive pricing & dark mode",
  "Crypto analytics dashboard with live candlestick charts",
  "Minimalist portfolio with project showcases & contact form",
];

export function Home() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { prompt: prompt.trim() } });
    }
  };

  const handleSelectSuggestion = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between p-6 relative overflow-hidden antialiased selection:bg-purple-900 selection:text-purple-200">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-purple-600/15 via-indigo-600/15 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-purple-900/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <header className="flex items-center justify-between max-w-6xl mx-auto w-full py-2 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-purple-200 via-indigo-100 to-white bg-clip-text text-transparent">
            Boult.new
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          <span className="px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-purple-300">
            ⚡ Powered by Gemini 3.6 Flash
          </span>
        </div>
      </header>

      {/* Main Hero & Form */}
      <main className="max-w-3xl mx-auto w-full my-auto z-10 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-mono mb-6 shadow-md shadow-purple-950/50 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Full-Stack Streaming IDE</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            What do you want to <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-200 bg-clip-text text-transparent">
              build today?
            </span>
          </h1>

          <p className="text-base text-gray-400 max-w-xl mx-auto">
            Describe your idea and watch Boult stream full-stack applications file by file with live code preview in your browser.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-5 border border-gray-800 focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build a comprehensive fitness tracking app with workout logger, weekly progress analytics charts, and dark mode..."
              className="w-full h-32 p-3 bg-transparent text-gray-100 placeholder-gray-500 text-sm focus:outline-none resize-none"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-800/80">
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                <Code className="w-3.5 h-3.5 text-purple-400" />
                <span>React + Vite + Tailwind CSS + WebContainer</span>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2.5 px-6 rounded-xl text-sm shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                <span>Generate Project</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-6">
          <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-3 text-center sm:text-left">
            Or choose a starter template:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="text-left text-xs text-gray-300 bg-gray-900/60 hover:bg-purple-950/40 hover:text-purple-200 hover:border-purple-500/40 p-3 rounded-xl border border-gray-800/80 transition-all truncate flex items-center gap-2 group"
              >
                <Zap className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600 font-mono py-4 z-10 border-t border-gray-900">
        Boult.new • Intelligent In-Browser Streaming Builder
      </footer>
    </div>
  );
}