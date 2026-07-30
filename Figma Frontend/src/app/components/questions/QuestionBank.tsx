import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, BookOpen, Bookmark, CheckCircle, XCircle, Loader2, ChevronDown, FileText } from 'lucide-react';
//  1. IMPORT YOUR AUTH WRAPPER
import { fetchWithAuth } from '../../../utils/api'; 

export default function QuestionBank() {
  // Multi-select tracking arrays
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['all']);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(['all']);
  const [selectedYears, setSelectedYears] = useState<string[]>(['all']);  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Menu visibility toggles
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const [isDifficultyMenuOpen, setIsDifficultyMenuOpen] = useState(false);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);

  // Backend Integration States
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks user answers: { "KCET-2023-PHY-Q1": 2, ... }
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});

  const navigate = useNavigate();

  // Fetch questions from FastAPI backend
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        
        if (!selectedSubjects.includes('all') && selectedSubjects.length > 0) {
          selectedSubjects.forEach(sub => params.append('subject', sub));
        }
        if (!selectedDifficulties.includes('all') && selectedDifficulties.length > 0) {
          selectedDifficulties.forEach(diff => params.append('difficulty', diff));
        }
        if (!selectedYears.includes('all') && selectedYears.length > 0) {
          selectedYears.forEach(y => params.append('year', y));
        }
        if (searchQuery.trim() !== '') {
          params.append('search_query', searchQuery);
        }
        
        params.append('limit', '1000');

        //   2. USE THE WRAPPER
        const response = await fetchWithAuth(`/api/questions?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch questions from the server');

        const data = await response.json();
        // Array safety check
        if (Array.isArray(data)) {
           setQuestions(data);
        } else {
           setQuestions([]);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching questions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSavedAnswers = async () => {
      try {
        //   3. USE THE WRAPPER
        const response = await fetchWithAuth('/api/questions/user/answers');
        if (response.ok) {
          const data = await response.json();
          setUserAnswers(data);
        }
      } catch (err) {
        console.error("Failed to load saved answers", err);
      }
    };

    fetchSavedAnswers();
    fetchQuestions();
  }, [selectedSubjects, selectedDifficulties, selectedYears, searchQuery]); 

  // Handle Option Click (Save to DB)
  const handleOptionSelect = async (questionId: string, optionIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));

    try {
      //   4. USE THE WRAPPER
      const response = await fetchWithAuth(`/api/questions/${questionId}/answer`, {
        method: 'POST',
        // Note: fetchWithAuth automatically adds headers: { 'Content-Type': 'application/json' }
        body: JSON.stringify({ selected_option: optionIdx }),
      });

      if (!response.ok) {
        const errText = await response.text();
        alert(`⚠️ BACKEND ERROR SAVING:\nStatus Code: ${response.status}\nDetails: ${errText}`);
      }
    } catch (err) {
      alert(`⚠️ NETWORK ERROR:\nMake sure your Uvicorn server is running!\n${err}`);
    }
  };

  // Clear all attempts
  const handleClearAttempts = async () => {
    if (!window.confirm("Are you sure you want to clear all your practice attempts?")) return;
    try {
      //   5. USE THE WRAPPER
      await fetchWithAuth('/api/questions/user/answers/clear', { method: 'DELETE' });
      setUserAnswers({}); 
    } catch (err) {
      console.error("Failed to clear attempts", err);
    }
  };
  
  // Local filtering for the search bar (acts as a safety net)
  // Protected against non-array states
  const filteredQuestions = Array.isArray(questions) ? questions.filter(q => {
    if (!searchQuery) return true;
    const matchesSearch = 
      q.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) : [];

  // --- DYNAMIC STATS CALCULATOR ---
  const totalQuestions = filteredQuestions.length;
  let attemptedCount = 0;
  let correctCount = 0;

  filteredQuestions.forEach((q) => {
    const savedAnswer = userAnswers[q.question_id];
    if (savedAnswer !== undefined) {
      attemptedCount++;
      const correctIndex = ['A', 'B', 'C', 'D'].indexOf(q.correct_option);
      if (savedAnswer === correctIndex) {
        correctCount++;
      }
    }
  });

  const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

  // --- FRONTEND-ONLY 180 QUESTION VALIDATION ---
  const handleStartTest = () => {
    if (filteredQuestions.length === 0) {
      alert("No questions match your current filters!");
      return;
    }

    // Strict frontend check: Stop them if they exceed 180
    if (filteredQuestions.length > 180) {
      alert(`⚠️ Too many questions!\n\nYou currently have ${filteredQuestions.length} questions selected. A KCET exam has a maximum of 180 questions.\n\nPlease apply more filters (Subject, Difficulty, Year) to reduce the count to 180 or fewer before starting the test.`);
      return;
    }

    // Safe to proceed! Navigate to the test interface
    navigate("/test-interface", {
      state: {
        questions: filteredQuestions,
        testMode: "question_bank",
        testTitle: `Custom Practice (${filteredQuestions.length} Qs)`
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-600 mt-1">Practice from our live KCET database</p>
        </div>
        <button 
          onClick={handleClearAttempts} 
          className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          clear all attempts
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Custom Subject Dropdown */}
          <div className="relative">
            <div 
              onClick={() => { setIsSubjectMenuOpen(!isSubjectMenuOpen); setIsDifficultyMenuOpen(false); setIsYearMenuOpen(false); }}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors"
            >
              <span className="truncate text-gray-700 text-sm">
                {selectedSubjects.includes('all') ? 'All Subjects' : selectedSubjects.join(', ')}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            
            {isSubjectMenuOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                <div 
                  className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100"
                  onClick={() => { setSelectedSubjects(['all']); setIsSubjectMenuOpen(false); }}
                >
                  <input type="checkbox" checked={selectedSubjects.includes('all')} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">All Subjects</span>
                </div>
                {['Physics', 'Chemistry', 'Mathematics'].map(sub => (
                  <div 
                    key={sub}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    onClick={() => {
                      if (selectedSubjects.includes(sub)) {
                        const newSubs = selectedSubjects.filter(s => s !== sub);
                        setSelectedSubjects(newSubs.length === 0 ? ['all'] : newSubs);
                      } else {
                        const newSubs = selectedSubjects.filter(s => s !== 'all');
                        setSelectedSubjects([...newSubs, sub]);
                      }
                    }}
                  >
                    <input type="checkbox" checked={selectedSubjects.includes(sub)} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                    <span className="text-sm text-gray-700">{sub}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Difficulty Dropdown */}
          <div className="relative">
            <div 
              onClick={() => { setIsDifficultyMenuOpen(!isDifficultyMenuOpen); setIsSubjectMenuOpen(false); setIsYearMenuOpen(false); }}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors"
            >
              <span className="truncate text-gray-700 text-sm">
                {selectedDifficulties.includes('all') ? 'All Difficulty' : selectedDifficulties.join(', ')}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            
            {isDifficultyMenuOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                <div 
                  className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100"
                  onClick={() => { setSelectedDifficulties(['all']); setIsDifficultyMenuOpen(false); }}
                >
                  <input type="checkbox" checked={selectedDifficulties.includes('all')} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">All Difficulty</span>
                </div>
                {['Easy', 'Moderate', 'Hard'].map(diff => (
                  <div 
                    key={diff}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    onClick={() => {
                      if (selectedDifficulties.includes(diff)) {
                        const newDiffs = selectedDifficulties.filter(d => d !== diff);
                        setSelectedDifficulties(newDiffs.length === 0 ? ['all'] : newDiffs);
                      } else {
                        const newDiffs = selectedDifficulties.filter(d => d !== 'all');
                        setSelectedDifficulties([...newDiffs, diff]);
                      }
                    }}
                  >
                    <input type="checkbox" checked={selectedDifficulties.includes(diff)} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                    <span className="text-sm text-gray-700">{diff}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Year Dropdown */}
          <div className="relative">
            <div 
              onClick={() => { setIsYearMenuOpen(!isYearMenuOpen); setIsSubjectMenuOpen(false); setIsDifficultyMenuOpen(false); }}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors"
            >
              <span className="truncate text-gray-700 text-sm">
                {selectedYears.includes('all') ? 'All Years' : selectedYears.join(', ')}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            
            {isYearMenuOpen && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                <div 
                  className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-100"
                  onClick={() => { setSelectedYears(['all']); setIsYearMenuOpen(false); }}
                >
                  <input type="checkbox" checked={selectedYears.includes('all')} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">All Years</span>
                </div>
                {['2021', '2022', '2023', '2024', '2025'].map(year => (
                  <div 
                    key={year}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    onClick={() => {
                      if (selectedYears.includes(year)) {
                        const newYears = selectedYears.filter(y => y !== year);
                        setSelectedYears(newYears.length === 0 ? ['all'] : newYears);
                      } else {
                        const newYears = selectedYears.filter(y => y !== 'all');
                        setSelectedYears([...newYears, year]);
                      }
                    }}
                  >
                    <input type="checkbox" checked={selectedYears.includes(year)} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                    <span className="text-sm text-gray-700">{year}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 100% Dynamic Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Questions Found</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalQuestions}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Attempted</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{attemptedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 opacity-60">
          <p className="text-sm text-gray-600">Bookmarked</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">--</p> 
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Accuracy</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {attemptedCount > 0 ? `${accuracy}%` : '--%'}
          </p>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Fetching questions from database...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">Error loading questions</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Questions List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const optionsArray = [q.option_a, q.option_b, q.option_c, q.option_d];
            const correctIndex = ['A', 'B', 'C', 'D'].indexOf(q.correct_option);
            const isBookmarked = false;
            
            const currentSavedAnswer = userAnswers[q.question_id];
            const hasBeenAttempted = currentSavedAnswer !== undefined;

            return (
              <div key={q.question_id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {q.subject}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {q.chapter || 'General'}
                      </span>
                      {q.difficulty && (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        {q.exam} {q.year}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium">{q.question_text}</p>
                    {/* 🌟 If the question has an image path in the DB, render it! */}
                      {q.image_path && (
                        <img 
                          src={`/${q.image_path}`} 
                          alt="Question diagram" 
                          className="mt-4 max-h-60 object-contain rounded-lg border border-gray-200"
                        />
                      )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {hasBeenAttempted && (
                      currentSavedAnswer === correctIndex ?
                        <CheckCircle className="w-5 h-5 text-green-600" /> :
                        <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <button className={`p-2 rounded-lg ${isBookmarked ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'}`}>
                      <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {optionsArray.map((option, idx) => {
                    if (!option) return null; 

                    const selectedIdx = userAnswers[q.question_id];
                    const isAttempted = selectedIdx !== undefined;
                    
                    let buttonStyle = 'border-gray-200 hover:bg-gray-50'; 

                    if (isAttempted) {
                      if (idx === correctIndex) {
                        buttonStyle = 'border-green-500 bg-green-50 text-green-900 font-semibold';
                      } else if (idx === selectedIdx) {
                        buttonStyle = 'border-red-500 bg-red-50 text-red-900';
                      } else {
                        buttonStyle = 'border-gray-200 opacity-50 cursor-not-allowed';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAttempted} 
                        onClick={() => handleOptionSelect(q.question_id, idx)} 
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${buttonStyle}`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                {userAnswers[q.question_id] !== undefined && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-bold text-blue-900">Solution</p>
                      {userAnswers[q.question_id] === correctIndex ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">Correct!</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">Incorrect</span>
                      )}
                    </div>
                    <p className="text-sm text-blue-900 font-semibold mb-1">
                      Correct Option: {q.correct_option}
                    </p>
                    <p className="text-sm text-blue-800">
                      {q.solution_text || "No detailed explanation available."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && filteredQuestions.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No questions found matching your filters in the database.</p>
        </div>
      )}
      
      {/* 180-Question Gatekeeper Button */}
      <button
          onClick={handleStartTest}
          className="fixed bottom-8 right-8 z-40 flex items-center justify-center shadow-lg px-6 h-14 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 gap-2 hover:scale-105 active:scale-95 transition-all"
      >
        <FileText size={20} />
        Attempt Test
      </button>
    </div>
  );
}