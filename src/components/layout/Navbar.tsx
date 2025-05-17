import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, CircleDot } from 'lucide-react';
import { useGame } from '../../context/GameContext';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { timeUntilNextSimulation } = useGame();
  
  // Handle scroll effect for transparent to solid background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu when location changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);
  
  const navLinks = [
    { path: '/', label: 'Battle Arena' },
    { path: '/join', label: 'Join Battle' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/about', label: 'About' }
  ];
  
  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      isScrolled || isMenuOpen ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors">
            <CircleDot className="h-6 w-6 mr-2" />
            <span className="font-bold text-xl tracking-tight">THE DOT GAMES</span>
          </Link>
          
          {/* Countdown timer (desktop) */}
          <div className="hidden md:block">
            {timeUntilNextSimulation && (
              <div className="text-center px-4">
                <div className="text-xs uppercase tracking-wider text-gray-400">Next Battle In</div>
                <div className="font-mono text-lg font-bold text-pink-500">{timeUntilNextSimulation}</div>
              </div>
            )}
          </div>
          
          {/* Desktop menu */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-md transition-colors ${
                  location.pathname === link.path
                    ? 'text-cyan-400 font-medium'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    location.pathname === link.path
                      ? 'text-cyan-400 font-medium bg-gray-800'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Countdown timer (mobile) */}
            {timeUntilNextSimulation && (
              <div className="mt-4 text-center px-4 py-2 bg-gray-800 rounded-md">
                <div className="text-xs uppercase tracking-wider text-gray-400">Next Battle In</div>
                <div className="font-mono text-lg font-bold text-pink-500">{timeUntilNextSimulation}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;