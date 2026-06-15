import { useState, useEffect } from 'react';
import { LabeledInput, LabeledTextarea } from './FormControls.jsx';
import { QuestionTimer } from './QuestionCard.jsx';
import RoundController from './RoundController.jsx';
import { useSettings } from '../settingsStore.js';
import { verifyTriviaAnswer } from '../utils/ai.js';

export default function QuestionModal({ state, modalQuestion, closeModal, updateState, applyBoardScore, setRevealAnswer, setShowTeams, setFullscreenImage, playActiveQuestionMedia, setAwardSelectedTeamIds, setRoundStage, restartQuestionTimer, showLeaderboardOnDisplay, showBoardOnDisplay }) {
  const { categoryIndex, questionIndex } = modalQuestion;
  const category = state.categories[categoryIndex];
  const question = category.questions[questionIndex];
  const questionTitle = question.kind === "booster" ? `${category.title} - Booster` : `${category.title} - ${question.points} points`;
  const isAnswerVisible = Boolean(state.activeQuestion?.revealAnswer);
  const areTeamsVisible = Boolean(state.activeQuestion?.showTeams);
  const isImageFullscreen = Boolean(state.activeQuestion?.fullscreenImage);

  return (
    <div className="modal-backdrop" onClick={closeModal}>
      <div className="question-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="question-modal-header">
          <div>
            <p className="section-label">Question Controls</p>
            <h2>{questionTitle}</h2>
          </div>
        </div>
        <div className="question-modal-body">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <LabeledTextarea
                label="Prompt"
                value={question.text}
                onChange={(value) => updateState((draft) => {
                  draft.categories[categoryIndex].questions[questionIndex].text = value;
                  return draft;
                })}
              />
              <LabeledInput
                label="Answer"
                value={question.answer}
                onChange={(value) => updateState((draft) => {
                  draft.categories[categoryIndex].questions[questionIndex].answer = value;
                  return draft;
                })}
              />
              <AIVerificationPanel question={question} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="final-team-card">
                <strong>Display Controls</strong>
                {!isAnswerVisible && <QuestionTimer timerKey={`${question.id}-${state.activeQuestion?.timerRestartKey ?? 0}`} />}
                <p className="helper-text">Control what appears on the audience question screen.</p>
                <RoundController
                  activeQuestion={{
                    title: questionTitle,
                    question,
                    revealAnswer: isAnswerVisible,
                    showTeams: areTeamsVisible,
                  }}
                  setRoundStage={setRoundStage}
                  restartQuestionTimer={restartQuestionTimer}
                  playActiveQuestionMedia={playActiveQuestionMedia}
                  showLeaderboardOnDisplay={showLeaderboardOnDisplay}
                  showBoardOnDisplay={showBoardOnDisplay}
                />
                <div className="team-tools">
                  <button type="button" className="secondary-button" onClick={() => setRevealAnswer(!isAnswerVisible)}>
                    {isAnswerVisible ? "Hide Answer" : "Show Answer"}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setShowTeams(!areTeamsVisible)}>
                    {areTeamsVisible ? "Hide Teams" : "Show Teams"}
                  </button>
                  {question.imageUrl && (
                    <button type="button" className="secondary-button" onClick={() => setFullscreenImage(!isImageFullscreen)}>
                      {isImageFullscreen ? "Close Image Fullscreen" : "Show Image Fullscreen"}
                    </button>
                  )}
                  {(question.audioUrl || question.videoUrl) && (
                    <button type="button" className="secondary-button" onClick={playActiveQuestionMedia}>
                      Play Media
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <AwardPanel
            title="Award Correct"
            buttonLabel={`+${question.points}`}
            buttonClass="primary-button"
            teams={state.teams}
            question={question}
            submittedAnswers={state.submittedAnswers || {}}
            onApply={(teamIds) => applyBoardScore(teamIds, categoryIndex, question)}
            onSelectionChange={setAwardSelectedTeamIds}
            onClose={closeModal}
          />

        </div>
      </div>
    </div>
  );
}

export function AwardPanel({ title, buttonLabel, buttonClass, teams, question, submittedAnswers = {}, onApply, onSelectionChange, onClose }) {
  const { settings } = useSettings();
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [isAutoGrading, setIsAutoGrading] = useState(false);
  const awardedTeamIds = Array.isArray(question.awardedTeamIds) ? question.awardedTeamIds : [];
  const selectedAwardableTeamIds = selectedTeamIds.filter((teamId) => !awardedTeamIds.includes(teamId));

  const teamIdsString = teams.map(t => t.id).sort().join(',');

  useEffect(() => {
    const nextTeamIds = selectedTeamIds.filter((teamId) => teams.some((team) => team.id === teamId));
    if (nextTeamIds.length !== selectedTeamIds.length) {
      setAwardSelection(nextTeamIds);
    }
  }, [teamIdsString]);

  function setAwardSelection(nextTeamIds) {
    setSelectedTeamIds(nextTeamIds);
    onSelectionChange?.(nextTeamIds);
  }

  function toggleTeam(teamId) {
    setAwardSelection(
      selectedTeamIds.includes(teamId)
        ? selectedTeamIds.filter((entry) => entry !== teamId)
        : [...selectedTeamIds, teamId],
    );
  }

  function selectAllTeams() {
    setAwardSelection(teams.map((team) => team.id));
  }

  function clearSelection() {
    setAwardSelection([]);
  }

  function applySelection() {
    const teamIds = selectedAwardableTeamIds;
    onApply(teamIds);
    setAwardSelection([]);
  }

  async function handleAutoGrade() {
    if (!settings?.aiApiKey) {
      alert('Please configure your Gemini API Key in the Settings to use Auto-Grade.');
      return;
    }
    
    const answersToGrade = teams
      .filter(t => submittedAnswers[t.id] && !awardedTeamIds.includes(t.id))
      .map(t => ({ id: t.id, answer: submittedAnswers[t.id] }));

    if (answersToGrade.length === 0) return;

    setIsAutoGrading(true);
    try {
      const results = await Promise.all(
        answersToGrade.map(async (item) => {
          try {
            const verdict = await verifyTriviaAnswer(settings.aiApiKey, question.text, question.answer, item.answer);
            // Consider "correct" or "partially correct" as valid if "incorrect" is not explicitly stated as the primary ruling.
            // A simpler check: if it says "correct" or "partially correct" and NOT "incorrect".
            const isCorrect = verdict.toLowerCase().includes('correct') && !verdict.toLowerCase().startsWith('incorrect');
            return { id: item.id, isCorrect };
          } catch (e) {
            return { id: item.id, isCorrect: false };
          }
        })
      );

      const correctIds = results.filter(r => r.isCorrect).map(r => r.id);
      const newSelectedIds = [...new Set([...selectedTeamIds, ...correctIds])];
      setAwardSelection(newSelectedIds);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoGrading(false);
    }
  }

  return (
    <div className="final-team-card">
      <strong>{title}</strong>
      <div className="selection-toolbar" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="mini-label">Teams</span>
          <div className="selection-actions">
            <button type="button" className="tiny-button" onClick={selectAllTeams}>Select All</button>
            <button type="button" className="tiny-button" onClick={clearSelection}>Clear</button>
            <button 
              type="button" 
              className="tiny-button" 
              onClick={handleAutoGrade}
              disabled={isAutoGrading || Object.keys(submittedAnswers).length === 0}
              style={{ 
                color: Object.keys(submittedAnswers).length === 0 ? 'rgba(255,234,0,0.4)' : '#ffea00', 
                borderColor: Object.keys(submittedAnswers).length === 0 ? 'rgba(255,234,0,0.2)' : 'rgba(255,234,0,0.5)',
                pointerEvents: Object.keys(submittedAnswers).length === 0 ? 'none' : 'auto'
              }}
            >
              {isAutoGrading ? "Grading..." : Object.keys(submittedAnswers).length === 0 ? "Waiting for answers" : "Auto-Grade ✨"}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onClose && (
            <button type="button" className="ghost-button" onClick={onClose} style={{ padding: '6px 12px', minHeight: '32px', fontSize: '0.85rem' }}>
              Close
            </button>
          )}
          <button
            type="button"
            className={buttonClass}
            onClick={applySelection}
            disabled={selectedAwardableTeamIds.length === 0}
            style={{ padding: '6px 16px', minHeight: '32px', fontSize: '0.95rem' }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
      <div className="team-selector-list" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '8px' }}>
        {teams.map((team) => {
          const isSelected = selectedTeamIds.includes(team.id);
          return (
            <label key={team.id} className={`team-selector-item${isSelected ? " selected" : ""}`}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleTeam(team.id)}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="team-selector-name">{team.name}</span>
                {submittedAnswers[team.id] && (
                  <span style={{ fontSize: '0.85rem', color: '#ffea00', marginTop: '2px' }}>
                    "{submittedAnswers[team.id]}"
                  </span>
                )}
              </div>
              {question.kind !== "booster" && (
                <span className={`double-tag${team.doubleTapStatus === "armed" ? " armed" : ""}${team.doubleTapStatus === "used" ? " used" : ""}`}>
                  {team.doubleTapStatus === "used"
                    ? "Double used"
                    : team.doubleTapStatus === "armed"
                      ? `Double C${(team.doubleTapCategoryIndex ?? 0) + 1}`
                      : "Double ready"}
                </span>
              )}
              {awardedTeamIds.includes(team.id) && <span className="double-tag used">Awarded</span>}
            </label>
          );
        })}
      </div>

    </div>
  );
}


function AIVerificationPanel({ question }) {
  const { settings } = useSettings();
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleVerify() {
    if (!guess.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const verdict = await verifyTriviaAnswer(settings.aiApiKey, question.text, question.answer, guess);
      setResult(verdict);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="final-team-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong>AI Answer Verification</strong>
        {!settings.aiApiKey && <span className="double-tag used">API Key Required in Settings</span>}
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <input 
          className="form-input" 
          value={guess} 
          onChange={e => setGuess(e.target.value)} 
          placeholder="Enter team's challenged answer..." 
          style={{ flex: 1 }}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          disabled={!settings.aiApiKey || loading}
        />
        <button 
          type="button" 
          className="primary-button" 
          onClick={handleVerify}
          disabled={!settings.aiApiKey || loading || !guess.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? "Verifying..." : "Verify with AI"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255, 60, 60, 0.1)', borderLeft: '4px solid #ff3c3c', color: '#ffcdcd', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '0.95rem', lineHeight: '1.5' }}>
          <strong style={{ color: result.toLowerCase().includes('incorrect') ? '#ff5252' : '#69f0ae' }}>AI Verdict: </strong>
          {result}
        </div>
      )}
    </div>
  );
}
