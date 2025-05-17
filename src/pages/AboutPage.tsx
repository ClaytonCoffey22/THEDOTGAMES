import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { AlarmClock, Flag, Shield, Zap, Target, Award } from 'lucide-react';

const AboutPage: React.FC = () => {
  return (
    <div className="pt-28 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              About The Dot Games
            </h1>
            <p className="text-lg text-gray-300">
              A nightly digital battle royale where only one dot will survive
            </p>
          </div>
          
          {/* About the game */}
          <div className="bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700 p-6 md:p-8 mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">What Are The Dot Games?</h2>
            <div className="prose prose-invert max-w-none">
              <p>
                Welcome to The Dot Games, where digital avatars in the form of dots battle in a nightly competition where only one can emerge victorious! Each night at 11:00 PM Eastern Time, dots named after participants enter a digital arena to compete in an unpredictable battle royale.
              </p>
              <p>
                The rules are simple: larger dots can consume smaller ones, and the last dot standing wins. But don't be fooled by the simplicity—strategy, luck, and special powers all play a role in determining the champion.
              </p>
              <p>
                Some dots are randomly assigned special powers that can dramatically change their chances of survival. Whether you're watching for entertainment or cheering on your own dot, The Dot Games offers a uniquely engaging spectacle each night.
              </p>
            </div>
          </div>
          
          {/* How it works */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <div className="flex items-center mb-3">
                  <AlarmClock className="h-5 w-5 text-cyan-400 mr-2" />
                  <h3 className="text-lg font-semibold text-white">Nightly Battles</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  Every night at 11:00 PM ET, a new simulation begins. The battles are fully automated and run in real-time, so anyone can watch as the drama unfolds.
                </p>
              </div>
              
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <div className="flex items-center mb-3">
                  <Flag className="h-5 w-5 text-cyan-400 mr-2" />
                  <h3 className="text-lg font-semibold text-white">Participant Entry</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  Anyone can join by submitting their name through the registration page. Your name will be assigned to a dot in an upcoming battle.
                </p>
              </div>
              
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <div className="flex items-center mb-3">
                  <Shield className="h-5 w-5 text-cyan-400 mr-2" />
                  <h3 className="text-lg font-semibold text-white">Special Powers</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  Some dots are randomly assigned special powers that activate during the battle. These can include speed boosts, shields, teleportation, and growth abilities.
                </p>
              </div>
              
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <div className="flex items-center mb-3">
                  <Award className="h-5 w-5 text-cyan-400 mr-2" />
                  <h3 className="text-lg font-semibold text-white">Victory & Glory</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  The last dot standing is crowned the winner. Victories and eliminations are tracked on the leaderboard, building reputations over time.
                </p>
              </div>
            </div>
          </div>
          
          {/* Game rules */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">Game Rules</h2>
            <div className="bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700 p-6">
              <div className="space-y-4">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 mr-4">
                    <span className="text-cyan-400 font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Movement</h3>
                    <p className="text-gray-300 text-sm">
                      Dots move randomly within the arena boundaries. Their movement patterns are unpredictable and can change at any moment.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 mr-4">
                    <span className="text-cyan-400 font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Consumption</h3>
                    <p className="text-gray-300 text-sm">
                      Larger dots can consume smaller ones when they come into contact. When a dot consumes another, it grows slightly larger, making it more powerful.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 mr-4">
                    <span className="text-cyan-400 font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Powers</h3>
                    <p className="text-gray-300 text-sm">
                      Some dots have special powers that activate randomly during the battle:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                      <li className="flex items-start">
                        <Zap className="h-4 w-4 text-yellow-400 mr-1 mt-0.5" />
                        <span><strong>Speed Boost:</strong> Temporarily increases movement speed</span>
                      </li>
                      <li className="flex items-start">
                        <Shield className="h-4 w-4 text-blue-400 mr-1 mt-0.5" />
                        <span><strong>Shield:</strong> Prevents being consumed by larger dots</span>
                      </li>
                      <li className="flex items-start">
                        <Target className="h-4 w-4 text-purple-400 mr-1 mt-0.5" />
                        <span><strong>Teleport:</strong> Randomly teleports to a new location</span>
                      </li>
                      <li className="flex items-start">
                        <Award className="h-4 w-4 text-green-400 mr-1 mt-0.5" />
                        <span><strong>Growth:</strong> Gradually increases in size without consuming dots</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 mr-4">
                    <span className="text-cyan-400 font-semibold">4</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Victory</h3>
                    <p className="text-gray-300 text-sm">
                      The last dot remaining in the arena is declared the winner. Winners are recorded in the leaderboard along with the number of eliminations they achieved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* FAQ */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <h3 className="text-lg font-medium text-white mb-2">How do I participate?</h3>
                <p className="text-gray-300 text-sm">
                  Simply visit the "Join Battle" page and submit your name. Your dot will be added to the next available battle. You don't need to be online during the battle—results will be available afterward.
                </p>
              </div>
              
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <h3 className="text-lg font-medium text-white mb-2">When do battles take place?</h3>
                <p className="text-gray-300 text-sm">
                  Battles occur every night at 11:00 PM Eastern Time. Each battle typically lasts 5-10 minutes, depending on the number of dots and their interactions.
                </p>
              </div>
              
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <h3 className="text-lg font-medium text-white mb-2">Can I control my dot?</h3>
                <p className="text-gray-300 text-sm">
                  No, all dot movements and behaviors are automated. The fun comes from the unpredictability of the simulation and seeing how your dot performs against others.
                </p>
              </div>
              
              <div className="bg-gray-800 bg-opacity-40 rounded-lg border border-gray-700 p-5">
                <h3 className="text-lg font-medium text-white mb-2">How are powers assigned?</h3>
                <p className="text-gray-300 text-sm">
                  Powers are randomly assigned to approximately 30% of dots when they enter the arena. You won't know if your dot has a power until the battle begins.
                </p>
              </div>
            </div>
          </div>
          
          {/* Call to action */}
          <div className="text-center">
            <p className="text-lg text-gray-300 mb-6">
              Ready to join the competition? Register your dot now and watch the nightly battles!
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/join">
                <Button variant="primary">
                  Join the Battle
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline">
                  Watch Live
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;