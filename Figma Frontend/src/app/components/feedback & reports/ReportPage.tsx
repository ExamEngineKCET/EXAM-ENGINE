import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ReportPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [form, setForm] = useState({
    question_id: '',
    issue_type: 'Wrong Option',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanId = form.question_id.trim();
    if (!cleanId) return alert("Please specify a Target Question ID reference.");
    if (!form.description.trim()) return alert("Please clarify details regarding the issue.");

    // STRICT IDENTITY CHECK: No more hardcoded fallbacks
    let activeUserId = localStorage.getItem("id");
    
    if (!activeUserId) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try { activeUserId = JSON.parse(storedUser).id; } catch (err) {}
      }
    }
    
    // Block if no real user ID is found
    if (!activeUserId) {
      alert("Authentication Error: You must be logged in to report questions.");
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("http://localhost:8000/api/interactions/reports", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": activeUserId // Sends the REAL ID, guaranteed
        },
        body: JSON.stringify({
          question_id: cleanId,
          issue_type: form.issue_type,
          description: form.description
        })
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to securely log structural error report details.");
      }
    } catch {
      alert("Error contacting interface indexing networks.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-gray-800 p-6">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-amber-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Anomalous Data Logged</h2>
          <p className="text-gray-500 text-sm leading-relaxed">Thank you for reporting this issue. Our team will verify and correct the question metadata fields.</p>
          <button onClick={() => navigate('/feedback-report')} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors">
            Return to Support Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 p-6 flex flex-col">
      <header className="max-w-2xl mx-auto w-full mb-8">
        <button onClick={() => navigate('/feedback-report')} className="flex items-center gap-2 text-gray-600 hover:text-black font-semibold transition-colors">
          <ArrowLeft size={20} /> Back
        </button>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b pb-4 mb-6">
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-500"><AlertTriangle size={24} /></div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Report Question Issues</h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Help clean our database by flagging typographical anomalies</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Question ID *</label>
              <input 
                type="text" 
                placeholder="e.g., KCET-2025-CHEM-Q1" 
                value={form.question_id}
                onChange={(e) => setForm({ ...form, question_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono text-sm"
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categorized Issue Type *</label>
              <select 
                value={form.issue_type}
                onChange={(e) => setForm({ ...form, issue_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-medium"
              >
                <option value="Wrong Option">Wrong Option / Mismatched Solution Key</option>
                <option value="Typo in Question">Typo in Question Text Core String</option>
                <option value="Missing Image Layout">Missing Image Layout Asset on Disk</option>
                <option value="Math Rendering Error">LaTeX / Math Subscript Rendering Error</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailed Breakdown Description *</label>
              <textarea 
                rows={4}
                placeholder="Please describe the issue (e.g., 'Option C should contain a positive exponent instead of negative...')" 
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm leading-relaxed"
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 font-bold text-white text-base rounded-xl transition-colors shadow-sm disabled:opacity-50 border-b-4 border-amber-700 active:border-b-0 active:mt-1"
            >
              {isLoading ? "Filing Security Ticket..." : "File Anomaly Report"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}