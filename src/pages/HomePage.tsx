import { Play, Share2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminBattleSettings, { BattleSettings } from "../components/game/AdminBattleSettings";
import BattleArena from "../components/game/BattleArena";
import KillFeed from "../components/game/KillFeed";
import PowersLegend from "../components/game/PowersLegend";
import Button from "../components/ui/Button";
import { useGame } from "../context/GameContext";

const HomePage: React.FC = () => {
  const { simulationState, startTodaysBattle, timeUntilBattle, todaysParticipants, isSimulationRunning, registrationStatus } = useGame();

  const [arenaSize, setArenaSize] = useState({ width: 800, height: 600 });
  const [currentBattleSettings, setCurrentBattleSettings] = useState<BattleSettings | null>(null);

  // Handle responsive arena sizing
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById("arena-container");
      if (container) {
        const width = container.clientWidth;
        const height = width * 0.75; // 4:3 aspect ratio
        setArenaSize({ width, height: Math.min(height, 600) });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleShareResult = () => {
    if (!simulationState.winner) return;

    const shareText = `${simulationState.winner.name} just won The Dot Games with ${simulationState.winner.eliminations} eliminations! Watch tonight's battle at 11PM ET!`;

    if (navigator.share) {
      navigator
        .share({
          title: "The Dot Games Results",
          text: shareText,
          url: window.location.href,
        })
        .catch((error) => console.log("Error sharing", error));
    } else {
      navigator.clipboard
        .writeText(shareText)
        .then(() => alert("Result copied to clipboard!"))
        .catch((err) => console.error("Could not copy text: ", err));
    }
  };

  const handleSettingsChange = (settings: BattleSettings) => {
    setCurrentBattleSettings(settings);
    console.log("Battle settings updated:", settings);
  };

  const getBattleStatusMessage = () => {
    if (todaysParticipants.length < 1) {
      return (
        <>
          Not enough dots!{" "}
          <Link to="/join" className="text-cyan-400 hover:underline">
            Join the battle
          </Link>{" "}
          to add your dot.
        </>
      );
    } else if (isSimulationRunning) {
      return (
        <>
          <span className="text-pink-500 font-semibold animate-pulse">{simulationState.dots.length} dots</span> remaining in the arena
        </>
      );
    } else {
      return (
        <>
          <span className="text-cyan-500 font-semibold">{todaysParticipants.length} dots</span> waiting for battle
        </>
      );
    }
  };

  return (
    <div className="pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Hero section */}
        <div className="text-center mb-8 pt-12 pb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
            THE DOT GAMES
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            A nightly battle royale where only one dot survives. Who will be tonight's champion?
          </p>

          {/* Countdown */}
          <div className="mt-8 max-w-sm mx-auto bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-1">Next Battle</h2>
            <div className="font-mono text-xl font-bold text-pink-500 mb-2">{timeUntilBattle || "11:00 PM ET"}</div>
            <div className="text-sm text-gray-400">{getBattleStatusMessage()}</div>
          </div>

          {/* Current Battle Settings Display */}
          {currentBattleSettings && (
            <div className="mt-4 max-w-md mx-auto bg-gray-900 bg-opacity-50 rounded-lg p-3 border border-gray-600">
              <div className="text-sm text-gray-400 mb-1">Battle Configuration:</div>
              <div className="text-sm text-white">
                <span className="capitalize text-red-400">{currentBattleSettings.intensity}</span> intensity •{" "}
                <span className="capitalize text-blue-400">{currentBattleSettings.duration}</span> duration •{" "}
                <span className="capitalize text-yellow-400">{currentBattleSettings.powerFrequency}</span> powers
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {currentBattleSettings.battleDurationMinutes}min battles • {Math.round(currentBattleSettings.powerChance * 100)}% power
                chance
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Battle arena */}
          <div className="lg:col-span-3" id="arena-container">
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Battle Arena</h2>
                <div className="flex space-x-2">
                  {/* Admin Settings */}
                  <AdminBattleSettings onSettingsChange={handleSettingsChange} onStartBattle={startTodaysBattle} />

                  {!simulationState.inProgress && !simulationState.winner && (
                    <Button
                      onClick={() => startTodaysBattle()}
                      variant="primary"
                      icon={<Play className="h-4 w-4" />}
                      disabled={todaysParticipants.length < 2}
                    >
                      Start Simulation
                    </Button>
                  )}

                  {!simulationState.inProgress && simulationState.winner && (
                    <Button onClick={handleShareResult} variant="secondary" icon={<Share2 className="h-4 w-4" />}>
                      Share Result
                    </Button>
                  )}
                </div>
              </div>

              <BattleArena width={arenaSize.width} height={arenaSize.height} />

              <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">{getBattleStatusMessage()}</p>

                {/* Battle Progress Indicator */}
                {isSimulationRunning && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.max(10, (1 - simulationState.dots.length / todaysParticipants.length) * 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Battle Progress: {Math.round((1 - simulationState.dots.length / todaysParticipants.length) * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <KillFeed />
            <PowersLegend />

            {/* Battle Statistics */}
            {todaysParticipants.length > 0 && (
              <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Today's Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Guest Participants:</span>
                    <span className="text-pink-400 font-medium">{todaysParticipants.filter((p) => !p.is_registered).length}</span>
                  </div>
                  {simulationState.eliminationLog.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Eliminations:</span>
                      <span className="text-orange-400 font-medium">{simulationState.eliminationLog.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">Join The Battle</h3>
              <p className="text-gray-300 text-sm mb-4">
                Want your dot to compete in the next battle? Enter the arena and see if you can be the last dot standing!
              </p>
              <Link to="/join">
                <Button variant="primary" fullWidth>
                  Register Your Dot
                </Button>
              </Link>
            </div>

            {/* Battle Schedule */}
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">Battle Schedule</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Daily Battle:</span>
                  <span className="text-cyan-400 font-medium">11:00 PM ET</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Registration:</span>
                  <span className="text-green-400 font-medium">{registrationStatus === "registration" ? "Open" : "Closed"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Battle Status:</span>
                  <span
                    className={`font-medium ${
                      registrationStatus === "registration"
                        ? "text-blue-400"
                        : registrationStatus === "in_progress"
                        ? "text-orange-400"
                        : "text-purple-400"
                    }`}
                  >
                    {registrationStatus === "registration" ? "Waiting" : registrationStatus === "in_progress" ? "In Progress" : "Completed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it works section */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">How The Dot Games Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-lg font-bold text-white mb-2">Register Your Dot</h3>
              <p className="text-gray-300 text-sm">Submit your name and join the nightly battle royale as a unique dot competitor.</p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-4">⚔️</div>
              <h3 className="text-lg font-bold text-white mb-2">Battle Begins</h3>
              <p className="text-gray-300 text-sm">
                Watch live as dots hunt each other in an arena that shrinks over time, forcing confrontations.
              </p>
            </div>
            <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg border border-gray-700">
              <div className="text-3xl mb-4">🏆</div>
              <h3 className="text-lg font-bold text-white mb-2">Last Dot Wins</h3>
              <p className="text-gray-300 text-sm">
                The final survivor claims victory and earns their place on the leaderboard of champions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
