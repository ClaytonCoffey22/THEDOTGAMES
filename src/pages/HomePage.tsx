import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BattleArena from "../components/game/BattleArena";
import KillFeed from "../components/game/KillFeed";
import PowersLegend from "../components/game/PowersLegend";
import Button from "../components/ui/Button";
import { useGame } from "../context/GameContext";
import { Play, Share2 } from "lucide-react";

const HomePage: React.FC = () => {
  const {
    simulationState,
    startTodaysBattle,
    nextBattleTime,
    timeUntilBattle,
    todaysParticipants,
    isSimulationRunning,
    registrationStatus,
  } = useGame();

  const [arenaSize, setArenaSize] = useState({ width: 800, height: 600 });

  // Handle responsive arena sizing
  useEffect(() => {
    const handleResize = () => {
      // Get container width
      const container = document.getElementById("arena-container");
      if (container) {
        const width = container.clientWidth;
        // Keep aspect ratio
        const height = width * 0.75; // 4:3 aspect ratio
        setArenaSize({ width, height: Math.min(height, 600) });
      }
    };

    // Initial size
    handleResize();

    // Update on resize
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

  return (
    <div className="pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Hero section */}
        <div className="text-center mb-8 pt-12 pb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
            THE DOT GAMES
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            A nightly battle royale where only one dot survives. Who will be
            tonight's champion?
          </p>

          {/* Countdown */}
          <div className="mt-8 max-w-sm mx-auto bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-1">
              Next Battle
            </h2>
            <div className="font-mono text-2xl font-bold text-pink-500 mb-2">
              {todaysParticipants.length < 2 ? (
                <>
                  Not enough dots!{" "}
                  <Link to="/join" className="text-cyan-400 hover:underline">
                    Join the battle
                  </Link>{" "}
                  to add your dot.
                </>
              ) : isSimulationRunning ? (
                <>
                  <span className="text-pink-500 font-semibold">
                    {simulationState.dots.length} dots
                  </span>{" "}
                  remaining in the arena
                </>
              ) : (
                <>
                  <span className="text-cyan-500 font-semibold">
                    {todaysParticipants.length} dots
                  </span>{" "}
                  waiting for battle
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Battle arena */}
          <div className="lg:col-span-3" id="arena-container">
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Battle Arena</h2>
                <div className="flex space-x-2">
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
                    <Button
                      onClick={handleShareResult}
                      variant="secondary"
                      icon={<Share2 className="h-4 w-4" />}
                    >
                      Share Result
                    </Button>
                  )}
                </div>
              </div>

              <BattleArena width={arenaSize.width} height={arenaSize.height} />

              <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">
                  {todaysParticipants.length < 2 ? (
                    <>
                      Not enough dots!{" "}
                      <Link
                        to="/join"
                        className="text-cyan-400 hover:underline"
                      >
                        Join the battle
                      </Link>{" "}
                      to add your dot.
                    </>
                  ) : isSimulationRunning ? (
                    <>
                      <span className="text-pink-500 font-semibold">
                        {simulationState.dots.length} dots
                      </span>{" "}
                      remaining in the arena
                    </>
                  ) : (
                    <>
                      <span className="text-cyan-500 font-semibold">
                        {todaysParticipants.length} dots
                      </span>{" "}
                      waiting for battle
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <KillFeed />
            <PowersLegend />

            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                Join The Battle
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                Want your dot to compete in the next battle? Enter the arena and
                see if you can be the last dot standing!
              </p>
              <Link to="/join">
                <Button variant="primary" fullWidth>
                  Register Your Dot
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
