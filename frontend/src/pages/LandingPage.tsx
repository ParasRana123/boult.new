import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebsiteBuilder } from '../context/WebsiteBuilderContext';
import { motion } from 'framer-motion';
import { Code2, ArrowRight, Sparkles } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createProject } = useWebsiteBuilder();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!prompt.trim()) return;

  setIsLoading(true);

  try {
    await createProject(prompt);
    navigate('/workspace');
  } catch (error) {
    console.error('Failed to create project:', error);
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 px-8 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Code2 className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            WebCraft.ai
          </h1>
        </div>
        <nav className="hidden md:block">
          <ul className="flex space-x-8">
            <li><a href="#" className="text-slate-300 hover:text-white transition-colors">Features</a></li>
            <li><a href="#" className="text-slate-300 hover:text-white transition-colors">Examples</a></li>
            <li><a href="#" className="text-slate-300 hover:text-white transition-colors">Documentation</a></li>
          </ul>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl w-full text-center"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Create beautiful websites with 
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> just a prompt</span>
          </h2>
          <p className="text-slate-300 text-xl mb-12 max-w-2xl mx-auto">
            Turn your ideas into fully functioning websites in seconds using our AI-powered platform.
          </p>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative max-w-2xl mx-auto">
              <Sparkles className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the website you want to create..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-4 px-12 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button 
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-md p-2 transition-colors"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-md p-4 hover:bg-slate-750 transition-colors cursor-pointer">
              <p className="font-medium text-blue-400">E-commerce store</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-md p-4 hover:bg-slate-750 transition-colors cursor-pointer">
              <p className="font-medium text-blue-400">Personal portfolio</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-md p-4 hover:bg-slate-750 transition-colors cursor-pointer">
              <p className="font-medium text-blue-400">Blog website</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-md p-4 hover:bg-slate-750 transition-colors cursor-pointer">
              <p className="font-medium text-blue-400">Landing page</p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="py-6 px-8 text-center border-t border-slate-800">
        <p className="text-slate-400 text-sm">
          © 2025 WebCraft.ai. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;