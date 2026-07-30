import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, SlidersHorizontal, CheckCircle2, Calculator, Search } from 'lucide-react';

//   1. IMPORT YOUR AUTH WRAPPER
import { fetchWithAuth } from '../../../utils/api'; // Adjust relative depth if necessary

export default function PracticeConfigPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Dynamic Database Response hooks
  const [dbData, setDbData] = useState({ subjects: [], years: [], topics: {}, pucLevels: [] });
  const [topicSearch, setTopicSearch] = useState('');

  // Primary Configuration Form fields state
  const [config, setConfig] = useState({
    subject: '',
    topics: [] as string[],
    years: [] as string[], 
    puc_levels: [] as string[], 
    difficulty: { easy: 10, moderate: 15, hard: 5 }
  });

  // Pull active metadata filters on load
  useEffect(() => {
    //   2. SECURE THE METADATA FETCH
    fetchWithAuth('/api/practice/metadata')
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized or Metadata offline");
        return res.json();
      })
      .then(data => {
        if (data) {
          setDbData({
            subjects: data.subjects || [],
            years: data.years || [],
            topics: data.topics || {},
            pucLevels: data.pucLevels || []
          });
        }
      })
      .catch(err => console.error("Error reading database practice structures:", err));
  }, []);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig({ ...config, subject: e.target.value, topics: [] });
    setTopicSearch(''); 
  };

  const toggleArrayItem = (arrayName: 'years' | 'puc_levels' | 'topics', item: string) => {
    setConfig((prev: any) => {
      const currentArray = prev[arrayName];
      if (currentArray.includes(item)) {
        return { ...prev, [arrayName]: currentArray.filter((i: string) => i !== item) };
      } else {
        return { ...prev, [arrayName]: [...currentArray, item] };
      }
    });
  };

  // Safe topic parsing lookups
  const availableTopics = (dbData.topics as any)[config.subject] || [];
  
  const filteredAndSortedTopics = availableTopics
    .filter((topicObj: any) => {
      const matchesSearch = topicObj.name.toLowerCase().includes(topicSearch.toLowerCase());
      const matchesPuc = config.puc_levels.length === 0 || config.puc_levels.includes(topicObj.level);
      return matchesSearch && matchesPuc;
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const handleSelectAllTopics = () => {
    const visibleTopicNames = filteredAndSortedTopics.map((t: any) => t.name as string);
    const allSelected = visibleTopicNames.length > 0 && visibleTopicNames.every((name: string) => config.topics.includes(name));
    if (allSelected) {
      setConfig(prev => ({
        ...prev,
        topics: prev.topics.filter(name => !visibleTopicNames.includes(name))
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        topics: Array.from(new Set([...prev.topics, ...visibleTopicNames]))
      }));
    }
  };

  const totalQuestions = Number(config.difficulty.easy) + Number(config.difficulty.moderate) + Number(config.difficulty.hard);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.subject) return alert("Please select a target subject!");
    if (config.topics.length === 0) return alert("Please specify at least one sub-topic element!");
    if (config.years.length === 0) return alert("Please specify paper years reference targets!");
    if (totalQuestions <= 0) return alert("Please allocate questions to your difficulty variables!");
    
    try {
      setIsLoading(true);
      
      //   3. SECURE THE GENERATION ENGINE GENERATOR PIPELINE
      const response = await fetchWithAuth('/api/practice/generate', {
        method: "POST",
        body: JSON.stringify(config)
      });
      
      if (!response.ok) throw new Error("Compilation server returned error response.");

      const data = await response.json();
      
      if (!data.questions || data.questions.length === 0) {
        alert("No questions found matching this exact filter combination in the database.");
        return;
      }

      // Pipe cleanly to your shared preview module engine!
      navigate('/preview', { state: { config, mode: 'practice', questions: data.questions } });
      
    } catch (error) {
      console.error("Generation error details:", error);
      alert("Error contacting compilation servers.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-gray-800 p-6">
      <header className="max-w-6xl mx-auto w-full mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black font-semibold transition-colors">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full flex flex-col items-center">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">GENERATE PRACTICE TEST</h1>

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT FORM BLOCK */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-emerald-600" size={22} />
                <h2 className="text-xl font-bold text-gray-900">Configure Practice Set</h2>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200">
                <Calculator size={14} />
                <span>Total: {totalQuestions} Qs</span>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subject Domain *</label>
                  <select 
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={config.subject}
                    onChange={handleSubjectChange}
                    required
                  >
                    <option value="">Choose subject...</option>
                    {Array.isArray(dbData.subjects) && dbData.subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">PUC Syllabus Level</label>
                  <div className="border border-gray-300 rounded-lg p-3 h-[50px] flex items-center gap-4 bg-gray-50 overflow-x-auto">
                    {Array.isArray(dbData.pucLevels) && dbData.pucLevels.map(level => (
                      <label key={level} className="flex items-center align-center gap-2 cursor-pointer whitespace-nowrap text-sm font-medium text-gray-700">
                        <input 
                          type="checkbox" 
                          checked={config.puc_levels.includes(level)}
                          onChange={() => toggleArrayItem('puc_levels', level)}
                          className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 "
                        />
                        {level}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Topics Checkbox Panel List element */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Select Target Chapters / Topics *</label>
                  {config.subject && (
                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      {filteredAndSortedTopics.length > 0 && filteredAndSortedTopics.every((t: any) => config.topics.includes(t.name))
                        ? "Deselect All"
                        : "Select All Visible"}
                    </button>
                  )}
                </div>
                
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search specific topics or chapters..."
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    disabled={!config.subject}
                    className="w-full pl-9 p-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50 space-y-2 custom-scrollbar">
                  {!config.subject ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">Choose a subject to select topics</p>
                  ) : filteredAndSortedTopics.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">No structural chapters match this search keyword query.</p>
                  ) : (
                    filteredAndSortedTopics.map((topicObj: any, index: number) => (
                      <label key={`${topicObj.name}-${index}`} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-gray-200 rounded transition-colors text-sm text-gray-700 font-medium">
                        <input 
                          type="checkbox" 
                          checked={config.topics.includes(topicObj.name)}
                          onChange={() => toggleArrayItem('topics', topicObj.name)}
                          className="w-4 h-4 text-emerald-600 accent-emerald-600 shrink-0"
                        />
                        <span>{topicObj.name} <span className="text-gray-400 text-xs font-bold">({topicObj.level})</span></span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Historical Exam Series *</label>
                  <div className="border border-gray-300 rounded-lg p-3 h-[120px] overflow-y-auto bg-gray-50 space-y-2 custom-scrollbar">
                    {Array.isArray(dbData.years) && dbData.years.map(year => (
                      <label key={year} className="flex items-center gap-3 cursor-pointer p-1 hover:bg-gray-200 rounded transition-colors text-sm font-medium text-gray-700">
                        <input 
                          type="checkbox" 
                          checked={config.years.includes(year)}
                          onChange={() => toggleArrayItem('years', year)}
                          className="w-4 h-4 text-emerald-600 accent-emerald-600"
                        />
                        <span>{year} Exam Questions</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Variables Breakdown *</label>
                  <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">Easy Pool</span>
                      <input type="number" min="0" value={config.difficulty.easy} onChange={(e) => setConfig({...config, difficulty: {...config.difficulty, easy: parseInt(e.target.value) || 0}})} className="w-16 p-1 border rounded text-center font-mono text-sm bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">Moderate Pool</span>
                      <input type="number" min="0" value={config.difficulty.moderate} onChange={(e) => setConfig({...config, difficulty: {...config.difficulty, moderate: parseInt(e.target.value) || 0}})} className="w-16 p-1 border rounded text-center font-mono text-sm bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">Hard Pool</span>
                      <input type="number" min="0" value={config.difficulty.hard} onChange={(e) => setConfig({...config, difficulty: {...config.difficulty, hard: parseInt(e.target.value) || 0}})} className="w-16 p-1 border rounded text-center font-mono text-sm bg-white" />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold text-white py-4 rounded-xl text-lg transition-colors shadow-sm border-b-4 border-emerald-800 active:border-b-0 active:mt-1 disabled:opacity-50"
              >
                {isLoading ? "Assembling Blueprint Vectors..." : "Compile Custom Practice Set"}
              </button>
            </form>
          </div>

          {/* RIGHT RULES CARD PANEL */}
          <div className="bg-slate-100 p-8 rounded-2xl border border-gray-200 h-fit">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Practice Blueprint Rules</h3>
            <div className="space-y-4">
              {["Instant dynamic indexing by subject keywords", "Custom targeted Class 11 / Class 12 constraints via PUC filters", "Granular quantity controls across varying difficulty brackets", "Direct interactive preview page confirmation pipeline"].map((rule) => (
                <div key={rule} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                  <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                  <p>{rule}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}