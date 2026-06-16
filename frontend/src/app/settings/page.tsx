'use client';
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';

export default function SettingsPage() {
  const [barName, setBarName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (apiService.getRole() !== 'admin') {
      window.location.href = '/';
      return;
    }
    
    apiService.getSettings()
      .then(data => {
        if (data.bar_name) setBarName(data.bar_name);
      })
      .catch(err => {
        console.error('Failed to load settings', err);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await apiService.updateSetting('bar_name', barName);
      setSuccess('Settings saved successfully! Refresh to see the new bar name in the sidebar.');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8">
      <div className="card p-8 bg-white shadow-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-primary flex items-center gap-2">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            System Settings
          </h1>
          <p className="text-primary/70 text-sm mt-1">Configure your bar's global properties.</p>
        </div>
        
        {error && <div className="p-3 mb-4 bg-danger/10 text-danger rounded-lg text-sm font-medium">{error}</div>}
        {success && <div className="p-3 mb-4 bg-secondary/10 text-secondary-dark rounded-lg text-sm font-medium">{success}</div>}
        
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-primary/80 mb-1">Bar Name</label>
            <input 
              type="text" 
              className="input-field w-full" 
              value={barName} 
              onChange={(e) => setBarName(e.target.value)} 
              placeholder="e.g. The Drunken Clam"
              required 
            />
            <p className="text-xs text-primary/50 mt-1">This will be displayed in the sidebar.</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-4 py-3">
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}