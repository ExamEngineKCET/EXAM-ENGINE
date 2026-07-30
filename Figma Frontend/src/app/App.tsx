import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useState } from 'react';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import QuestionBank from './components/questions/QuestionBank';
import MockTests from './components/tests/MockTests';
// import TakeTest from './components/tests/TakeTest';
import Analytics from './components/analytics/Analytics';
// import RankPredictor from './components/rank/RankPredictor';
// import Counselling from './components/counselling/Counselling';
import Practice from './components/practice/Practice';
import Profile from './components/profile/Profile';
// changes 
import MockConfigPage from "./components/tests/MockConfigPage";
// changes 
//r1
import TestInterface from "./components/tests/TestInterface";
//r2
import PreviewPage from "./components/test_preview_page/PreviewPage"
//r3
import PracticeConfigPage from "./components/practice/PracticeConfig"
//r4
import ReportPage from "./components/feedback & reports/ReportPage"
import FeedbackPage from './components/feedback & reports/FeedbackPage';
import FeedbackReport from './components/feedback & reports/FeedbackReport';

export default function App() {
  const [user, setUser] = useState<any>(null);

  const handleLogin = (userData:any ) => {
  setUser(userData); // Your existing React state update
  
  //   ADD THIS: Save the ID to the browser so other pages can find it!
  localStorage.setItem("id", userData.id); 
};

const handleRegister = (userData :any) => {
  setUser(userData);
  
  //   ADD THIS HERE TOO
  localStorage.setItem("id", userData.id); 
};

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("id"); //   ADD THIS: Wipes the ID when logging out
  };
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/questions" /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/register" element={
          //   FIX: Changed handleLogin to handleRegister down below
          user ? <Navigate to="/questions" /> : <Register onRegister={handleRegister} />
        } />

        {user ? (
          <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
            <Route index element={<Navigate to="/dashboard" />} />
            {/* <Route path="dashboard" element={<Dashboard user={user} />} /> */}
            <Route path="questions" element={<QuestionBank />} />
            <Route path="mock-tests" element={<MockTests />} />
            <Route path="/test-interface" element={<TestInterface />} />            {/* changes */}
            <Route path="generate-mock" element={<MockConfigPage />} />
            {/* changes */}
            <Route path="practice" element={<Practice />} />
            {/* <Route path="analytics" element={<Analytics user={user} />} /> */}
            {/* <Route path="rank-predictor" element={<RankPredictor />} /> */}
            {/* <Route path="counselling" element={<Counselling />} /> */}
            <Route path="profile" element={<Profile user={user} />} />
            <Route path='Preview' element={<PreviewPage />}/>
            <Route path="/generate-practice" element={<PracticeConfigPage />} />
{/* r4 */}
            <Route path="/report" element={<ReportPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/feedback-report" element={<FeedbackReport />} />

          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
