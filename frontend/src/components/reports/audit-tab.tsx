'use client';
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';

interface Props {
  date: string;
}

interface AuditLog {
  id: string;
  username: string;
  action: string;
  table_name: string;
  created_at: string;
  payload: any;
}

export function AuditTab({ date }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiService.getAuditLogs(date)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load audit logs');
        setLoading(false);
      });
  }, [date]);

  if (loading) return <div className="text-center py-8 text-primary/60 font-medium animate-pulse">Loading audit trail...</div>;
  if (error) return <div className="text-center py-8 text-danger font-medium">{error}</div>;

  if (logs.length === 0) {
    return (
      <div className="card p-12 text-center flex flex-col items-center gap-4 bg-white/50 border-dashed">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary/40">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">No Activity</h3>
          <p className="text-sm text-primary/60 mt-1">No actions were recorded on this date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 bg-white overflow-hidden">
      <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Audit Trail
      </h2>
      
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="border border-primary/10 rounded-lg p-4 bg-cream/30 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary text-sm bg-primary/10 px-2 py-0.5 rounded text-accent-dark">{log.action}</span>
                <span className="text-primary/70 text-sm font-medium">on <span className="font-mono text-xs">{log.table_name}</span></span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-primary/60">
                <span>By: <strong className="text-primary">{log.username || 'System'}</strong></span>
                <span>•</span>
                <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <div className="text-xs font-mono bg-white p-2 rounded border border-primary/5 w-full sm:w-auto max-w-xs overflow-auto shadow-inner text-primary/50">
              {JSON.stringify(log.payload)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}