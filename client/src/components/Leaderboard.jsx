import React from 'react';

export function Leaderboard({ leaderboard, currentPlayerId }) {
  const getBackgroundColor = (rank) => {
    if (rank === 1) return 'bg-yellow-100 border-l-4 border-yellow-400';
    if (rank === 2) return 'bg-gray-100 border-l-4 border-gray-400';
    if (rank === 3) return 'bg-orange-100 border-l-4 border-orange-400';
    return 'bg-white';
  };

  const getMedalEmoji = (rank) => {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return medals[rank] || `${rank}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl p-8">
      <h3 className="text-2xl font-bold mb-6">Live Leaderboard</h3>

      <div className="space-y-2">
        {leaderboard.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Waiting for players...
          </div>
        ) : (
          leaderboard.map((player) => (
            <div
              key={player.rank}
              className={`flex items-center justify-between p-4 rounded-lg ${getBackgroundColor(player.rank)} ${
                player.rank === 1 ? 'ring-2 ring-yellow-400' : ''
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="text-2xl font-bold text-center w-10">
                  {getMedalEmoji(player.rank)}
                </div>
                <div>
                  <p className="font-bold text-lg">{player.name}</p>
                  <p className="text-sm text-gray-600">
                    {player.weather} • {player.location}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">
                  {player.score}
                </p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t-2 border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          📊 {leaderboard.length} players in this game
        </p>
      </div>
    </div>
  );
}
