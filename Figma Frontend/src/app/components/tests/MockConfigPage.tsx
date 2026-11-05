import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Settings, CheckCircle2 } from "lucide-react";

export default function MockConfigPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [dbData, setDbData] = useState({ subjects: [], years: [] });

  const [config, setConfig] = useState({
    subject: "",
    years: [],
    difficulty: { easy: 25, moderate: 25, hard: 10 },
    includeDeleted: false,
  });

  useEffect(() => {
    fetch("/api/mock/metadata")
      .then((res) => res.json())
      .then((data) => setDbData(data))
      .catch((err) => console.error("Error pulling database metadata fields:", err));
  }, []);

  const toggleArrayItem = (yearStr: string) => {
    setConfig((prev: any) => ({
      ...prev,
      years: prev.years.includes(yearStr)
        ? prev.years.filter((y: string) => y !== yearStr)
        : [...prev.years, yearStr],
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.subject) return alert("Please select a subject!");
    if (config.years.length === 0) return alert("Please specify target papers!");

    const total = Number(config.difficulty.easy) + Number(config.difficulty.moderate) + Number(config.difficulty.hard);
    if (total !== 60) return alert(`Total configuration metrics must equal exactly 60. Current balance: ${total}`);

    try {
      setIsLoading(true);
      const res = await fetch("/api/mock/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      
      if (!data.questions || data.questions.length === 0) {
        alert("Not enough match resources found inside current timeline pool limits.");
        return;
      }

      // Route directly to your updated Preview sequence
      navigate("/preview", { state: { config, mode: "mock", questions: data.questions } });
    } catch {
      alert("Pipeline failure reading stream endpoints.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-gray-800">
      <div className="max-w-6xl mx-auto  ">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 font-medium">
          <ArrowLeft size={20} /> Back
        </button>
        
          <h1 className="text-3xl font-black mb-8 text-slate-900 tracking-tight text-center">GENERATE MOCK TEST</h1>
        
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <Settings className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Custom Mock Parameter Targets</h2>
            </div>
            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label className="block mb-2 font-semibold text-sm text-gray-700">Target Core Subject Domain</label>
                <select value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
                  <option value="">Select subject domain</option>
                  {dbData.subjects.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm text-gray-700">Source Timeline Reference Checklists</label>
                <div className="grid grid-cols-2 gap-3 border rounded-lg p-4 bg-gray-50 max-h-32 overflow-y-auto">
                  {dbData.years.map((year) => (
                    <label key={year} className="flex items-center gap-3 select-none text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={config.years.includes(year)} onChange={() => toggleArrayItem(year)} className="w-4 h-4 rounded text-blue-600 accent-blue-600" />
                      {year} Paper Series
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm text-gray-700">Difficulty Matrix Breakdown (Total Must Equal 60)</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 block mb-1 text-center">EASY</span>
                    <input type="number" value={config.difficulty.easy} onChange={(e) => setConfig({ ...config, difficulty: { ...config.difficulty, easy: parseInt(e.target.value) || 0 } })} className="border rounded-lg p-3 text-center w-full bg-white font-mono" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 block mb-1 text-center">MODERATE</span>
                    <input type="number" value={config.difficulty.moderate} onChange={(e) => setConfig({ ...config, difficulty: { ...config.difficulty, moderate: parseInt(e.target.value) || 0 } })} className="border rounded-lg p-3 text-center w-full bg-white font-mono" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 block mb-1 text-center">HARD</span>
                    <input type="number" value={config.difficulty.hard} onChange={(e) => setConfig({ ...config, difficulty: { ...config.difficulty, hard: parseInt(e.target.value) || 0 } })} className="border rounded-lg p-3 text-center w-full bg-white font-mono" />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 border rounded-lg p-4 bg-gray-50 cursor-pointer select-none text-sm font-medium text-gray-700">
                <input type="checkbox" checked={config.includeDeleted} onChange={(e) => setConfig({ ...config, includeDeleted: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                Include Dropped/Deleted Syllabus Units
              </label>

              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">
                {isLoading ? "Compiling Blueprints..." : "Compile Blueprint Set"}
              </button>
            </form>
          </div>

          <div className="bg-slate-100 rounded-xl p-8 border border-gray-200 h-fit">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Official Blueprint Rules Balance Matrix</h2>
            <div className="space-y-4">
              {["100% Core Database Verification Checks", "60 Questions per generated book index", "25% Class 11 (PUC-I) vs 75% Class 12 (PUC-II) strict split alignment", "Instant offline sync token integration options"].map((rule) => (
                <div key={rule} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                  <CheckCircle2 className="text-blue-600 mt-0.5 shrink-0" size={18} />
                  <p>{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}