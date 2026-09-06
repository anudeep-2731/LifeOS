import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { getSupabase, syncWithSupabase } from '../lib/supabase';
import { db } from '../db/database';

export default function AuthView({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please provide your email address and password.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    setLoading(true);

    try {
      const client = await getSupabase();
      if (!client) {
        setErrorMsg('Supabase client is connecting. Please check your environment keys.');
        setLoading(false);
        return;
      }

      let res;
      if (mode === 'signup') {
        res = await client.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: name.trim() }
          }
        });
      } else {
        res = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
      }

      if (res.error) throw res.error;

      if (res.data?.user) {
        // Save user details locally for offline display
        const fullName = res.data.user.user_metadata?.full_name || name || email.split('@')[0];
        await db.settings.put({ key: 'user_full_name', value: fullName });
        await db.settings.put({ key: 'user_email', value: email });

        setSuccessMsg(mode === 'login' ? 'Successfully logged in!' : 'Account created successfully!');
        
        // Trigger cloud data sync
        await syncWithSupabase();

        if (onAuthSuccess) onAuthSuccess(res.data.user);
        setTimeout(() => navigate('/dashboard'), 800);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl primary-gradient text-white flex items-center justify-center mx-auto shadow-gradient">
            <Icon name="spa" size={32} filled />
          </div>
          <h1 className="text-3xl font-headline font-black text-on-surface tracking-tight">
            LifeOS Companion
          </h1>
          <p className="text-xs text-outline font-medium">
            Your personal strategy, health & wealth operating system
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-card space-y-6">
          
          {/* Mode Switcher Tabs */}
          <div className="flex bg-surface-container-high rounded-2xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl font-headline font-bold text-xs transition-all ${
                mode === 'login' ? 'bg-surface shadow-sm text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-xl font-headline font-bold text-xs transition-all ${
                mode === 'signup' ? 'bg-surface shadow-sm text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="input-pill w-full text-sm font-semibold"
                  placeholder="e.g. Anudeep Basva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={mode === 'signup'}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5 ml-1">
                Email Address
              </label>
              <input
                type="email"
                className="input-pill w-full text-sm font-semibold"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                className="input-pill w-full text-sm font-semibold"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <div className="bg-error/10 border border-error/20 rounded-2xl p-3 text-xs text-error font-medium flex items-center gap-2">
                <Icon name="error" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-xs text-emerald-400 font-medium flex items-center gap-2">
                <Icon name="check_circle" size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-gradient disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <Icon name={mode === 'login' ? 'login' : 'person_add'} size={18} />
                  <span>{mode === 'login' ? 'Log In to LifeOS' : 'Create LifeOS Account'}</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-outline">
          Encrypted with Row-Level Security (RLS) & TLS 1.3
        </p>

      </div>
    </div>
  );
}
