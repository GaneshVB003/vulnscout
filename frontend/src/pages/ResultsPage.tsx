import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, Search, Filter, Download, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, Globe, Lock, Server, Bug, Key, Terminal
} from 'lucide-react';
import { getScanStatus, exportScan } from '../hooks/useApi';
import type { ScanStatus, Finding } from '../types';

export default function ResultsPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  
  const [scanData, setScanData] = useState<ScanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!scanId) return;

    const fetchResults = async () => {
      try {
        const data = await getScanStatus(scanId);
        setScanData(data);
      } catch (err) {
        setError('Failed to load scan results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [scanId]);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!scanId) return;
    try {
      const data = await exportScan(scanId, format);
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vulnscout-${scanId}.json`;
        a.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const toggleFinding = (id: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFindings(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-red-400 mb-2">Error</h3>
        <p className="text-slate-400 mb-4">{error || 'Failed to load results'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
        >
          Back to Home
        </button>
      </div>
    );
  }

  // Aggregate findings from all categories
  const allFindings: Finding[] = [];
  scanData.findings?.forEach((category: Record<string, unknown>) => {
    const findings = category.findings as Finding[];
    if (findings) {
      allFindings.push(...findings);
    }
  });

  // Filter findings
  const filteredFindings = allFindings.filter(f => {
    const matchesFilter = filter === 'all' || f.severity?.toLowerCase() === filter;
    const matchesSearch = !searchTerm || 
      f.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.url?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate summary
  const summary = {
    critical: allFindings.filter(f => f.severity === 'Critical').length,
    high: allFindings.filter(f => f.severity === 'High').length,
    medium: allFindings.filter(f => f.severity === 'Medium').length,
    low: allFindings.filter(f => f.severity === 'Low').length,
    info: allFindings.filter(f => f.severity === 'Info').length,
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <Terminal className="w-4 h-4" />;
      case 'High': return <Bug className="w-4 h-4" />;
      case 'Medium': return <AlertTriangle className="w-4 h-4" />;
      case 'Low': return <Server className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'severity-critical';
      case 'High': return 'severity-high';
      case 'Medium': return 'severity-medium';
      case 'Low': return 'severity-low';
      default: return 'severity-info';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recon': return <Globe className="w-4 h-4" />;
      case 'vulnerabilities': return <Bug className="w-4 h-4" />;
      case 'api': return <Server className="w-4 h-4" />;
      case 'bruteforce': return <Key className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">{scanData.target}</h2>
          <p className="text-slate-400">
            Scan completed • {new Date(scanData.end_time || scanData.start_time).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Critical', count: summary.critical, color: 'bg-red-500' },
          { label: 'High', count: summary.high, color: 'bg-orange-500' },
          { label: 'Medium', count: summary.medium, color: 'bg-yellow-500' },
          { label: 'Low', count: summary.low, color: 'bg-blue-500' },
          { label: 'Info', count: summary.info, color: 'bg-gray-500' },
        ].map((item) => (
          <div key={item.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${item.color.replace('bg-', 'text-')}`}>
              {item.count}
            </div>
            <div className="text-sm text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search findings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg 
              text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${
                filter === f 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.length > 0 ? (
          filteredFindings.map((finding, idx) => {
            const findingId = `${finding.type}-${idx}`;
            const isExpanded = expandedFindings.has(findingId);
            
            return (
              <div 
                key={idx}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleFinding(findingId)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getSeverityColor(finding.severity)}`}>
                      {getSeverityIcon(finding.severity)}
                    </div>
                    <div>
                      <div className="font-medium text-white">{finding.type}</div>
                      <div className="text-sm text-slate-400">{finding.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700/50">
                    <div className="py-4 space-y-4">
                      {finding.evidence && (
                        <div>
                          <div className="text-sm font-medium text-slate-400 mb-1">Evidence</div>
                          <pre className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300 overflow-x-auto">
                            {finding.evidence}
                          </pre>
                        </div>
                      )}
                      {finding.payload && (
                        <div>
                          <div className="text-sm font-medium text-slate-400 mb-1">Payload</div>
                          <code className="bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-cyan-400 block">
                            {finding.payload}
                          </code>
                        </div>
                      )}
                      {finding.remediation && (
                        <div>
                          <div className="text-sm font-medium text-slate-400 mb-1">Remediation</div>
                          <p className="text-sm text-slate-300">{finding.remediation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No findings match your filters</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 text-center">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Start Another Scan
        </button>
      </div>
    </div>
  );
}