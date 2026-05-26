export default function HotkeyGuide({ onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="question-modal-card" style={{ maxWidth: '600px' }}>
        <div className="panel-header">
          <div>
            <p className="section-label">Admin</p>
            <h2>Keyboard Shortcuts</h2>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
        </div>
        <div style={{ padding: '20px 0' }}>
          <div className="runner-up-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>Ctrl + Z</strong>
            <span>Undo last action</span>
          </div>
          <div className="runner-up-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>?</strong>
            <span>Show this help guide</span>
          </div>
          <div className="runner-up-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>Space</strong>
            <span>Reveal answer (when question is active)</span>
          </div>
          <div className="runner-up-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>R</strong>
            <span>Restart question timer</span>
          </div>
          <div className="runner-up-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>B</strong>
            <span>Show Board on display</span>
          </div>
          <div className="runner-up-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>L</strong>
            <span>Show Leaderboard on display</span>
          </div>
          <div className="runner-up-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>Escape</strong>
            <span>Close active question</span>
          </div>
        </div>
      </div>
    </div>
  );
}
