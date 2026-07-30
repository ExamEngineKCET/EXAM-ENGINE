import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Clock, FileText, Play, ChevronDown, Download, ToggleLeft, ToggleRight, X, SlidersHorizontal } from "lucide-react";


import { fetchWithAuth } from "../../../utils/api"; 

export default function Practice() {
  const navigate = useNavigate();
  const [practiceCards, setPracticeCards] = useState<any[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  
  // Modal tracking states
  const [activeOfflineCard, setActiveOfflineCard] = useState<any | null>(null);
  const [pageSavingMode, setPageSavingMode] = useState(false);
  const [showExtraInfo, setShowExtraInfo] = useState(true);

  const fetchActiveDashboard = () => {
    
    fetchWithAuth("/api/practice/list")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized or server error");
        return res.json();
      })
      .then((data) => {
        // Prevents the .filter() crash
        if (Array.isArray(data)) {
          setPracticeCards(data);
        } else {
          setPracticeCards([]);
        }
      })
      .catch((err) => {
        console.error("Error reading dynamically registered practice indices:", err);
        setPracticeCards([]);
      });
  };

  useEffect(() => { fetchActiveDashboard(); }, []);

  // --- DYNAMIC COUNTERS CALCULATOR ---
  const totalTests = practiceCards.length;
  const completedTests = practiceCards.filter((p) => p.attempted).length;

  const testsWithScores = practiceCards.filter(
    (p) => p.attempted && p.score !== null && p.score !== undefined && p.questions > 0
  );

  let averageScorePercent = 0;
  if (testsWithScores.length > 0) {
    const totalPercentageSum = testsWithScores.reduce((sum, test) => {
      return sum + ((test.score / test.questions) * 100);
    }, 0);
    averageScorePercent = Math.round(totalPercentageSum / testsWithScores.length);
  }

  // --- NOTION-STYLE INLINE PROPAGATION ---
  const handleTitleInputChange = (id: number, updatedText: string) => {
    setPracticeCards(prev => prev.map(card => card.id === id ? { ...card, name: updatedText } : card));
  };

  const handleTitleSyncBlur = async (id: number, finalTitle: string) => {
    if (!finalTitle.trim()) {
      fetchActiveDashboard(); 
      return;
    }
    try {
      
      await fetchWithAuth("/api/practice/update-title", {
        method: "PUT",
        body: JSON.stringify({
          exam_id: id,
          title: finalTitle.trim()
        })
      });
    } catch (err) {
      console.error("Failed to sync structural text modifications:", err);
    }
  };

  const triggerPDFDownload = async (docType: string) => {
    if (!activeOfflineCard) return;
    try {
      
      const res = await fetchWithAuth("/api/practice/pdf/download", {
        method: "POST",
        body: JSON.stringify({
          question_ids: activeOfflineCard.real_questions.map((q: any) => q.question_id),
          document_type: docType,
          page_saving_mode: pageSavingMode,
          show_extra_info: showExtraInfo,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeOfflineCard.name.replace(/\s+/g, "_")}_${docType}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("Error building ReportLab target binaries.");
    }
  };

  return (
    <div className="space-y-6 p-2 text-gray-800 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Practice Workspaces</h1>
          <p className="text-gray-500 text-sm mt-0.5">Target dynamic structural sub-topics with granular blueprint filters</p>
        </div>
      </div>

      {/* LIVE ANALYTICS COUNTER TILES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Workspace Modules</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalTests}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Sessions</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{completedTests}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Average Workspace Accuracy</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {testsWithScores.length > 0 ? `${averageScorePercent}%` : "--%"}
          </p>
        </div>
      </div>

      {/* DYNAMIC COMPILER CARD GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {practiceCards.map((test) => (
          <div key={test.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex-1">
                  {/* NOTION-STYLE BORDERLESS TITLE ELEMENT */}
                  <input
                    type="text"
                    value={test.name || ""}
                    onChange={(e) => handleTitleInputChange(test.id, e.target.value)}
                    onBlur={() => handleTitleSyncBlur(test.id, test.name)}
                    className="font-bold text-gray-900 text-lg w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-emerald-500 focus:outline-none transition-colors py-0.5"
                    placeholder="Untitled Practice Module"
                  />
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><FileText size={16} /> {test.questions} Questions</span>
                    <span className="flex items-center gap-1"><Clock size={16} /> {test.duration} mins pace allocation</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-bold uppercase tracking-wider border border-emerald-100 shrink-0">Practice Set</span>
              </div>

              <button
                onClick={() => navigate("/test-interface", { state: { questions: test.real_questions, testMode: "practice", testTitle: test.name, examId: test.id } })}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-colors mb-2 shadow-sm"
              >
                <Play size={18} fill="currentColor" />
                {test.attempted ? "Retake Practice Module" : "Start Practice Session"}
              </button>

              <button onClick={() => setActiveOfflineCard(test)} className="w-full py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-bold text-sm rounded-xl transition-all mb-4">
                Take Offline (Print PDFs)
              </button>
            </div>

            {/* EXPANDABLE ACCORDION TRACKING LOGS */}
            <div className="border-t pt-3">
              <button 
                onClick={() => setExpandedCard(expandedCard === Number(test.id) ? null : Number(test.id))} 
                className="w-full flex justify-between items-center text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider"
              >
                <span>View Historical Benchmarks</span>
                <ChevronDown size={16} className={`transform transition-transform ${expandedCard === Number(test.id) ? "rotate-180" : ""}`} />
              </button>

              {expandedCard === Number(test.id) && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-gray-100 animate-in fade-in duration-200">
                  {test.attempted && test.score !== null ? (
                    <div>
                      <div className="flex justify-between text-sm font-semibold mb-1">
                        <span className="text-gray-500">Highest Registered Accuracy Rank</span>
                        <span className="text-emerald-600 font-bold font-mono">{test.score} / {test.questions} Correct</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-600 h-1.5 rounded-full transition-all" style={{ width: `${(test.score / test.questions) * 100}%` }} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-gray-400 block text-center py-2">No attempts submitted yet.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FLOATING ACTION NAVIGATION LINK ATTACHMENT */}
      <Link to="/generate-practice" className="fixed bottom-8 right-8 z-40 flex items-center justify-center shadow-lg px-6 h-14 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 gap-2 hover:scale-105 active:scale-95 transition-all">
        <SlidersHorizontal size={18} />
        Generate Practice
      </Link>

      {/* POPUP OFFLINE OPTIMIZER COMPILER MODAL OVERLAY */}
      {activeOfflineCard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Offline Print Compiler</h3>
              <button onClick={() => setActiveOfflineCard(null)} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"><X size={20} /></button>
            </div>
            
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-4">Document Title: <span className="text-gray-700 italic normal-case block mt-0.5">{activeOfflineCard.name}</span></p>
            
            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-gray-100">
              <button onClick={() => setPageSavingMode(!pageSavingMode)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-700">
                <span className="flex flex-col items-start"><p>Page Saving Layout Mode</p><p className="text-xs font-normal text-gray-400">Forces clear split double-column print style</p></span>
                {pageSavingMode ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-gray-300" />}
              </button>

              <button onClick={() => setShowExtraInfo(!showExtraInfo)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 border-t pt-3 mt-2">
                <span className="flex flex-col items-start"><p>Include Tracking Meta Info</p><p className="text-xs font-normal text-gray-400">Appends tag rows for years, topics, metadata</p></span>
                {showExtraInfo ? <ToggleRight size={32} className="text-emerald-600" /> : <ToggleLeft size={32} className="text-gray-300" />}
              </button>
            </div>

            <div className="space-y-2.5">
              <button onClick={() => triggerPDFDownload("Questions")} className="w-full py-3 bg-gray-900 text-white hover:bg-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"><Download size={16} /> Compile Question Booklet PDF</button>
              <button onClick={() => triggerPDFDownload("Keys")} className="w-full py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"><Download size={16} /> Compile Answer Key Keyring</button>
              <button onClick={() => triggerPDFDownload("Solutions")} className="w-full py-3 bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"><Download size={16} /> Stream Step Explanation Documents</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}