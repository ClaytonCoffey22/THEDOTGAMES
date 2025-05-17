import React from 'react';
import { CircleDot, Twitter, Instagram, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and tagline */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors">
              <CircleDot className="h-6 w-6 mr-2" />
              <span className="font-bold text-xl tracking-tight">THE DOT GAMES</span>
            </Link>
            <p className="mt-2 text-gray-400 text-sm">
              A nightly battle royale where only one dot survives!
            </p>
          </div>
          
          {/* Quick links */}
          <div className="col-span-1">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-cyan-400 transition-colors">Battle Arena</Link>
              </li>
              <li>
                <Link to="/join" className="text-gray-400 hover:text-cyan-400 transition-colors">Join the Battle</Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-gray-400 hover:text-cyan-400 transition-colors">Leaderboard</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-cyan-400 transition-colors">About</Link>
              </li>
            </ul>
          </div>
          
          {/* Rules */}
          <div className="col-span-1">
            <h3 className="text-white font-semibold mb-4">Rules</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Dots battle every night at 11:00 PM ET</li>
              <li>Larger dots consume smaller dots</li>
              <li>Last dot standing wins!</li>
              <li>Some dots have special powers</li>
            </ul>
          </div>
          
          {/* Social and contact */}
          <div className="col-span-1">
            <h3 className="text-white font-semibold mb-4">Connect With Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} The Dot Games. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;