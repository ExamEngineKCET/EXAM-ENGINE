import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Timer, ChevronRight, ChevronLeft, CheckCircle, LayoutGrid } from 'lucide-react';

//  IMPORT YOUR AUTH WRAPPER Helper
import { fetchWithAuth } from '../../../utils/api'; // Adjust path if needed to find your api.ts file

export default function TestInterface() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { 
    questions = [], 
    testMode = "practice", 
    testTitle = "Practice Test",
    examId = null 
  } = location.state || {};

  const defaultTime = questions.length * 60; 
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({}); 
  const [timeLeft, setTimeLeft] = useState(defaultTime);
  
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reportStats, setReportStats] = useState({ score: 0, attempted: 0, accuracy: 0 });

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 text-gray-800">
        <LayoutGrid className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Questions Loaded</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];

  useEffect(() => {
    if(currentQuestion) setVisited(prev => ({ ...prev, [currentQuestion.question_id]: true }));
  }, [currentQIndex, currentQuestion]);

  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) { handleSubmit(); return 0; }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished]);

  const handleSubmit = async () => {
    setIsSaving(true);
    setIsFinished(true);

    let score = 0;
    let attempted = 0;

    questions.forEach((q: any) => {
      const savedAnswer = answers[q.question_id];
      if (savedAnswer !== undefined) {
        attempted++;
        const correctIndex = ['A', 'B', 'C', 'D'].indexOf(q.correct_option);
        if (savedAnswer === correctIndex) score++;
      }
    });

    setReportStats({
      score, attempted, accuracy: attempted > 0 ? Math.round((score / attempted) * 100) : 0
    });

    try {
      //  UPGRADED FROM THE NAKED FETCH PIPELINE TO AUTH WRAPPER
      await fetchWithAuth(`/api/attempts/submit`, {
        method: 'POST',
        body: JSON.stringify({ 
          mode: testMode, 
          exam_id: examId, 
          answers: answers 
        }),
      });
    } catch (err) {
      console.error("Network error saving test:", err);
    }
    setIsSaving(false);
  };

  const handleOptionSelect = (optIdx: number) => setAnswers(prev => ({ ...prev, [currentQuestion.question_id]: optIdx }));
  const handleNext = () => { if (currentQIndex < questions.length - 1) setCurrentQIndex(currentQIndex + 1); };
  const handlePrev = () => { if (currentQIndex > 0) setCurrentQIndex(currentQIndex - 1); };

  const getStatusColor = (qId: string, idx: number) => {
      if (currentQIndex === idx) return "border-blue-600 border-2 bg-blue-50 text-blue-700 font-bold";
      if (answers[qId] !== undefined) return "bg-emerald-600 text-white border-emerald-600 font-bold";
      if (visited[qId]) return "bg-red-50 text-red-600 border-red-200 font-medium";
      return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  // --- LIGHT MODE REPORT SCREEN ---
  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 text-gray-800 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Submitted!</h1>
            <p className="text-gray-500">{isSaving ? "Saving results securely..." : "Your attempt has been compiled and stored."}</p>
          </div>
          {!isSaving && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">Score</p>
                  <p className="text-3xl font-bold text-gray-900">{reportStats.score} <span className="text-lg text-gray-400">/ {questions.length}</span></p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                  <p className="text-gray-500 text-sm mb-1">Accuracy</p>
                  <p className={`text-3xl font-bold ${reportStats.accuracy > 70 ? 'text-emerald-600' : 'text-yellow-600'}`}>
                    {reportStats.accuracy}%
                  </p>
                </div>
              </div>
              <button onClick={() => navigate(-1)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-600/10">
                Exit Interface
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const optionsArray = [currentQuestion.option_a, currentQuestion.option_b, currentQuestion.option_c, currentQuestion.option_d];

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-50 text-gray-800 font-sans overflow-hidden">
      
      {/* SIDEBAR PALETTE */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-20">
          <div className="p-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 mb-1">Question Palette</h2>
              <div className="text-xs text-gray-500">{questions.length} Questions Loaded</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))' }}>
                  {questions.map((q: any, idx: number) => (
                      <button key={q.question_id} onClick={() => setCurrentQIndex(idx)} className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm border transition-all hover:scale-105 ${getStatusColor(q.question_id, idx)}`}>
                          {idx + 1}
                      </button>
                  ))}
              </div>
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
              <button onClick={() => { if(window.confirm("Submit early?")) handleSubmit(); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md shadow-red-600/10">
                Submit Test
              </button>
          </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white shrink-0">
            <div>
              <h2 className="font-bold text-gray-900 text-lg tracking-wide uppercase">{testTitle}</h2>
            </div>
            <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <Timer size={20} className={timeLeft < 300 ? 'text-red-500' : 'text-blue-600'} />
                <span className="font-mono text-2xl font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex-1 h-full overflow-y-auto p-8 flex flex-col bg-white">
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <span className="text-blue-600 font-mono font-bold text-lg">Question {currentQIndex + 1}</span>
              </div>
              <div className="text-xl font-medium text-gray-900 mb-8 leading-relaxed">
                {currentQuestion.question_text}
                {/*    If the question has an image path in the DB, render it! */}
                      {currentQuestion.image_path && (
                        <img 
                          src={`/${currentQuestion.image_path}`} 
                          alt="Question diagram" 
                          className="mt-4 max-h-60 object-contain rounded-lg border border-gray-200"
                        />
                      )}
              </div>
              <div className="space-y-4 mb-10">
                  {optionsArray.map((opt, idx) => {
                      if (!opt) return null;
                      const isSelected = answers[currentQuestion.question_id] === idx; 
                      return (
                          <button 
                            key={idx} 
                            onClick={() => handleOptionSelect(idx)} 
                            className={`w-full text-left p-5 rounded-xl border transition-all flex items-start gap-4 
                              ${isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' 
                                           : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'}`}
                          >
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 
                                ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white font-bold' : 'border-gray-400 font-medium text-gray-500'}`}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <div className="text-lg pt-0.5 flex-1">{opt}</div>
                          </button>
                      )
                  })}
              </div>
          </div>

          <div className="h-20 border-t border-gray-200 bg-white flex items-center justify-between px-8 shrink-0">
            <button onClick={handlePrev} disabled={currentQIndex === 0} className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${currentQIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'}`}>
              <ChevronLeft size={20} /> Previous
            </button>
            <button onClick={handleNext} disabled={currentQIndex === questions.length - 1} className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all ${currentQIndex === questions.length - 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/10'}`}>
              Save & Next <ChevronRight size={20} />
            </button>
          </div>
      </div>
    </div>
  );
}