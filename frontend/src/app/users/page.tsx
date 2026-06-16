'use client';
import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api-service';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  useEffect(() => {
    // Basic Client-side guard (Backend enforces via API anyway)
    if (apiService.getRole() !== 'admin') {
      window.location.href = '/';
      return;
    }
    setUsername('');
    setPassword('');
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await apiService.updateUser(editingId, { 
          password: password ? password : undefined, 
          role 
        });
        setSuccess(`User updated successfully!`);
        setEditingId(null);
      } else {
        await apiService.createUser({ username, password, role });
        setSuccess(`User ${username} created successfully!`);
      }
      setUsername('');
      setPassword('');
      setRole('staff');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setUsername('');
    setPassword('');
    setRole('staff');
    setError('');
    setSuccess('');
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 flex flex-col md:flex-row gap-8">
      <div className="flex-1 card p-8 bg-white shadow-xl h-fit">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-primary flex items-center gap-2">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {editingId ? 'Edit User' : 'Create User'}
          </h1>
          <p className="text-primary/70 text-sm mt-1">Manage staff accounts and permissions.</p>
        </div>
        
        {error && <div className="p-3 mb-4 bg-danger/10 text-danger rounded-lg text-sm font-medium">{error}</div>}
        {success && <div className="p-3 mb-4 bg-secondary/10 text-secondary-dark rounded-lg text-sm font-medium">{success}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">
          <div>
            <label className="block text-sm font-semibold text-primary/80 mb-1">Username</label>
            <input 
              type="text" 
              className={`input-field w-full ${editingId ? 'opacity-70 cursor-not-allowed' : ''}`}
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              minLength={3}
              disabled={!!editingId}
              autoComplete="new-username"
            />
            {editingId && <p className="text-xs text-primary/50 mt-1">Username cannot be changed.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary/80 mb-1">
              {editingId ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input 
              type="password" 
              className="input-field w-full" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required={!editingId} 
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary/80 mb-1">Role</label>
            <select 
              className="input-field w-full bg-white" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="staff">Staff (Standard access)</option>
              <option value="admin">Admin (Full access)</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading ? 'Saving...' : (editingId ? 'Update User' : 'Create User')}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn-secondary py-3 px-6">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex-1 card p-8 bg-white shadow-xl h-fit">
        <h2 className="text-xl font-bold text-primary mb-4">Existing Users</h2>
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 border border-primary/10 rounded-lg">
              <div>
                <div className="font-bold text-primary">{user.username}</div>
                <div className="text-xs text-primary/60 uppercase tracking-wider font-semibold">{user.role}</div>
              </div>
              <button onClick={() => startEdit(user)} className="text-sm font-medium text-accent-dark hover:text-primary transition-colors">
                Edit
              </button>
            </div>
          ))}
          {users.length === 0 && <p className="text-primary/50 text-sm">No users found.</p>}
        </div>
      </div>
    </div>
  );
}