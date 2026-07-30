import { Link } from 'react-router';
import {
  BookOpen, FileText, Target, TrendingUp, Award, Calendar,
  Clock, CheckCircle, XCircle, Bookmark, Flame
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  // Mock data
  const stats = {
    totalQuestions: 1250,
    questionsAttempted: 840,
    mockTestsTaken: 12,
    currentStreak: 7,
    accuracy: 78,
    weeklyTarget: 85
  };

  const subjectPerformance = [
    { subject: 'Physics', score: 75, total: 100 },
    { subject: 'Chemistry', score: 82, total: 100 },
    { subject: 'Mathematics', score: 68, total: 100 },
  ];

  const weeklyActivity = [
    { day: 'Mon', questions: 45 },
    { day: 'Tue', questions: 62 },
    { day: 'Wed', questions: 38 },
    { day: 'Thu', questions: 71 },
    { day: 'Fri', questions: 54 },
    { day: 'Sat', questions: 89 },
    { day: 'Sun', questions: 67 },
  ];

  const performanceData = [
    { name: 'Correct', value: stats.questionsAttempted * (stats.accuracy / 100), color: '#10b981' },
    { name: 'Incorrect', value: stats.questionsAttempted * (1 - stats.accuracy / 100), color: '#ef4444' },
  ];

  const recentTests = [
    { id: 1, name: 'Full KCET Mock Test 5', score: 145, total: 180, date: '2 days ago' },
    { id: 2, name: 'Physics Chapter Test', score: 38, total: 50, date: '4 days ago' },
    { id: 3, name: 'Mathematics Mock Test', score: 52, total: 60, date: '1 week ago' },
  ];

  const weakTopics = [
    { topic: 'Thermodynamics', subject: 'Physics', accuracy: 45 },
    { topic: 'Organic Chemistry', subject: 'Chemistry', accuracy: 52 },
    { topic: 'Calculus', subject: 'Mathematics', accuracy: 58 },
  ];

  const upcomingTests = [
    { id: 1, name: 'Full Length Mock Test 6', date: 'Tomorrow, 10:00 AM', duration: '180 min' },
    { id: 2, name: 'Chemistry Test - Equilibrium', date: 'May 10, 2:00 PM', duration: '60 min' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user.name}!</h1>
        <p className="text-blue-100">Let's continue your KCET preparation journey</p>
        <div className="mt-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-300" />
          <span className="font-medium">{stats.currentStreak} day streak!</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.questionsAttempted}</p>
              <p className="text-sm text-gray-600">Questions Solved</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.accuracy}%</p>
              <p className="text-sm text-gray-600">Overall Accuracy</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.mockTestsTaken}</p>
              <p className="text-sm text-gray-600">Mock Tests</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.currentStreak}</p>
              <p className="text-sm text-gray-600">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Subject Performance</h2>
          <div className="space-y-4">
            {subjectPerformance.map((subject) => (
              <div key={subject.subject}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{subject.subject}</span>
                  <span className="text-gray-600">{subject.score}/{subject.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(subject.score / subject.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Pie */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Accuracy Overview</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">Incorrect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Activity</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="questions" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Tests & Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tests */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Tests</h2>
            <Link to="/mock-tests" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTests.map((test) => (
              <div key={test.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{test.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{test.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{test.score}/{test.total}</p>
                    <p className="text-sm text-gray-600">{Math.round((test.score/test.total)*100)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Areas to Improve</h2>
          <div className="space-y-3">
            {weakTopics.map((topic, index) => (
              <div key={index} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{topic.topic}</p>
                    <p className="text-sm text-gray-600">{topic.subject}</p>
                  </div>
                  <span className="text-sm font-medium text-red-600">{topic.accuracy}%</span>
                </div>
                <Link
                  to={`/practice?topic=${topic.topic}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Practice Now →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Tests */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Scheduled Tests</h2>
          <Link to="/mock-tests" className="text-sm text-blue-600 hover:text-blue-700">
            Schedule new
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingTests.map((test) => (
            <div key={test.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{test.name}</p>
                  <p className="text-sm text-gray-600">{test.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {test.duration}
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Start Test
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/practice"
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <BookOpen className="w-8 h-8 mb-3" />
          <h3 className="font-bold mb-1">Continue Practice</h3>
          <p className="text-sm text-blue-100">Solve more questions</p>
        </Link>

        <Link
          to="/mock-tests"
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:from-purple-600 hover:to-purple-700 transition-all"
        >
          <FileText className="w-8 h-8 mb-3" />
          <h3 className="font-bold mb-1">Take Mock Test</h3>
          <p className="text-sm text-purple-100">Test your preparation</p>
        </Link>

        <Link
          to="/rank-predictor"
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 hover:from-orange-600 hover:to-orange-700 transition-all"
        >
          <TrendingUp className="w-8 h-8 mb-3" />
          <h3 className="font-bold mb-1">Predict Rank</h3>
          <p className="text-sm text-orange-100">Estimate your KCET rank</p>
        </Link>
      </div>
    </div>
  );
}
