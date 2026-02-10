import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { account } from '@/lib/appwrite';
import { OAuthProvider } from 'appwrite';
import { cn } from '@/lib/utils';
import {
  Play, Mail, Lock, Eye, EyeOff, ArrowRight,
  Zap, Shield, Film, User,
  Check, AlertCircle, Loader2
} from 'lucide-react';

// ============ Password Strength ============

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Contains uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Contains a number', passed: /[0-9]/.test(password) },
    { label: 'Contains special character', passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const score = checks.filter(c => c.passed).length;

  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500', 'bg-green-500'];

  return {
    score: Math.max(0, score - 1),
    label: labels[Math.max(0, score - 1)] || 'Very weak',
    color: colors[Math.max(0, score - 1)] || 'bg-red-500',
    checks,
  };
}

// ============ Google Icon SVG ============

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ============ Auth Page ============

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingEmail, setExistingEmail] = useState<string | null>(null);

  const { signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();

  // Check if user is already logged in — show them, don't silently redirect
  useEffect(() => {
    account.get()
      .then((user) => setExistingEmail(user.email))
      .catch(() => setExistingEmail(null));
  }, []);

  // ---- Sanitize input ----
  const sanitizeInput = (input: string) => {
    return input.replace(/<[^>]*>/g, '').trim();
  };

  // ---- Email + Password Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanName = sanitizeInput(displayName);

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Signup validations
    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      const strength = getPasswordStrength(password);
      if (strength.score < 2) {
        setError('Password is too weak. Include uppercase, lowercase, numbers, and symbols.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (cleanName && cleanName.length < 2) {
        setError('Display name must be at least 2 characters');
        setLoading(false);
        return;
      }
    }

    try {
      const result = mode === 'signin'
        ? await signIn(cleanEmail, password)
        : await signUp(cleanEmail, password, cleanName || undefined);

      if (result.error) {
        // Map Appwrite error messages to user-friendly ones
        const msg = result.error;
        if (msg.includes('Invalid credentials') || msg.includes('Invalid email')) {
          setError('Invalid email or password. Please try again.');
        } else if (msg.includes('already exists') || msg.includes('already been registered')) {
          setError('An account with this email already exists. Try signing in instead.');
        } else if (msg.includes('Rate limit')) {
          setError('Too many attempts. Please wait a moment and try again.');
        } else if (msg.includes('password')) {
          setError('Password must be at least 8 characters long.');
        } else {
          setError(msg);
        }
      } else {
        if (mode === 'signup') {
          setSuccess('Account created successfully! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Google OAuth ----
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError('');
    try {
      account.createOAuth2Session({
        provider: OAuthProvider.Google,
        success: `${window.location.origin}/dashboard`,
        failure: `${window.location.origin}/auth`,
        scopes: ['openid', 'email', 'profile'],
      });
    } catch (err: any) {
      setError('Failed to initialize Google sign-in. Please try again.');
      setGoogleLoading(false);
    }
  };

  const features = [
    { icon: <Zap className="w-5 h-5" />, text: 'Lightning-fast streaming' },
    { icon: <Shield className="w-5 h-5" />, text: 'Encrypted & secure' },
    { icon: <Film className="w-5 h-5" />, text: 'All formats supported' },
  ];

  const passwordStrength = mode === 'signup' ? getPasswordStrength(password) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-teal-500/20 via-[#0a0a0f] to-cyan-500/20 p-12 flex-col justify-between">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-[80px]" />
        </div>

        {/* Logo */}
        <Link to="/" className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
            <Play className="w-6 h-6 text-black fill-current" />
          </div>
          <span className="text-2xl font-bold">OmniStream</span>
        </Link>

        {/* Hero Content */}
        <div className="relative">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Stream anything,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              anywhere.
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-md">
            The fastest way to stream and download your cloud files in stunning HD quality.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-300">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                  {feature.icon}
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} OmniStream. All rights reserved.
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
            <Shield className="w-3 h-3" />
            <span>256-bit SSL encryption • Data protected</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <Play className="w-5 h-5 text-black fill-current" />
            </div>
            <span className="text-xl font-bold">OmniStream</span>
          </Link>

          {/* Already logged in banner */}
          {existingEmail && (
            <div className="mb-8 p-5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <p className="text-sm text-gray-400 mb-1">You're already signed in as</p>
              <p className="font-semibold text-white mb-4">{existingEmail}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={async () => {
                    await signOut();
                    setExistingEmail(null);
                  }}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-medium text-sm hover:bg-white/10 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-gray-400">
              {mode === 'signin'
                ? 'Sign in to continue to OmniStream'
                : 'Start streaming in seconds — it\'s free'}
            </p>
          </div>

          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 mb-6 bg-white/[0.03] border border-white/10 rounded-xl font-medium hover:bg-white/[0.07] hover:border-white/20 transition-all disabled:opacity-50 group"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleIcon className="w-5 h-5" />
            )}
            <span className="text-sm">
              {googleLoading ? 'Redirecting...' : `Continue with Google`}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 animate-in slide-in-from-top-2">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {/* Display Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    maxLength={50}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator (signup only) */}
              {mode === 'signup' && password.length > 0 && passwordStrength && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-all duration-300",
                          i <= passwordStrength.score ? passwordStrength.color : "bg-white/10"
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn("text-xs", passwordStrength.score >= 2 ? "text-teal-400" : "text-gray-500")}>
                    {passwordStrength.label}
                  </p>
                  <div className="space-y-1">
                    {passwordStrength.checks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors",
                          check.passed ? "bg-teal-500/20 text-teal-400" : "bg-white/5 text-gray-600"
                        )}>
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className={check.passed ? "text-gray-400" : "text-gray-600"}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className={cn(
                      "w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border placeholder-gray-600 focus:ring-2 transition-all outline-none",
                      confirmPassword && confirmPassword !== password
                        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                        : confirmPassword && confirmPassword === password
                          ? "border-green-500/50 focus:border-green-500 focus:ring-green-500/20"
                          : "border-white/10 focus:border-teal-500 focus:ring-teal-500/20"
                    )}
                  />
                  {confirmPassword && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {confirmPassword === password ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1.5 text-xs text-red-400">Passwords don't match</p>
                )}
              </div>
            )}

            {/* Forgot Password (signin only) */}
            {mode === 'signin' && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading || (mode === 'signup' && password !== confirmPassword)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Terms (signup only) */}
          {mode === 'signup' && (
            <p className="mt-4 text-center text-xs text-gray-500 leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-teal-400 hover:text-teal-300">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-teal-400 hover:text-teal-300">Privacy Policy</Link>
            </p>
          )}

          {/* Toggle Mode */}
          <p className="mt-6 text-center text-gray-400">
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setSuccess('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          {/* Security badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-600">
            <Shield className="w-3.5 h-3.5" />
            <span>Protected by SSL encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
