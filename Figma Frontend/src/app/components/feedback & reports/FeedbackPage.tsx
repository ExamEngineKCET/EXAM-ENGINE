import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, MessageSquare, CheckCircle } from 'lucide-react';

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFeedback = feedback.trim();
    
    if (!cleanFeedback) return alert("Feedback body cannot be left blank.");

    // STRICT IDENTITY CHECK: No more hardcoded fallbacks
    let activeUserId = localStorage.getItem("id");
    
    if (!activeUserId) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try { activeUserId = JSON.parse(storedUser).id; } catch (err) {}
      }
    }
    
    // If we STILL don't have an ID, the user is not logged in. Block them.
    if (!activeUserId) {
      alert("Authentication Error: You must be logged in to submit feedback.");
      navigate('/login'); // Or wherever your login route is
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/interactions/feedback", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": activeUserId // Sends the REAL ID, guaranteed
        },
        body: JSON.stringify({ feedback: cleanFeedback })
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to deliver app performance metric reviews.");
      }
    } catch {
      alert("Error parsing connection channels.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-gray-800 p-6">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-blue-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Feedback Transmitted!</h2>
          <p className="text-gray-500 text-sm leading-relaxed">Your message has been streamed straight to our development channel log indices. Thank you for helping us iterate!</p>
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
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600"><MessageSquare size={24} /></div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Share Your Feedback</h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Propose system revisions or log structural enhancement requests</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message / Suggestions *</label>
              <textarea 
                rows={5}
                placeholder="What features or performance tweaks should we prioritize next on our design boards?" 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm leading-relaxed"
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 font-bold text-white text-base rounded-xl transition-colors shadow-sm disabled:opacity-50 border-b-4 border-blue-800 active:border-b-0 active:mt-1"
            >
              {isLoading ? "Streaming to Core Channels..." : "Transmit Feedback"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}