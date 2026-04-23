import { useEffect, useRef } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

function SignInPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canvasRef = useRef(null);
  const logoWrapRef = useRef(null);
  const blobOneRef = useRef(null);
  const blobTwoRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const logoWrap = logoWrapRef.current;
    const blobOne = blobOneRef.current;
    const blobTwo = blobTwoRef.current;
    if (!canvas || !logoWrap || !blobOne || !blobTwo) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let starCount = 140;
    let stars = [];
    let rafId = 0;
    let tickTime = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.55 + 0.05,
        s: Math.random() * 0.018 + 0.004,
        o: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.03,
      }));
    };

    const tick = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      tickTime += 0.016;
      for (const star of stars) {
        star.x = (star.x + star.vx + canvas.width) % canvas.width;
        star.y = (star.y + star.vy + canvas.height) % canvas.height;
        const alpha = star.a * (0.5 + 0.5 * Math.sin(tickTime * star.s * 60 + star.o));
        context.beginPath();
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(200,205,255,${alpha})`;
        context.fill();
      }
      rafId = requestAnimationFrame(tick);
    };

    const onMouseMove = (event) => {
      const dx = (event.clientX / window.innerWidth - 0.5) * 2;
      const dy = (event.clientY / window.innerHeight - 0.5) * 2;
      logoWrap.style.transform = `translate(${dx * 10}px, ${dy * 10}px)`;
      blobOne.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`;
      blobTwo.style.transform = `translate(${-dx * 16}px, ${-dy * 16}px)`;
    };

    resize();
    tick();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const handleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    navigate('/', { replace: true });
  };

  return (
    <main className="welcome-page min-h-screen overflow-hidden bg-[#090b14] text-center text-white">
      <canvas ref={canvasRef} className="welcome-canvas" />
      <div ref={blobOneRef} className="welcome-blob welcome-blob-one" />
      <div ref={blobTwoRef} className="welcome-blob welcome-blob-two" />

      <div className="welcome-stage">
        <div ref={logoWrapRef} className="welcome-logo-wrap">
          <div className="welcome-glow-ring" />
          <div className="welcome-orbit">
            <div className="welcome-orbit-star">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8Z" fill="rgba(220,218,255,0.9)" />
              </svg>
            </div>
          </div>
          <svg className="welcome-logo-moon" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="moon-gradient" cx="38%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#b0b3ff" />
                <stop offset="55%" stopColor="#7478f0" />
                <stop offset="100%" stopColor="#4a4eb8" />
              </radialGradient>
              <radialGradient id="moon-shadow" cx="72%" cy="28%" r="55%">
                <stop offset="0%" stopColor="#1a1c50" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#060820" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path
              d="M88 18 C58 18 34 42 34 72 C34 102 58 126 88 126 C104 126 118 119 127 108 C113 107 101 101 93 91 C84 81 79 68 79 54 C79 40 85 27 95 20 C93 18.5 90.5 18 88 18Z"
              fill="url(#moon-gradient)"
            />
            <path
              d="M88 18 C58 18 34 42 34 72 C34 102 58 126 88 126 C104 126 118 119 127 108 C113 107 101 101 93 91 C84 81 79 68 79 54 C79 40 85 27 95 20 C93 18.5 90.5 18 88 18Z"
              fill="url(#moon-shadow)"
            />
            <path d="M105 100 Q124 80 132 55" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="132" cy="55" r="2.5" fill="rgba(255,255,255,0.35)" />
            <path d="M124 30 L127 20 L130 30 L140 33 L130 36 L127 46 L124 36 L114 33Z" fill="white" />
            <path d="M144 62 L146 56 L148 62 L154 64 L148 66 L146 72 L144 66 L138 64Z" fill="rgba(255,255,255,0.9)" />
            <path d="M110 18 L111.5 13 L113 18 L118 19.5 L113 21 L111.5 26 L110 21 L105 19.5Z" fill="rgba(255,255,255,0.8)" />
          </svg>
        </div>

        <h1 className="welcome-wordmark">DORMIA</h1>
        <p className="welcome-sub">Gamified Sleep</p>

        <div className="welcome-signin-wrap">
          <button type="button" onClick={handleSignIn} disabled={!auth} className="welcome-signin-button">
            {auth ? 'Sign in with Google' : 'Firebase not configured'}
          </button>
          {!auth ? (
            <p className="mt-3 text-xs text-[#a0a8d7]">Set `VITE_FIREBASE_*` variables to enable sign in.</p>
          ) : null}
        </div>
      </div>

      <style>{`
        .welcome-canvas { position: fixed; inset: 0; z-index: 0; }
        .welcome-blob { position: fixed; border-radius: 9999px; filter: blur(130px); z-index: 0; pointer-events: none; }
        .welcome-blob-one { width: 500px; height: 500px; top: -160px; left: -120px; background: radial-gradient(circle, rgba(90,70,200,.2) 0%, transparent 70%); animation: welcomeBlobDrift 20s ease-in-out infinite alternate; }
        .welcome-blob-two { width: 400px; height: 400px; bottom: -120px; right: -80px; background: radial-gradient(circle, rgba(60,100,230,.15) 0%, transparent 70%); animation: welcomeBlobDrift 26s ease-in-out infinite alternate-reverse; }
        .welcome-stage { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .welcome-logo-wrap { position: relative; width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; opacity: 0; animation: welcomeLogoReveal 1.2s cubic-bezier(0.22,1,0.36,1) .3s forwards; }
        .welcome-glow-ring { position: absolute; inset: -40px; border-radius: 9999px; background: radial-gradient(circle, rgba(110,90,240,.28) 0%, transparent 65%); animation: welcomeRingPulse 4s ease-in-out infinite; }
        .welcome-logo-moon { width: 180px; height: 180px; filter: drop-shadow(0 0 28px rgba(120,110,250,.9)) drop-shadow(0 0 60px rgba(90,80,220,.4)); animation: welcomeMoonFloat 6s ease-in-out infinite; }
        .welcome-orbit { position: absolute; inset: 0; border-radius: 9999px; animation: welcomeOrbitSpin 12s linear infinite; }
        .welcome-orbit-star { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); }
        .welcome-orbit-star svg { animation: welcomeCounterSpin 12s linear infinite; }
        .welcome-wordmark { font-family: 'Space Grotesk', sans-serif; font-size: clamp(52px, 8vw, 84px); font-weight: 700; letter-spacing: .12em; color: #f0f1ff; margin-top: -8px; line-height: 1; opacity: 0; animation: welcomeFadeUp .9s cubic-bezier(0.22,1,0.36,1) 1s forwards; }
        .welcome-sub { white-space: nowrap; font-family: 'Inter', sans-serif; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: rgba(160,155,240,.7); margin-top: 8px; opacity: 0; animation: welcomeFadeUp .8s ease 1.3s forwards; }
        .welcome-signin-wrap { margin-top: 52px; opacity: 0; animation: welcomeFadeUp .9s ease 1.6s forwards; }
        .welcome-signin-button { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 16px 56px; border-radius: 100px; border: none; cursor: pointer; color: #fff; white-space: nowrap; position: relative; overflow: hidden; transition: transform .2s, box-shadow .2s; background: linear-gradient(135deg, #7b7ef5 0%, #5254cc 100%); box-shadow: 0 4px 32px rgba(100,90,240,.35); }
        .welcome-signin-button:hover { transform: translateY(-3px); box-shadow: 0 10px 50px rgba(100,90,240,.55); }
        .welcome-signin-button:disabled { opacity: .65; cursor: not-allowed; transform: none; box-shadow: 0 4px 32px rgba(100,90,240,.2); }
        @keyframes welcomeBlobDrift { from { transform: translate(0,0) scale(1); } to { transform: translate(24px,18px) scale(1.1); } }
        @keyframes welcomeLogoReveal { from { opacity: 0; transform: scale(.7); } to { opacity: 1; transform: scale(1); } }
        @keyframes welcomeRingPulse { 0%,100% { transform: scale(1); opacity:.7; } 50% { transform: scale(1.15); opacity:1; } }
        @keyframes welcomeMoonFloat { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-10px) rotate(1deg); } }
        @keyframes welcomeOrbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes welcomeCounterSpin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes welcomeFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}

export default SignInPage;
