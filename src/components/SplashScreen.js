// src/components/SplashScreen.js
'use client';

export default function SplashScreen({ onNewCalendar, onOpenCalendar }) {
  return (
    <div className="splash-screen">
      <h1>Calendar App</h1>
      <div className="splash-actions">
        <button onClick={onNewCalendar} className="splash-btn new-btn">
          New Calendar
        </button>
        <button onClick={onOpenCalendar} className="splash-btn open-btn">
          Open Existing Calendar
        </button>
      </div>
      <p className="splash-info">
        Your calendar data will be saved to a file on your device.
      </p>
    </div>
  );
}