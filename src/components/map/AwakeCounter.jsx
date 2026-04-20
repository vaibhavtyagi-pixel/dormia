import { useEffect, useState } from 'react';

function AwakeCounter({ count, className = '' }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timeout = window.setTimeout(() => setAnimate(false), 280);
    return () => window.clearTimeout(timeout);
  }, [count]);

  return (
    <div className={`card card-hover px-5 py-4 ${className}`}>
      <p className={`font-mono text-5xl font-medium text-indigo transition ${animate ? 'scale-110' : 'scale-100'}`}>{count}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-indigo-light">still awake</p>
    </div>
  );
}

export default AwakeCounter;
