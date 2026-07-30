import React from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, MessageSquare } from 'lucide-react';

export default function FeedbackReport() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Tab Title Block */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
          Feedback & Support Hub
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm transition-colors">
          Report typographical data anomalies or propose system iterations directly to developers
        </p>
      </div>

      {/* Main Grid Selector Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* Card 1: Question Issue Reports Module */}
        <button 
          onClick={() => navigate('/report')}
          className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-700 hover:shadow-md hover:border-amber-500 dark:hover:border-amber-500 transition-all flex flex-col items-center justify-center gap-4 group h-64 cursor-pointer text-center outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-full group-hover:scale-110 transition-transform duration-200">
            <AlertTriangle size={36} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Report Question Issue
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mt-2 leading-relaxed transition-colors">
              Found a typo, incorrect solution key, or broken LaTeX script? Flag the specific ID to fix our database.
            </p>
          </div>
        </button>

        {/* Card 2: Platform General Feedback Module */}
        <button 
          onClick={() => navigate('/feedback')}
          className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-700 hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-4 group h-64 cursor-pointer text-center outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full group-hover:scale-110 transition-transform duration-200">
            <MessageSquare size={36} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Share Platform Feedback
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mt-2 leading-relaxed transition-colors">
              Propose framework updates, interface revisions, or share performance improvement suggestions.
            </p>
          </div>
        </button>

      </div>
    </div>
  );
}