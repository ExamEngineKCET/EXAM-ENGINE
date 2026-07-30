import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle, RotateCcw, HelpCircle, FileText } from 'lucide-react';

//   1. IMPORT YOUR SECURE AUTH WRAPPER
import { fetchWithAuth } from '../../../utils/api'; // Adjust the relative path if your files sit in a different layer

export default function PreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the questions passed from the MockConfigPage form submission
  const { questions = [], config = {}, mode = '' } = location.state || {};

  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Tracks checked/unchecked question IDs
  const [selectedQs, setSelectedQs] = useState<string[]>([]);

  // Automatically select all incoming questions on initial load
  useEffect(() => {
    if (questions.length > 0) {
      setSelectedQs(questions.map((q: any) => String(q.question_id)));
    }
  }, [questions]);

  // Toggle selection state for an individual question row
  const toggleQuestion = (id: string) => {
    setSelectedQs(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  // Pulls a completely randomized alternative question set using the same parameters
  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      const endpoint = mode === 'mock' ? '/api/mock/generate' : '/api/practice/generate'; 
      
      //   2. UPGRADE REGENERATION ENDPOINT TO AUTH PIPELINE
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify(config)
      });
      
      if (!response.ok) throw new Error("Failed to re-compile active data matrix.");

      const data = await response.json();
      const newQuestions = data.questions;

      if (newQuestions && newQuestions.length > 0) {
        navigate('/preview', { 
          state: { config, mode, questions: newQuestions },
          replace: true 
        });
      } else {
        alert("No questions found matching these configuration metrics.");
      }
    } catch (error) {
      console.error("Regeneration matrix read error:", error);
      alert("Error reaching database for compilation updates.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Saves the blueprint to the database to populate a live dashboard card
  const handleFinalizeTest = async () => {
    if (selectedQs.length === 0) {
      alert("Please select at least one question to assemble your test!");
      return;
    }

    try {
      setIsSaving(true);
      
      // 1. DYNAMIC ROUTING BASE ON MODE
      // If mode is 'mock', it hits the mock controller; otherwise, it hits practice/custom routes
      const isMock = mode === 'mock';
      const endpoint = isMock ? "/api/mock/save" : "/api/practice/save"; // Swap to your practice endpoint
      const redirectPath = isMock ? "/mock-tests" : "/practice";         // Swap to your practice dashboard
      
      const titleStr = isMock 
        ? `${config.subject || 'Custom'} Mock Test (${selectedQs.length} Qs)`
        : `${config.subject || 'Custom'} Practice Set (${selectedQs.length} Qs)`;

      //   3. UPGRADE FINALIZE ENDPOINT TO AUTH PIPELINE
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: JSON.stringify({
          title: titleStr,
          question_ids: selectedQs
        }),
      });

      if (!response.ok) throw new Error("Failed to save blueprint structural arrays.");

      alert(`🎉 Test successfully compiled and saved to your ${isMock ? 'Mock Registries' : 'Practice Workspace'}!`);
      navigate(redirectPath); 
      
    } catch (error) {
      console.error("Error finalizing test blueprint:", error);
      alert("Failed to commit test layout configurations to the database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Defensive fallback catch check
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-gray-800 p-6">
        <HelpCircle className="w-16 h-16 text-gray-400 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold mb-2 text-slate-900">No Blueprint Stack Detected</h2>
        <p className="text-gray-500 mb-6 text-center max-w-sm">Please define parameters inside the Setup form before accessing preview parameters.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-md">
          Return to Form Setup
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-gray-800 p-6">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-8 border-b pb-4 bg-transparent">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-gray-600 hover:text-black font-semibold transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Modify Form Setup</span>
          </button>
          
          <button 
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold border-2 border-indigo-100 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 transition-all text-sm
              ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RotateCcw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Shuffling Pool...' : 'Regenerate Question Set'}
          </button>
        </div>

        {/* Title Stack Description info */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Question Pool Preview</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Select or deselect row items below. Currently locking <span className="text-blue-600 font-bold">{selectedQs.length}</span> of <span className="text-gray-700 font-bold">{questions.length}</span> compiled items.
            </p>
          </div>
        </div>

        {/* Dynamic Interactive Scroll Box Layout list */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-y-auto mb-6 max-h-[55vh] space-y-3 custom-scrollbar">
          {questions.map((q: any, index: number) => {
            const isChecked = selectedQs.includes(String(q.question_id));
            
            return (
              <div 
                key={q.question_id} 
                className={`p-4 rounded-xl border transition-all flex gap-4 items-start bg-white
                  ${isChecked 
                    ? 'border-blue-500 bg-blue-50/20 shadow-xs' 
                    : 'border-gray-100 opacity-50'}`}
              >
                <input 
                  type="checkbox" 
                  checked={isChecked}
                  onChange={() => toggleQuestion(String(q.question_id))}
                  className="w-5 h-5 mt-1 rounded text-blue-600 accent-blue-600 cursor-pointer shrink-0 border-gray-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-mono font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wider">
                      {q.question_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider
                      ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-100' :
                        q.difficulty === 'Hard' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-yellow-50 text-yellow-700 border-yellow-100'}`}
                    >
                      {q.difficulty}
                    </span>
                    {q.puc_level && (
                      <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded uppercase tracking-wider">
                        {q.puc_level}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 leading-relaxed text-base">
                    {index + 1}. {q.question_text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Universal Action Footer Button */}
        <button 
          onClick={handleFinalizeTest} 
          disabled={isSaving} 
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 font-bold text-white text-lg rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 select-none border-b-4 border-blue-800 active:border-b-0 active:mt-1"
        >
          <CheckCircle size={22} />
          {isSaving 
            ? "Saving Blueprint Keys..." 
            : mode === 'mock' ? "Generate Mock Test" : "Generate Practice Test"
          }
        </button>

      </div>
    </div>
  );
}