import { useState, useEffect } from 'react';
import { usePlayerConnection } from '../utils/remote.js';
import { generateUUID } from '../utils/helpers.js';

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
          <div className="player-card">
            <h2>Connecting...</h2>
          </div>
        </div>
      );
    }

    if (status === 'disconnected' || status === 'error') {
      return (
        <div className="player-main">
          <div className="player-card error">
            <h2>Disconnected</h2>
            <p>Lost connection to the host.</p>
            <button className="primary-button" onClick={() => window.location.reload()}>Reconnect</button>
          </div>
        </div>
      );
    }

    if (!state) {
      return (
        <div className="player-main">
          <div className="player-card">
            <h2>Waiting for game state...</h2>
          </div>
        </div>
      );
    }

    if (!teamId) {
      return (
        <div className="player-main">
          <div className="player-card">
            <h2>Who are you playing as?</h2>
            <div className="team-selector-list">
              {state.teams.map(t => {
                const claimer = state.teamClaims?.[t.id];
                const isClaimedByOther = claimer && claimer !== playerId;
                return (
                  <button 
                    key={t.id} 
                    className="secondary-button" 
                    onClick={() => handleSelectTeam(t.id)}
                    style={{ 
                      width: '100%', 
                      marginBottom: '10px', 
                      opacity: isClaimedByOther ? 0.5 : 1,
                      pointerEvents: isClaimedByOther ? 'none' : 'auto',
                      textDecoration: isClaimedByOther ? 'line-through' : 'none'
                    }}
                    disabled={isClaimedByOther}
                  >
                    {t.name} {isClaimedByOther ? "(Taken)" : ""}
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

    const activeQuestion = state.activeQuestion;
    const isQuestionActive = activeQuestion && state.displayView === 'board';

    return (
      <>
        <header className="player-header">
          <div className="player-team-info">
            <h3>{team.name}</h3>
            <span className="player-score">{team.total || 0} pts</span>
          </div>
          <button className="text-button" onClick={() => handleSelectTeam('')}>Change Team</button>
        </header>

        <main className="player-main">
          {!isQuestionActive ? (
            <div className="player-card">
              <h2 style={{ textAlign: 'center' }}>Get Ready!</h2>
              <p style={{ textAlign: 'center', opacity: 0.7 }}>Look at the main screen. Waiting for the next question...</p>
            </div>
          ) : (
            <div className="player-card">
              <h3 style={{ marginBottom: '20px' }}>Active Question</h3>
              {submitted ? (
                <div className="submission-success">
                  <h2>Answer Locked In! 🚀</h2>
                  <p>Waiting for the host to reveal the correct answer...</p>
                  <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <strong>Your Answer:</strong><br />
                    <span style={{ fontSize: '1.2rem', color: '#ffea00' }}>{answer}</span>
                  </div>
                  <button 
                    className="secondary-button" 
                    style={{ marginTop: '20px', width: '100%' }}
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
          background: #111;
          color: white;
          font-family: var(--font-family, sans-serif);
          display: flex;
          flex-direction: column;
        }
        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .player-team-info h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }
        .player-score {
          font-size: 1.1rem;
          color: #ffea00;
          font-weight: bold;
        }
        .player-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .player-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 30px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .player-card.error {
          border-color: #ff5252;
          text-align: center;
        }
        .player-input {
          width: 100%;
          padding: 20px;
          font-size: 1.5rem;
          background: rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: white;
          margin-bottom: 20px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .player-input:focus {
          outline: none;
          border-color: #ffea00;
        }
        .player-submit-btn {
          width: 100%;
          padding: 20px;
          font-size: 1.2rem;
          font-weight: bold;
        }
        .submission-success {
          text-align: center;
        }
      `}</style>
    </div>
  );
}
