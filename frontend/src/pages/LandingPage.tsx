import { useState } from 'react';
import { Shield, AlertTriangle, ArrowRight, Zap, Layers, Globe, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startScan } from '../hooks/useApi';
import type { ScanRequest } from '../types';

export default function LandingPage() {
  const navigate = useNavigate();
  const [target, setTarget] = useState('');
  const [scanType, setScanType] = useState<'quick' | 'deep'>('quick');
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!target.trim()) {
      setError('Please enter a target domain');
      return;
    }

    if (!authorized) {
      setError('You must confirm you have authorization to test this domain');
      return;
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    if (!domainRegex.test(target.trim())) {
      setError('Please enter a valid domain (e.g., example.com)');
      return;
    }

    setLoading(true);

    try {
      const scanData: ScanRequest = {
        target: target.trim().toLowerCase(),
        scan_type: scanType,
        authorized: true,
      };

      const response = await startScan(scanData);
      navigate(`/scanning/${response.scan_id}`);
    } catch (err) {
      setError('Failed to start scan. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 mb-6">
          <Shield className="w-10 h-10 text-cyan-400" />
        </div>
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          VulnScout
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          One-click domain security assessment suite. Perform comprehensive security audits 
          including reconnaissance, vulnerability scanning, and penetration testing.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <strong className="font-semibold">Important Warning:</strong> VulnScout is intended 
            for authorized security testing only. You must have explicit written permission from 
            the target domain owner before scanning. Unauthorized scanning may be illegal and could 
            result in civil or criminal liability.
          </div>
        </div>
      </div>

      {/* Scan Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="space-y-6">
          {/* Target Input */}
          <div>
            <label htmlFor="target" className="block text-sm font-medium text-slate-300 mb-2">
              Target Domain
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg 
                  text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 
                  focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Scan Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scan Intensity
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setScanType('quick')}
                className={`p-4 rounded-lg border transition-all ${
                  scanType === 'quick'
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-600/50 bg-slate-900/30 text-slate-400 hover:border-slate-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Quick Scan</div>
                    <div className="text-xs opacity-70">~5 minutes</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setScanType('deep')}
                className={`p-4 rounded-lg border transition-all ${
                  scanType === 'deep'
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-600/50 bg-slate-900/30 text-slate-400 hover:border-slate-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Deep Scan</div>
                    <div className="text-xs opacity-70">~15-30 minutes</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Authorization Checkbox */}
          <div className="bg-slate-900/30 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 
                  focus:ring-cyan-500/50 focus:ring-offset-slate-900"
              />
              <div className="text-sm text-slate-300">
                <span className="font-medium">I confirm that I have explicit authorization</span>
                <span className="text-slate-500"> to test this domain. I understand that unauthorized scanning is illegal and I am solely responsible for my actions.</span>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r 
              from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg 
              font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Start Security Scan
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Features Preview */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Globe, label: 'Reconnaissance', desc: 'Subdomain & port scan' },
          { icon: Shield, label: 'Vulnerability Scan', desc: 'SQLi, XSS & more' },
          { icon: Layers, label: 'API Testing', desc: 'Auth & endpoints' },
          { icon: Lock, label: 'Brute Force', desc: 'Creds & directories' },
        ].map((feature, idx) => (
          <div key={idx} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-center">
            <feature.icon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div className="font-medium text-slate-200">{feature.label}</div>
            <div className="text-xs text-slate-500">{feature.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}