import React from 'react';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🍋</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Lemonade Stand Stock Market
        </h1>
        <p className="text-xl text-gray-600">
          React app is working! Backend server needed.
        </p>
        <div className="mt-8 p-4 bg-white rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <p className="text-green-600">✅ React Frontend: Working</p>
          <p className="text-yellow-600">⚠️ Backend Server: Not Connected</p>
        </div>
      </div>
    </div>
  );
};

export default App;

