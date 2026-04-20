import { useEffect } from 'react';

function LastAwakeNotification({ show, continent, onDismiss }) {
  useEffect(() => {
    if (!show) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      onDismiss();
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [show, onDismiss]);

  if (!show) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-base/90 p-4 text-center"
    >
      <div className="animate-indigo-border card px-8 py-12">
        <h2 className="font-sora text-3xl font-bold text-ink md:text-4xl">
          You are the last one awake in {continent}.
        </h2>
        <p className="mt-4 text-xl italic text-indigo">Embarrassing.</p>
      </div>
    </button>
  );
}

export default LastAwakeNotification;
