import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, Search, ArrowRight, Shield } from 'lucide-react';
import { listScans, deleteScan } from '../hooks/useApi';
import type { ScanStatus } from '../types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const data = await listScans();
      setScans(data);
    } catch (err) {
      console.error('Failed to load scans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scan?')) return;
    
    try {
      await deleteScan(scanId);
      setScans(scans.filter(s => s.scan_id !== scanId));
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
  };

  const filteredScans = scans.filter(scan => 
    scan.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20';
      case 'running': return 'text-cyan-400 bg-cyan-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Scan History</h2>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 
            hover:bg-cyan-500/30 rounded-lg transition-colors"
        >
          <Shield className="w-4 h-4" />
          New Scan
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by domain..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg 
            text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      {/* Scans List */}
      {filteredScans.length > 0 ? (
        <div className="space-y-3">
          {filteredScans.map((scan) => (
            <div
              key={scan.scan_id}
              onClick={() => navigate(`/results/${scan.scan_id}`)}
              className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 
                rounded-xl hover:bg-slate-700/30 hover:border-slate-600/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  <Clock className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="font-medium text-white">{scan.target}</div>
                  <div className="text-sm text-slate-500">
                    {scan.scan_type} • {new Date(scan.start_time).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(scan.status)}`}>
                  {scan.status}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 transition-all"
                      style={{ width: `${scan.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500">{scan.progress}%</span>
                </div>
                <button
                  onClick={(e) => handleDelete(scan.scan_id, e)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 
                    rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">No scans found</p>
          <button
            onClick={() => navigate('/')}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Start your first scan
          </button>
        </div>
      )}
    </div>
  );
}