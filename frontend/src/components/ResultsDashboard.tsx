import React, { useState } from 'react';
import type { ScanResult, Finding } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { 
  ShieldAlert, ShieldCheck, Shield, AlertTriangle, 
  Info, Search, Download, Server, Globe, FileCode2,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { mockScanResult } from './mockData';

interface ResultsDashboardProps {
  result: ScanResult | null;
  onNewScan: () => void;
  targetDomain?: string;
}

const severityColors = {
  Critical: '#ef4444', // red-500
  High: '#f97316',    // orange-500
  Medium: '#eab308',  // yellow-500
  Low: '#3b82f6',     // blue-500
  Info: '#71717a',    // zinc-500
};

export function ResultsDashboard({ result, onNewScan, targetDomain }: ResultsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  
  // Use mock data if no result provided (fallback mode)
  const scanResult = result || getDynamicMockResult(targetDomain || 'example.com');
  const findings = scanResult.findings || [];
  const reconData = scanResult.reconData || { subdomains: [], openPorts: [], technologies: [] };

  const severityCounts = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(severityColors).map(([name, color]) => ({
    name,
    count: severityCounts[name] || 0,
    color
  })).filter(d => d.count > 0);

  const filteredFindings = findings.filter(f => 
    (f.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.affectedUrl || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold font-mono flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              Assessment Report
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400 font-mono">
              <span>Target: <strong className="text-zinc-200">{scanResult.targetDomain}</strong></span>
              <span>•</span>
              <span>Completed: {scanResult.endTime ? new Date(scanResult.endTime).toLocaleString() : 'In progress'}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="font-mono text-xs">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={onNewScan} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-mono text-xs">
              New Scan
            </Button>
          </div>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Severity Summary */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-mono">Vulnerability Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-8">
              <div className="h-48 w-full max-w-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} width={70} />
                    <RechartsTooltip 
                      cursor={{fill: '#27272a'}}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {Object.entries(severityCounts).map(([severity, count]) => (
                  <div key={severity} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{severity}</div>
                    <div className="text-2xl font-bold font-mono" style={{ color: severityColors[severity as keyof typeof severityColors] }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recon Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-mono">Reconnaissance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                  <Globe className="w-4 h-4" /> Subdomains ({reconData.subdomains.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {reconData.subdomains.map(sub => (
                    <Badge key={sub} severity="default" className="font-mono font-normal">{sub}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                  <Server className="w-4 h-4" /> Open Ports
                </div>
                <div className="flex flex-wrap gap-2">
                  {reconData.openPorts.map(port => (
                    <Badge key={port} severity="default" className="font-mono font-normal">{port}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                  <FileCode2 className="w-4 h-4" /> Technologies
                </div>
                <div className="flex flex-wrap gap-2">
                  {reconData.technologies.map(tech => (
                    <Badge key={tech} severity="default" className="font-mono font-normal">{tech}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Findings List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/50 pb-4">
            <CardTitle className="text-lg font-mono">Detailed Findings</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input 
                placeholder="Search findings..." 
                className="pl-9 h-8 text-xs bg-zinc-900/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-800/50">
              {filteredFindings.map((finding) => (
                <div key={finding.id} className="flex flex-col">
                  <button 
                    onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                    className="flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {expandedFinding === finding.id ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                      <Badge severity={finding.severity} className="w-20 justify-center uppercase tracking-wider text-[10px]">
                        {finding.severity}
                      </Badge>
                      <div>
                        <div className="font-medium text-zinc-200">{finding.title}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">{finding.affectedUrl}</div>
                      </div>
                    </div>
                    <Badge severity="default" className="bg-zinc-900 text-zinc-400 font-mono font-normal text-[10px]">
                      {finding.category}
                    </Badge>
                  </button>
                  
                  {expandedFinding === finding.id && (
                    <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/50 space-y-4 text-sm pl-12">
                      <div>
                        <h4 className="text-zinc-400 font-medium mb-1 text-xs uppercase tracking-wider">Description</h4>
                        <p className="text-zinc-300">{finding.description}</p>
                      </div>
                      {finding.evidence && (
                        <div>
                          <h4 className="text-zinc-400 font-medium mb-1 text-xs uppercase tracking-wider">Evidence</h4>
                          <pre className="bg-zinc-950 p-3 rounded-md border border-zinc-800 font-mono text-xs text-red-400 overflow-x-auto">
                            {finding.evidence}
                          </pre>
                        </div>
                      )}
                      <div>
                        <h4 className="text-zinc-400 font-medium mb-1 text-xs uppercase tracking-wider">Remediation</h4>
                        <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-md text-blue-200/80">
                          {finding.remediation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredFindings.length === 0 && (
                <div className="p-8 text-center text-zinc-500 font-mono text-sm">
                  No findings match your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
