function MockObituaryToast({ show, displayName }) {
  if (!show) {
    return null;
  }

  return (
    <div className="card fixed bottom-6 left-1/2 z-[110] w-[90%] max-w-xl -translate-x-1/2 border-amber-pale bg-amber-warm p-4">
      <p className="font-medium text-ink">💤 Lost streak generated for {displayName}</p>
      <p className="mt-2 text-sm italic text-text-secondary">
        They were seen opening one harmless social app before bed. The app opened seventeen more.
        Rest in notifications.
      </p>
    </div>
  );
}

export default MockObituaryToast;
