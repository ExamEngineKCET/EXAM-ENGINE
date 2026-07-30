import { User, Mail, School, Award, Settings } from 'lucide-react';

export default function Profile({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <School className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Institution</p>
              <p className="font-medium text-gray-900">{user.institution}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <Award className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="font-medium text-gray-900">{user.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <Settings className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Target Exam</p>
              <p className="font-medium text-gray-900">{user.targetExam}</p>
            </div>
          </div>
        </div>

        <button className="mt-6 w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          Edit Profile
        </button>
      </div>
    </div>
  );
}
