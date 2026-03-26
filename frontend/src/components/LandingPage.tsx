import React, { useState } from 'react';
import { ShieldAlert, Search, Activity, Lock, Server, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface LandingPageProps {
  onStartScan: (domain: string, isDeep: boolean) => void;
}

export function LandingPage({ onStartScan }: LandingPageProps) {
  const [domain, setDomain] = useState('');
  const [isDeep, setIsDeep] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (domain && agreed) {
      onStartScan(domain, isDeep);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-2xl z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 mb-4">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight font-mono">VulnScout</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Advanced Security Assessment Suite. Authorized testing only.
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 font-mono">Target Domain</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input 
                    placeholder="e.g., example.com" 
                    className="pl-10 bg-zinc-900 border-zinc-800 h-12 text-lg font-mono focus-visible:ring-red-500/50"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsDeep(false)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    !isDeep 
                      ? 'border-red-500/50 bg-red-500/10' 
                      : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'
                  }`}
                >
                  <Activity className={`w-5 h-5 mb-2 ${!isDeep ? 'text-red-400' : 'text-zinc-400'}`} />
                  <div className="font-medium mb-1">Quick Scan</div>
                  <div className="text-xs text-zinc-500">Fast recon and common vulnerabilities.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeep(true)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isDeep 
                      ? 'border-red-500/50 bg-red-500/10' 
                      : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'
                  }`}
                >
                  <Server className={`w-5 h-5 mb-2 ${isDeep ? 'text-red-400' : 'text-zinc-400'}`} />
                  <div className="font-medium mb-1">Deep Audit</div>
                  <div className="text-xs text-zinc-500">Exhaustive scanning including bruteforce.</div>
                </button>
              </div>

              <div className="p-4 rounded-lg bg-orange-950/20 border border-orange-900/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-orange-200/80">
                    This tool performs active security testing that may trigger alerts or affect target stability.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500/50"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-zinc-300">
                      I confirm I have explicit authorization to test this domain.
                    </span>
                  </label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-red-600 hover:bg-red-700 text-white"
                disabled={!domain || !agreed}
              >
                <Lock className="w-4 h-4 mr-2" />
                Initiate Assessment
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
