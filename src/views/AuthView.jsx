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
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const navigate = useNavigate();

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setShowRegisterPrompt(false);
    setEmailVerificationSent(false);
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResending(true);
    setResendSuccess(false);
    setErrorMsg('');

    try {
      const client = await getSupabase();
      if (!client) throw new Error('Supabase client not available');
      
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/login`
        : undefined;

      const { error } = await client.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: redirectTo }
      });

      if (error) throw error;
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 6000);
    } catch (err) {
      console.error('Error resending email:', err);
      setErrorMsg(err.message || 'Failed to resend email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setShowRegisterPrompt(false);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please provide both your email address and password.');
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
        setErrorMsg('Supabase client is connecting. Please check your network or environment keys.');
        setLoading(false);
        return;
      }

      // Dynamic redirect URL pointing to current live origin (Vercel or localhost)
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/login`
        : undefined;

      if (mode === 'signup') {
        const res = await client.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: redirectTo,
          }
        });

        if (res.error) throw res.error;

        // Check if user already exists (identities empty or duplicate)
        if (res.data?.user && res.data.user.identities && res.data.user.identities.length === 0) {
          setErrorMsg('An account with this email already exists. Please log in.');
          setMode('login');
          setLoading(false);
          return;
        }

        // Check if email confirmation is required (session is null)
        if (res.data?.user && !res.data.session) {
          setEmailVerificationSent(true);
          setLoading(false);
          return;
        }

        // If session was immediately established (auto-confirm enabled)
        if (res.data?.user && res.data.session) {
          const fullName = res.data.user.user_metadata?.full_name || name.trim() || email.split('@')[0];
          await db.settings.put({ key: 'user_full_name', value: fullName });
          await db.settings.put({ key: 'user_email', value: email });

          setSuccessMsg('Account created successfully! Logging you in...');
          await syncWithSupabase();
          if (onAuthSuccess) onAuthSuccess(res.data.user);
          setTimeout(() => navigate('/dashboard'), 800);
        }
      } else {
        // Login mode
        const res = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (res.error) throw res.error;

        if (res.data?.user) {
          const fullName = res.data.user.user_metadata?.full_name || email.split('@')[0];
          await db.settings.put({ key: 'user_full_name', value: fullName });
          await db.settings.put({ key: 'user_email', value: email });

          setSuccessMsg('Successfully logged in!');
          await syncWithSupabase();
          if (onAuthSuccess) onAuthSuccess(res.data.user);
          setTimeout(() => navigate('/dashboard'), 600);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      const msg = err.message || '';
      
      // Check if email not found or invalid credentials
      if (/invalid login credentials|user not found|email not found|no user/i.test(msg)) {
        setErrorMsg('Invalid login credentials or account does not exist.');
        setShowRegisterPrompt(true);
      } else if (/email not confirmed/i.test(msg)) {
        setErrorMsg('Please verify your email address before logging in. Check your inbox and spam folder.');
        setEmailVerificationSent(true);
      } else if (/already registered|user already exists/i.test(msg)) {
        setErrorMsg('An account with this email already exists. Please log in.');
        setMode('login');
      } else {
        setErrorMsg(msg || 'Authentication failed. Please check your credentials.');
      }
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
              onClick={() => handleModeChange('login')}
              className={`flex-1 py-2.5 rounded-xl font-headline font-bold text-xs transition-all ${
                mode === 'login' ? 'bg-surface shadow-sm text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('signup')}
              className={`flex-1 py-2.5 rounded-xl font-headline font-bold text-xs transition-all ${
                mode === 'signup' ? 'bg-surface shadow-sm text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Email Verification Sent Screen */}
          {emailVerificationSent ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-sm">
                <Icon name="mark_email_unread" size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-headline font-bold text-on-surface">Check your inbox! 📩</h3>
                <p className="text-xs text-outline leading-relaxed max-w-xs mx-auto">
                  We've sent a verification link to <strong className="text-on-surface font-semibold">{email}</strong>. Please open the email and click the link to verify.
                </p>
              </div>

              {/* Small Explanatory Note */}
              <div className="bg-surface-container-high/70 rounded-2xl p-3.5 text-left border border-outline-variant/40 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-on-surface text-[12px]">
                  <Icon name="info" size={15} className="text-primary" />
                  <span>Quick Note:</span>
                </div>
                <p className="text-[11.5px] text-outline leading-relaxed">
                  Verification emails usually arrive within a minute. If you do not see it in your primary inbox, please be sure to check your <strong>Spam / Junk</strong> or Promotions folder.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailVerificationSent(false);
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-gradient"
                >
                  <Icon name="login" size={16} />
                  <span>Go to Log In</span>
                </button>

                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendVerification}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-outline hover:text-on-surface flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Icon name="refresh" size={15} className={resending ? 'animate-spin' : ''} />
                  <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
                </button>

                {resendSuccess && (
                  <p className="text-emerald-500 text-xs font-semibold animate-fade-in">
                    ✓ New verification link sent! Please check your inbox.
                  </p>
                )}
              </div>
            </div>
          ) : (
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setShowRegisterPrompt(false);
                  }}
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

              {/* Prompt to register if email not found */}
              {showRegisterPrompt && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <Icon name="person_search" size={17} />
                    <span>No account found with this email</span>
                  </div>
                  <p className="text-outline text-xs leading-relaxed">
                    Don’t have an account with <strong className="text-on-surface font-semibold">{email}</strong> yet?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg('');
                      setShowRegisterPrompt(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Icon name="person_add" size={16} />
                    <span>Create Account with this Email</span>
                  </button>
                </div>
              )}

              {errorMsg && !showRegisterPrompt && (
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
          )}

        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-outline">
          Encrypted with Row-Level Security (RLS) & TLS 1.3
        </p>

      </div>
    </div>
  );
}
