import React from 'react';
import { useWebsiteBuilder } from '../context/WebsiteBuilderContext';
import { CheckCircle, Circle, AlertCircle, ArrowRight } from 'lucide-react';

const StepsPanel: React.FC = () => {
  const { steps, currentStep, executeStep } = useWebsiteBuilder();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <ArrowRight className="w-5 h-5 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4 px-2">Build Steps</h2>
      <div className="space-y-1">
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          
          return (
            <div 
              key={step.id}
              className={`relative p-3 rounded-md transition-colors ${
                isActive 
                  ? 'bg-slate-800 text-white' 
                  : step.status === 'completed'
                    ? 'bg-slate-800/30 text-slate-300'
                    : 'text-slate-400 hover:bg-slate-800/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getStatusIcon(step.status)}
                </div>
                <div>
                  <h3 className="font-medium leading-none">{step.title}</h3>
                  <p className="text-sm mt-1 text-slate-400">{step.description}</p>
                  
                  {isActive && step.status === 'in-progress' && (
                    <button
                      onClick={() => executeStep(step.id)}
                      className="mt-3 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Execute
                    </button>
                  )}
                </div>
              </div>
              
              {step.id < steps.length && (
                <div className="absolute left-6 top-[40px] bottom-0 w-px bg-slate-700 h-[calc(100%)]"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepsPanel;