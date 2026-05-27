import { useState, useEffect } from 'react';
import { usePlayerConnection } from '../utils/remote.js';
import { generateUUID } from '../utils/helpers.js';

const TEAM_GRADIENTS = [
  'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)',
  'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
  'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
  'linear-gradient(135deg, #ec008c 0%, #fc6767 100%)',
  'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
  'linear-gradient(135deg, #F09819 0%, #EDDE5D 100%)',
];

export default function PlayerScreen() {
  const searchParams = new URLSearchParams(window.location.search);
  const roomId = searchParams.get('room');
  
  const { remoteState: state, status, sendMessage } = usePlayerConnection(roomId);
  const [teamId, setTeamId] = useState(() => localStorage.getItem('trivia_player_teamId') || '');
  const [playerId] = useState(() => {
    let id = localStorage.getItem('trivia_playerId');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('trivia_playerId', id);
    }
    return id;
  });

  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState(null);

  // Auto-reset form when a new question starts
  useEffect(() => {
    if (state?.activeQuestion) {
      const q = state.activeQuestion;
      const qId = q.type === 'board' ? `board-${q.categoryIndex}-${q.questionIndex}` : `final-${q.questionIndex}`;
      if (qId !== lastQuestionId) {
        setAnswer('');
        setSubmitted(false);
        setLastQuestionId(qId);
      }
    } else {
      setLastQuestionId(null);
      setAnswer('');
      setSubmitted(false);
    }
  }, [state?.activeQuestion, lastQuestionId]);

  const handleSelectTeam = (id) => {
    if (id === '') {
      if (teamId) {
        sendMessage({ type: 'RELEASE_TEAM', teamId, playerId });
      }
    } else {
      sendMessage({ type: 'CLAIM_TEAM', teamId: id, playerId });
    }
    setTeamId(id);
    localStorage.setItem('trivia_player_teamId', id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || !teamId) return;

    sendMessage({
      type: 'SUBMIT_ANSWER',
      teamId,
      playerId,
      answer: answer.trim()
    });
    setSubmitted(true);
  };

  const renderContent = () => {
    if (!roomId) {
      return (
        <div className="player-main">
          <div className="player-card error">
            <h2>No Room ID Provided</h2>
            <p>Please scan the QR code on the display screen to join.</p>
          </div>
        </div>
      );
    }

    if (status === 'connecting') {
      return (
        <div className="player-main">
          <div className="player-card pulse">
            <h2>Connecting...</h2>
            <p style={{ opacity: 0.7, marginTop: '10px' }}>Linking to host game</p>
          </div>
        </div>
      );
    }

    if (status === 'disconnected' || status === 'error') {
      return (
        <div className="player-main">
          <div className="player-card error">
            <h2>Disconnected</h2>
            <p>Lost connection to the host. The host may have closed their browser.</p>
            <button className="primary-button" onClick={() => window.location.reload()}>Reconnect</button>
          </div>
        </div>
      );
    }

    if (!state) {
      return (
        <div className="player-main">
          <div className="player-card pulse">
            <h2>Waiting for game data...</h2>
          </div>
        </div>
      );
    }

    if (!teamId) {
      return (
        <div className="player-main">
          <div className="player-card">
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Select Your Team</h2>
            <div className="team-selector-list">
              {state.teams.map((t, index) => {
                const claimer = state.teamClaims?.[t.id];
                const isClaimedByOther = claimer && claimer !== playerId;
                const gradient = TEAM_GRADIENTS[index % TEAM_GRADIENTS.length];
                return (
                  <button 
                    key={t.id} 
                    className="team-select-btn" 
                    onClick={() => handleSelectTeam(t.id)}
                    style={{ 
                      background: isClaimedByOther ? 'rgba(255,255,255,0.1)' : gradient,
                      opacity: isClaimedByOther ? 0.5 : 1,
                      pointerEvents: isClaimedByOther ? 'none' : 'auto',
                      color: isClaimedByOther ? '#999' : '#fff'
                    }}
                    disabled={isClaimedByOther}
                  >
                    <span className="team-name">{t.name}</span>
                    {isClaimedByOther && <span className="team-claimed-tag">Taken</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const team = state.teams.find(t => t.id === teamId);
    if (!team) {
      setTeamId('');
      return null;
    }

    const teamIndex = state.teams.findIndex(t => t.id === teamId);
    const teamGradient = TEAM_GRADIENTS[teamIndex % TEAM_GRADIENTS.length];

    const activeQuestion = state.activeQuestion;
    const isQuestionActive = activeQuestion && state.displayView === 'board';

    return (
      <>
        <header className="player-header" style={{ background: teamGradient }}>
          <div className="player-team-info">
            <h3>{team.name}</h3>
            <span className="player-score">{team.total || 0} pts</span>
          </div>
          <button className="text-button change-team-btn" onClick={() => handleSelectTeam('')}>Leave</button>
        </header>

        <main className="player-main">
          {!isQuestionActive ? (
            <div className="player-card waiting-card">
              <div className="waiting-icon">👀</div>
              <h2>Get Ready!</h2>
              <p>Look at the main screen. Waiting for the next question...</p>
            </div>
          ) : (
            <div className="player-card active-card">
              <div className="question-indicator">Question Active</div>
              {submitted ? (
                <div className="submission-success">
                  <div className="success-icon">✅</div>
                  <h2>Answer Locked In!</h2>
                  <p>Waiting for the host to reveal the correct answer...</p>
                  <div className="submitted-answer-box">
                    <strong>Your Answer:</strong>
                    <span>{answer}</span>
                  </div>
                  <button 
                    className="secondary-button change-answer-btn" 
                    onClick={() => setSubmitted(false)}
                  >
                    Change Answer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="player-form">
                  <input
                    type="text"
                    placeholder="Type your answer here..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="player-input"
                    autoComplete="off"
                    autoFocus
                  />
                  <button 
                    type="submit" 
                    className="primary-button player-submit-btn"
                    disabled={!answer.trim()}
                    style={{ background: answer.trim() ? teamGradient : 'rgba(255,255,255,0.2)' }}
                  >
                    Submit Answer
                  </button>
                </form>
              )}
            </div>
          )}
        </main>
      </>
    );
  };

  return (
    <div className="player-screen-container">
      {renderContent()}
      <style>{`
        .player-screen-container {
          min-height: 100vh;
          background: #0f172a;
          color: white;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
        }
        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .player-team-info h3 {
          margin: 0;
          font-size: 1.6rem;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          font-weight: 800;
        }
        .player-score {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.9);
          font-weight: 600;
          background: rgba(0,0,0,0.2);
          padding: 4px 12px;
          border-radius: 20px;
          display: inline-block;
          margin-top: 5px;
        }
        .change-team-btn {
          background: rgba(0,0,0,0.3) !important;
          color: white !important;
          border-radius: 8px !important;
          padding: 8px 16px !important;
        }
        .player-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .player-card {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 30px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .player-card.error {
          border-color: #ef4444;
          text-align: center;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .team-selector-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .team-select-btn {
          width: 100%;
          padding: 16px 20px;
          border: none;
          border-radius: 12px;
          font-size: 1.3rem;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        .team-select-btn:active {
          transform: scale(0.98);
        }
        .team-claimed-tag {
          font-size: 0.9rem;
          background: rgba(0,0,0,0.3);
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .waiting-card {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .waiting-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .waiting-card h2 {
          font-size: 2rem;
          margin-bottom: 10px;
        }
        .waiting-card p {
          opacity: 0.7;
          font-size: 1.1rem;
        }
        .question-indicator {
          background: #ef4444;
          color: white;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.8rem;
          padding: 6px 12px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 20px;
          letter-spacing: 1px;
        }
        .player-input {
          width: 100%;
          padding: 24px;
          font-size: 1.5rem;
          background: rgba(0,0,0,0.4);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: white;
          margin-bottom: 20px;
          box-sizing: border-box;
          transition: all 0.2s;
          text-align: center;
        }
        .player-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.5);
          background: rgba(0,0,0,0.6);
          box-shadow: 0 0 20px rgba(255,255,255,0.1);
        }
        .player-submit-btn {
          width: 100%;
          padding: 20px;
          font-size: 1.4rem;
          font-weight: bold;
          border-radius: 12px;
          border: none;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          transition: transform 0.1s;
        }
        .player-submit-btn:active {
          transform: translateY(2px);
        }
        .player-submit-btn:disabled {
          box-shadow: none;
          color: rgba(255,255,255,0.4);
        }
        .submission-success {
          text-align: center;
        }
        .success-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes pop {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        .submission-success h2 {
          font-size: 2rem;
          margin-bottom: 10px;
        }
        .submitted-answer-box {
          margin-top: 24px;
          padding: 20px;
          background: rgba(0,0,0,0.3);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .submitted-answer-box strong {
          display: block;
          margin-bottom: 8px;
          opacity: 0.7;
          text-transform: uppercase;
          font-size: 0.9rem;
          letter-spacing: 1px;
        }
        .submitted-answer-box span {
          font-size: 1.8rem;
          font-weight: bold;
          color: #ffea00;
          word-break: break-word;
        }
        .change-answer-btn {
          margin-top: 24px;
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
}

