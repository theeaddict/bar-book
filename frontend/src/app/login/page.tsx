'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api-service';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [barName, setBarName] = useState('Welcome Back');
  const router = useRouter();

  useEffect(() => {
    apiService.getPublicBarName().then((name) => {
      if (name) {
        setBarName(`Welcome to ${name}`);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiService.login({ username, password });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-full min-h-[80vh]">
      <div className="card p-14 w-full max-w-3xl bg-white shadow-2xl flex flex-col gap-10 rounded-3xl">
        <div className="text-center">
          <h1 className="text-4xl font-black text-primary mb-3">{barName}</h1>
          <p className="text-lg text-primary/70">Login to manage your bar inventory.</p>
        </div>
        
        {error && <div className="p-5 bg-danger/10 text-danger rounded-xl text-lg">{error}</div>}
        
        <form onSubmit={handleLogin} className="flex flex-col gap-7">
          <div>
            <label className="block text-lg font-semibold text-primary/80 mb-2">Username</label>
            <input 
              type="text" 
              className="input-field w-full text-xl py-4" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-primary/80 mb-2">Password</label>
            <input 
              type="password" 
              className="input-field w-full text-xl py-4" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-6 py-5 text-xl font-bold">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}