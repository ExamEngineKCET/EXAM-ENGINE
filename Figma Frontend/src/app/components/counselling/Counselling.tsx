// import { useState } from 'react';
// import { Award, Search, MapPin, DollarSign, TrendingUp } from 'lucide-react';

// export default function Counselling() {
//   const [rank, setRank] = useState('');
//   const [category, setCategory] = useState('GM');
//   const [branch, setBranch] = useState('');

//   const colleges = [
//     { name: 'NIE, Mysuru', branch: 'CSE', cutoff: 8500, fees: 65000, placement: 95, location: 'Mysuru' },
//     { name: 'SJCE, Mysuru', branch: 'ISE', cutoff: 12000, fees: 58000, placement: 92, location: 'Mysuru' },
//     { name: 'DSCE, Bangalore', branch: 'ECE', cutoff: 15000, fees: 72000, placement: 88, location: 'Bangalore' },
//   ];

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-gray-900">KCET Counselling Assistant</h1>
//         <p className="text-gray-600 mt-1">Get personalized college and branch recommendations</p>
//       </div>

//       <div className="bg-white rounded-xl p-6 border border-gray-200">
//         <h2 className="text-lg font-bold text-gray-900 mb-4">Enter Your Details</h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <input
//             type="number"
//             value={rank}
//             onChange={(e) => setRank(e.target.value)}
//             placeholder="Your KCET Rank"
//             className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           <select
//             value={category}
//             onChange={(e) => setCategory(e.target.value)}
//             className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="GM">General Merit (GM)</option>
//             <option value="OBC">OBC</option>
//             <option value="SC">SC</option>
//             <option value="ST">ST</option>
//           </select>
//           <select
//             value={branch}
//             onChange={(e) => setBranch(e.target.value)}
//             className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="">Preferred Branch</option>
//             <option value="CSE">Computer Science</option>
//             <option value="ISE">Information Science</option>
//             <option value="ECE">Electronics & Communication</option>
//             <option value="ME">Mechanical</option>
//           </select>
//         </div>
//       </div>

//       <div className="space-y-4">
//         <h2 className="text-lg font-bold text-gray-900">Recommended Colleges</h2>
//         {colleges.map((college, idx) => (
//           <div key={idx} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
//             <div className="flex justify-between items-start mb-4">
//               <div>
//                 <h3 className="text-lg font-bold text-gray-900">{college.name}</h3>
//                 <p className="text-blue-600 font-medium mt-1">{college.branch}</p>
//               </div>
//               <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
//                 Safe
//               </span>
//             </div>

//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
//               <div className="flex items-center gap-2">
//                 <TrendingUp className="w-4 h-4 text-gray-400" />
//                 <div>
//                   <p className="text-xs text-gray-600">Cutoff Rank</p>
//                   <p className="font-medium text-gray-900">{college.cutoff.toLocaleString()}</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-2">
//                 <DollarSign className="w-4 h-4 text-gray-400" />
//                 <div>
//                   <p className="text-xs text-gray-600">Annual Fees</p>
//                   <p className="font-medium text-gray-900">₹{college.fees.toLocaleString()}</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Award className="w-4 h-4 text-gray-400" />
//                 <div>
//                   <p className="text-xs text-gray-600">Placement</p>
//                   <p className="font-medium text-gray-900">{college.placement}%</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-2">
//                 <MapPin className="w-4 h-4 text-gray-400" />
//                 <div>
//                   <p className="text-xs text-gray-600">Location</p>
//                   <p className="font-medium text-gray-900">{college.location}</p>
//                 </div>
//               </div>
//             </div>

//             <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
//               View Details
//             </button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
