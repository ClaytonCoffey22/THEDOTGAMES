import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { Trophy, Users, Zap, Share2 } from "lucide-react";
import Button from "../components/ui/Button";

const LeaderboardPage: React.FC = () => {
  const { allTimeLeaderboard, todaysLeaderboard } = useGame();
  const [sortBy, setSortBy] = useState<"wins" | "eliminations">("wins");

  // Sort leaderboard based on current sort selection
  const sortedLeaderboard = [...allTimeLeaderboard].sort((a, b) => {
    if (sortBy === "wins") {
      return b.wins - a.wins;
    } else {
      return b.eliminations - a.eliminations;
    }
  });

  const handleShare = (entry: {
    name: string;
    wins: number;
    eliminations: number;
  }) => {
    const shareText = `${entry.name} is dominating The Dot Games with ${entry.wins} wins and ${entry.eliminations} eliminations! Can you beat them?`;

    if (navigator.share) {
      navigator
        .share({
          title: "The Dot Games Leaderboard",
          text: shareText,
          url: window.location.href,
        })
        .catch((error) => console.log("Error sharing", error));
    } else {
      navigator.clipboard
        .writeText(shareText)
        .then(() => alert("Stats copied to clipboard!"))
        .catch((err) => console.error("Could not copy text: ", err));
    }
  };

  return (
    <div className="pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Leaderboard
            </h1>
            <p className="text-lg text-gray-300">
              The most successful dots in The Dot Games history
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-5">
              <div className="flex items-center mb-3">
                <Trophy className="h-6 w-6 text-yellow-500 mr-2" />
                <h3 className="text-lg font-semibold text-white">Top Winner</h3>
              </div>
              {sortedLeaderboard.length > 0 ? (
                <>
                  <div className="text-2xl font-bold text-white mb-1">
                    {sortedLeaderboard[0].name}
                  </div>
                  <div className="text-yellow-400">
                    {sortedLeaderboard[0].wins} victories
                  </div>
                </>
              ) : (
                <div className="text-gray-400 italic">No winners yet</div>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-5">
              <div className="flex items-center mb-3">
                <Zap className="h-6 w-6 text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">
                  Most Eliminations
                </h3>
              </div>
              {sortedLeaderboard.length > 0 ? (
                <>
                  <div className="text-2xl font-bold text-white mb-1">
                    {
                      sortedLeaderboard.sort(
                        (a, b) => b.eliminations - a.eliminations
                      )[0].name
                    }
                  </div>
                  <div className="text-purple-400">
                    {
                      sortedLeaderboard.sort(
                        (a, b) => b.eliminations - a.eliminations
                      )[0].eliminations
                    }{" "}
                    eliminations
                  </div>
                </>
              ) : (
                <div className="text-gray-400 italic">No eliminations yet</div>
              )}
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-center mb-3">
                <Users className="h-6 w-6 text-cyan-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">
                  Total Participants
                </h3>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {allTimeLeaderboard.length}
              </div>
              <div className="text-cyan-400">unique dots</div>
            </div>
          </div>

          {/* Sorting controls */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Hall of Fame</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setSortBy("wins")}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  sortBy === "wins"
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Sort by Wins
              </button>
              <button
                onClick={() => setSortBy("eliminations")}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  sortBy === "eliminations"
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Sort by Eliminations
              </button>
            </div>
          </div>

          {/* Leaderboard table */}
          <div className="bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700 overflow-hidden">
            {sortedLeaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Rank
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Dot Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Wins
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Eliminations
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 bg-opacity-50 divide-y divide-gray-800">
                    {sortedLeaderboard.map((entry, index) => (
                      <tr
                        key={entry.name}
                        className="hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {index === 0 && (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-500 rounded-full text-xs font-medium text-white">
                              1
                            </span>
                          )}
                          {index === 1 && (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-400 rounded-full text-xs font-medium text-white">
                              2
                            </span>
                          )}
                          {index === 2 && (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-700 rounded-full text-xs font-medium text-white">
                              3
                            </span>
                          )}
                          {index > 2 && (
                            <span className="text-gray-400 pl-2">
                              {index + 1}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {entry.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-cyan-400 font-medium">
                            {entry.wins}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-pink-400">
                            {entry.eliminations}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleShare(entry)}
                            className="text-gray-400 hover:text-cyan-400"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-400">
                  No battle results yet. Check back after the first simulation!
                </p>
              </div>
            )}
          </div>

          {/* Call to action */}
          <div className="mt-10 text-center">
            <p className="text-gray-300 mb-4">
              Don't see your name on the leaderboard? Join the next battle and
              compete for glory!
            </p>
            <Button
              variant="primary"
              onClick={() => (window.location.href = "/join")}
            >
              Register Your Dot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
