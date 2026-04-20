import { useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

function SignInPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    navigate('/', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-4 text-center text-ink">
      <div className="card w-full max-w-xl p-10">
        <h1 className="font-sora text-5xl font-extrabold text-indigo">DORMIA</h1>
        <p className="mt-2 text-lg font-light italic text-text-secondary">Sleep is now a sport.</p>
        <button
          type="button"
          onClick={handleSignIn}
          className="mt-8 rounded-full bg-indigo px-8 py-3.5 font-sora text-base font-semibold text-white"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}

export default SignInPage;
