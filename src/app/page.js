'use client';

import Timeline from '../components/timeline';
import './page.css';

export default function Home() {
  return (
    <main className="page-container">
      <div className="page-content">
        <div className="page-header">
          <h1>Interactive Timeline</h1>
          <p>Plan and organize your events with ease</p>
        </div>
        <div className="timeline-wrapper">
          <Timeline />
        </div>
      </div>
    </main>
  );
}