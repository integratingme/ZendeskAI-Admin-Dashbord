'use client';

import { useState, useEffect, useRef } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { FiCheck, FiBookOpen, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi';
import { IoIosRefresh } from 'react-icons/io';
import { useToastContext } from '@/contexts/ToastContext';
import { MdOutlineContentCopy, MdOutlineDone } from 'react-icons/md';
import { useRouter } from 'next/navigation';

function isValidEmail(email: string): boolean {
  // Basic RFC 5322 compliant pattern simplified for UX
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(email.trim());
}


export default function SignupPage() {
  const emailScrollRef = useRef<HTMLDivElement | null>(null);
  const keyScrollRef = useRef<HTMLDivElement | null>(null);

  // Drag-to-scroll handlers for hidden horizontal scroll
  const makeDragScroll = (ref: React.MutableRefObject<HTMLDivElement | null>) => {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    return {
      onMouseDown: (e: React.MouseEvent) => {
        const el = ref.current;
        if (!el) return;
        isDown = true;
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        el.style.cursor = 'grabbing';
        e.preventDefault();
      },
      onMouseLeave: () => {
        const el = ref.current;
        if (!el) return;
        isDown = false;
        el.style.cursor = 'grab';
      },
      onMouseUp: () => {
        const el = ref.current;
        if (!el) return;
        isDown = false;
        el.style.cursor = 'grab';
      },
      onMouseMove: (e: React.MouseEvent) => {
        const el = ref.current;
        if (!el || !isDown) return;
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1; // scroll-fast factor
        el.scrollLeft = scrollLeft - walk;
      },
      onTouchStart: (e: React.TouchEvent) => {
        const el = ref.current;
        if (!el) return;
        isDown = true;
        startX = e.touches[0].pageX - el.getBoundingClientRect().left;
        scrollLeft = el.scrollLeft;
      },
      onTouchEnd: () => {
        const el = ref.current;
        if (!el) return;
        isDown = false;
      },
      onTouchMove: (e: React.TouchEvent) => {
        const el = ref.current;
        if (!el || !isDown) return;
        const x = e.touches[0].pageX - el.getBoundingClientRect().left;
        const walk = (x - startX) * 1;
        el.scrollLeft = scrollLeft - walk;
      },
    };
  };

  const emailDrag = makeDragScroll(emailScrollRef);
  const keyDrag = makeDragScroll(keyScrollRef);

  // Manage in-flight CAPTCHA requests to avoid flicker/race conditions
  const captchaAbortRef = useRef<AbortController | null>(null);

  // Helper to fetch a new math CAPTCHA challenge
  const fetchChallenge = async () => {
    // Cancel any previous request
    try {
      if (captchaAbortRef.current) {
        captchaAbortRef.current.abort();
      }
      const controller = new AbortController();
      captchaAbortRef.current = controller;

      setCaptchaLoading(true);
      setCaptchaError('');
      // Do not clear the existing challenge text/token to avoid UI flicker
      setCaptchaAnswer('');
      const r = await fetch('/api/public/captcha/math', { signal: controller.signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || 'Failed to load captcha');
      if (d.mode !== 'math') throw new Error('Captcha mode not supported by this UI');
      setChallengeText(d.challenge);
      setCaptchaToken(d.token);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return; // ignore aborted fetch
      const errorMessage = e instanceof Error ? e.message : 'Failed to load captcha';
      setCaptchaError(errorMessage);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const router = useRouter();

  // Set page title
  useEffect(() => {
    document.title = 'Sign Up - IndeskAI';
  }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [challengeText, setChallengeText] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ subscription_key: string; start_date: string; end_date: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { error: toastError } = useToastContext();

  const canProceedEmail = email && isValidEmail(email);
  const canSubmit = Boolean(captchaToken) && captchaAnswer.trim().length > 0;
  const handleEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setStep(2);
    // auto-fetch captcha when entering step 2
    await fetchChallenge();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken || !captchaAnswer.trim()) {
      setSubmitError('Please complete the captcha');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const resp = await fetch('/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), captcha_token: captchaToken, captcha_answer: captchaAnswer.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.detail || 'Signup failed');
      }
      setResult({ subscription_key: data.subscription_key, start_date: data.start_date, end_date: data.end_date });
      setStep(3);
    } catch (err: unknown) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message || '') : '';
      toastError('Signup failed', message);
      setSubmitError('');
      // Refresh CAPTCHA challenge on failure
      await fetchChallenge();
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLoginPrefilled = () => {
    // Send them to home and let them choose user login; they will copy key.
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-lg p-8">
        {/* Top-right theme toggle only; no global top-left back button on this page */}
        <div className="fixed top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="text-center mb-8 px-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent)' }}
          >
            <FiBookOpen className="text-2xl text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Create your account
          </h1>
          <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Please configure LLM after login.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1,2,3].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= i ? 'active-step' : 'inactive-step'}`}
                style={{
                  background: step >= i ? 'var(--accent)' : 'var(--card-bg)',
                  color: step >= i ? 'white' : 'var(--foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                {step > i || (step === 3 && result) ? <FiCheck /> : i}
              </div>
              {i < 3 && (
                <div className="w-10 h-0.5" style={{ background: 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="p-6 rounded-xl border-2" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', overflow: 'hidden' }}>
          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleEmailNext} className="space-y-4">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border transition-colors"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {emailError && <p className="text-sm" style={{ color: '#ef4444' }}>{emailError}</p>}

              <button
                type="submit"
                disabled={!canProceedEmail}
                className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
              >
                Next
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSignup} className="space-y-4">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Human verification
              </label>
              <div className="relative">
                <div className="p-4 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="mr-2">Please solve the challenge to continue.</p>
                    <button
                      type="button"
                      aria-label="Refresh challenge"
                      title="Refresh challenge"
                      disabled={captchaLoading}
                      onClick={fetchChallenge}
                      className="p-2 rounded"
                      style={{ background: 'transparent', color: 'var(--foreground)' }}
                    >
                      {captchaLoading ? <FiRefreshCw className="animate-spin" /> : <IoIosRefresh />}
                    </button>
                    {captchaError && <span className="text-red-600">{captchaError}</span>}
                  </div>
                  {/* Always render container to avoid mount/unmount flicker */}
                  <div className="mb-2">
                    {challengeText && (
                    <div className="mb-2">
                      <div className="mb-1" style={{ color: 'var(--foreground)' }}>{challengeText}</div>
                      <input
                        type="text"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        placeholder="Your answer"
                        className="w-full px-3 py-2 rounded border"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                        disabled={captchaLoading}
                      />
                    </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                We use CAPTCHA to prevent automated signups. You can set your real Zendesk subdomain later in Integrations.
              </p>

              {!isSubmitting ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-3 px-4 rounded-lg font-medium border"
                    style={{ background: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                  >
                    Sign up
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                  >
                    <FiRefreshCw className="animate-spin" />
                    <span>Creating your account...</span>
                  </button>
                </div>
              )}
              {submitError && <p className="text-sm" style={{ color: '#ef4444' }}>{submitError}</p>}
            </form>
          )}

          {step === 3 && result && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Your login details</h2>
              <div className="p-4 rounded-lg border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <div className="mb-3">
                  <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Email</div>
                  <div className="flex items-center gap-2">
                    <div ref={emailScrollRef} {...emailDrag} className="px-2 py-1 rounded flex-1 min-w-0" style={{ background: 'var(--background)', color: 'var(--foreground)', whiteSpace: 'nowrap', overflowX: 'hidden', textOverflow: 'clip', cursor: 'grab', userSelect: 'none' }}>
                      {email}
                    </div>
                    <button
                      type="button"
                      onClick={async () => { await navigator.clipboard.writeText(email); setCopiedEmail(true); setTimeout(()=>setCopiedEmail(false), 1500); }}
                      className="p-2 rounded border"
                      style={{ background: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                      aria-label="Copy email"
                    >
                      {copiedEmail ? <MdOutlineDone /> : <MdOutlineContentCopy />}
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Subscription Key</div>
                  <div className="flex items-center gap-2">
                    <div ref={keyScrollRef} {...keyDrag} className="px-2 py-1 rounded flex-1 min-w-0" style={{ background: 'var(--background)', color: 'var(--foreground)', whiteSpace: 'nowrap', overflowX: 'hidden', textOverflow: 'clip', cursor: 'grab', userSelect: 'none' }}>
                      {showKey ? result.subscription_key : result.subscription_key.replace(/./g, '•')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKey((s)=>!s)}
                      className="p-2 rounded border"
                      style={{ background: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                      aria-label={showKey ? 'Hide subscription key' : 'Show subscription key'}
                    >
                      {showKey ? <FiEyeOff /> : <FiEye />}
                    </button>
                    <button
                      type="button"
                      onClick={async () => { await navigator.clipboard.writeText(result.subscription_key); setCopiedKey(true); setTimeout(()=>setCopiedKey(false), 1500); }}
                      className="p-2 rounded border"
                      style={{ background: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                      aria-label="Copy subscription key"
                    >
                      {copiedKey ? <MdOutlineDone /> : <MdOutlineContentCopy />}
                    </button>
                  </div>
                </div>
                <div className="text-xs" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                  Valid from {new Date(result.start_date).toLocaleDateString()} to {new Date(result.end_date).toLocaleDateString()}. Save your key you will not see it again. 
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToLoginPrefilled}
                  className="flex-1 py-3 px-4 rounded-lg font-medium"
                  style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                >
                  Continue to login
                </button>
              </div>

              <p className="text-xs text-center" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                Tip: After logging in, visit Providers to configure your own LLM keys.
              </p>
            </div>
          )}
        </div>

        <style jsx>{`
          .active-step { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .inactive-step { opacity: 0.8; }
        `}</style>
      </div>
    </div>
  );
}
