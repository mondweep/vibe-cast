import React from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Heart } from 'lucide-react';

const LINKEDIN_URL = 'https://www.linkedin.com/in/mondweepchakravorty/';
const PAYPAL_URL = 'https://www.paypal.com/paypalme/mondweep';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">lr</span>
              </div>
              <span className="text-xl font-bold">learn-ruflo</span>
            </div>
            <p className="text-gray-400 text-sm">
              Enabling learners to master Ruflo, the advanced Agentic AI
              orchestration layer
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/enrollment"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Enrollments
                </Link>
              </li>
              <li>
                <Link
                  to="/leaderboard"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  API Docs
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Support / contribution call-to-action */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Heart className="text-pink-400 flex-shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-semibold text-white">Found this useful?</p>
                <p className="text-gray-400 text-sm">
                  This learning platform is built and shared in the open. If it
                  helps you, please consider supporting the work — it keeps it
                  free and growing.
                </p>
              </div>
            </div>
            <a
              href={PAYPAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 whitespace-nowrap px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition"
            >
              <Heart size={16} /> Support this work
            </a>
          </div>
        </div>

        {/* Copyright + social */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm text-center md:text-left">
            Copyright &copy; {currentYear}{' '}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-primary-400 font-medium transition"
            >
              Mondweep Chakravorty
            </a>
            . All rights reserved. Built in public — please consider{' '}
            <a
              href={PAYPAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 font-medium transition"
            >
              supporting the work
            </a>
            .
          </p>
          <div className="flex space-x-4">
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn — Mondweep Chakravorty"
              className="text-gray-400 hover:text-white transition"
            >
              <Linkedin size={20} />
            </a>
            <a
              href={PAYPAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support via PayPal"
              className="text-gray-400 hover:text-pink-400 transition"
            >
              <Heart size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
