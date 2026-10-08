import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Shield, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useERP();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = login(username, password);
    if (!success) {
      setError('Invalid credentials. Please check your username and password.');
    }
  };

  const handleQuickLogin = (role: 'admin' | 'employee') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
      login('admin', 'admin123');
    } else {
      setUsername('karthik');
      setPassword('emp123');
      login('karthik', 'emp123');
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-100/90 font-sans text-slate-800 p-4 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-lg mx-auto tracking-wider">
            DF
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              DHAVANAM FINANCE
            </h1>
            <p className="text-xs text-emerald-700 font-mono font-semibold tracking-wider uppercase mt-0.5">
              PBMS Enterprise Financial ERP System
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Secure Employee Access</h2>
            <p className="text-xs text-slate-500 mt-1">Sign in with your credentials to access business modules</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username or Email Address
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin or karthik"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-medium text-slate-900 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-medium text-slate-900 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <span>Sign In to ERP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Preset Demo Logins */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center font-mono">
              Quick Prototype Credentials
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">Admin</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">admin / admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('employee')}
                className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-800">Employee</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">karthik / emp123</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-slate-400">
          Dhavanam Finance Enterprise PBMS ERP • Bangalore • Protected Access
        </p>
      </div>
    </div>
  );
};
