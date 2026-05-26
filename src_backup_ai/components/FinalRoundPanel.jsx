import { LabeledInput, LabeledTextarea, MediaUploadField } from './FormControls.jsx';
import { getClampedFinalWagerPair, getFinalWagerBudget, updateFinalWager } from '../utils/helpers.js';
import { audioEngine } from '../utils/audio.js';

export default function FinalRoundPanel({
  state,
  updateState,
  setActiveFinalQuestion,
  applyFinalResults,
  selectedQuestionIndex,
  setSelectedQuestionIndex,
}) {
  const question = state.finalRound.questions[selectedQuestionIndex] || state.finalRound.questions[0];
  const questionIndex = state.finalRound.questions.indexOf(question);
  const q1 = state.finalRound.questions[0];
  const q2 = state.finalRound.questions[1];

  return (
    <section className="panel panel-wide admin-workspace-panel final-admin-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Final Round</p>
          <h2>Wagers and Results</h2>
        </div>
        <div className="hero-actions">
          <button 
            type="button" 
            className="secondary-button" 
            onClick={() => {
              audioEngine.play('swoosh');
              updateState(draft => {
                draft.activeQuestion = null;
                draft.displayView = "finalCategories";
                return draft;
              });
            }}
          >
            Show Categories on Display
          </button>
        </div>
      </div>

      <div className="final-round final-round-admin">

        {/* ── Question content editing (tabbed) ── */}
        <div className="final-question-tabs-row">
          {state.finalRound.questions.map((entry, index) => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '12px' }}>
              <button
                type="button"
                className={questionIndex === index ? 'primary-button' : 'ghost-button'}
                onClick={() => setSelectedQuestionIndex(index)}
              >
                Final Question {index + 1}
              </button>
              <button 
                type="button" 
                className="secondary-button" 
                onClick={() => applyFinalResults(index)}
              >
                Apply Final Q{index + 1} Results
              </button>
            </div>
          ))}
        </div>

        <div className="final-question" key={question.id}>
          <div className="panel-header">
            <h3>{question.title}</h3>
            <button className="primary-button" onClick={() => setActiveFinalQuestion(questionIndex)}>
              Show In Viewer
            </button>
          </div>

          <div className="final-meta final-admin-meta final-media-layout">
            <LabeledInput
              label="Title"
              value={question.title}
              onChange={(value) => updateState((draft) => {
                draft.finalRound.questions[questionIndex].title = value;
                return draft;
              })}
            />
            <LabeledTextarea
              label="Prompt"
              value={question.text}
              onChange={(value) => updateState((draft) => {
                draft.finalRound.questions[questionIndex].text = value;
                return draft;
              })}
            />
            <LabeledInput
              label="Answer"
              value={question.answer}
              onChange={(value) => updateState((draft) => {
                draft.finalRound.questions[questionIndex].answer = value;
                return draft;
              })}
            />
            <MediaUploadField
              label="Image File"
              accept="image/*"
              currentValue={question.imageUrl}
              onChange={(value) => updateState((draft) => {
                draft.finalRound.questions[questionIndex].imageUrl = value;
                return draft;
              })}
            />
            <MediaUploadField
              label="Audio File"
              accept="audio/*"
              currentValue={question.audioUrl}
              onChange={(value) => updateState((draft) => {
                draft.finalRound.questions[questionIndex].audioUrl = value;
                return draft;
              })}
            />
            <MediaUploadField
              label="Video File"
              className="final-video-upload"
              accept="video/*"
              currentValue={question.videoUrl}
              onChange={(value) => updateState((draft) => {
                draft.finalRound.questions[questionIndex].videoUrl = value;
                return draft;
              })}
            />
          </div>
        </div>

        {/* ── Unified wager table: all teams × both questions ── */}
        <div className="final-wager-table-wrap">
          <div className="final-wager-table">
            {/* Header */}
            <div className="final-wager-header">
              <span className="final-wager-team-col">Team</span>
              <div className="final-wager-q-group">
                <span className="final-wager-q-label">Final Q1 — {q1?.title || 'Question 1'}</span>
                <div className="final-wager-q-cols">
                  <span>Wager</span>
                  <span>Correct?</span>
                  <span>Delta</span>
                </div>
              </div>
              {q2 && (
                <div className="final-wager-q-group">
                  <span className="final-wager-q-label">Final Q2 — {q2?.title || 'Question 2'}</span>
                  <div className="final-wager-q-cols">
                    <span>Wager</span>
                    <span>Correct?</span>
                    <span>Delta</span>
                  </div>
                </div>
              )}
              <span className="final-wager-budget-col">Budget</span>
            </div>

            {/* Rows */}
            {state.teams.map((team) => {
              const budget = getFinalWagerBudget(team);
              const wagerPair = getClampedFinalWagerPair(state.finalRound, team);
              const [w1, w2] = wagerPair;
              const d1 = q1?.correctTeamIds.includes(team.id) ? w1 : -w1;
              const d2 = q2 ? (q2?.correctTeamIds.includes(team.id) ? w2 : -w2) : 0;
              const remaining = budget - w1 - w2;

              return (
                <div className="final-wager-row" key={team.id}>
                  <strong className="final-wager-team-col">{team.name}</strong>

                  {/* Q1 */}
                  <div className="final-wager-q-group">
                    <div className="final-wager-q-cols">
                      <input
                        id={`wager-q1-${team.id}`}
                        type="number"
                        min="0"
                        max={budget - w2}
                        value={w1}
                        className="final-wager-input"
                        onChange={(e) => updateState((draft) => {
                          updateFinalWager(draft, 0, team.id, e.target.value);
                          return draft;
                        })}
                      />
                      <label className="final-wager-toggle">
                        <input
                          type="checkbox"
                          checked={q1?.correctTeamIds.includes(team.id) ?? false}
                          onChange={(e) => updateState((draft) => {
                            const ids = draft.finalRound.questions[0].correctTeamIds;
                            draft.finalRound.questions[0].correctTeamIds = e.target.checked
                              ? [...ids, team.id]
                              : ids.filter((id) => id !== team.id);
                            return draft;
                          })}
                        />
                        <span className={`final-wager-correct-badge ${q1?.correctTeamIds.includes(team.id) ? 'correct' : 'incorrect'}`}>
                          {q1?.correctTeamIds.includes(team.id) ? '✓' : '✗'}
                        </span>
                      </label>
                      <span className={`final-wager-delta ${d1 > 0 ? 'positive' : d1 < 0 ? 'negative' : ''}`}>
                        {d1 > 0 ? `+${d1}` : d1}
                      </span>
                    </div>
                  </div>

                  {/* Q2 */}
                  {q2 && (
                    <div className="final-wager-q-group">
                      <div className="final-wager-q-cols">
                        <input
                          id={`wager-q2-${team.id}`}
                          type="number"
                          min="0"
                          max={budget - w1}
                          value={w2}
                          className="final-wager-input"
                          onChange={(e) => updateState((draft) => {
                            updateFinalWager(draft, 1, team.id, e.target.value);
                            return draft;
                          })}
                        />
                        <label className="final-wager-toggle">
                          <input
                            type="checkbox"
                            checked={q2?.correctTeamIds.includes(team.id) ?? false}
                            onChange={(e) => updateState((draft) => {
                              const ids = draft.finalRound.questions[1].correctTeamIds;
                              draft.finalRound.questions[1].correctTeamIds = e.target.checked
                                ? [...ids, team.id]
                                : ids.filter((id) => id !== team.id);
                              return draft;
                            })}
                          />
                          <span className={`final-wager-correct-badge ${q2?.correctTeamIds.includes(team.id) ? 'correct' : 'incorrect'}`}>
                            {q2?.correctTeamIds.includes(team.id) ? '✓' : '✗'}
                          </span>
                        </label>
                        <span className={`final-wager-delta ${d2 > 0 ? 'positive' : d2 < 0 ? 'negative' : ''}`}>
                          {d2 > 0 ? `+${d2}` : d2}
                        </span>
                      </div>
                    </div>
                  )}

                  <span className={`final-wager-budget-col final-wager-remaining ${remaining < 0 ? 'over-budget' : ''}`}>
                    {remaining} left
                  </span>
                </div>
              );
            })}
          </div>


        </div>

      </div>
    </section>
  );
}

export function CorrectTeamsPanel({ teams, selectedTeamIds, onChange, className = '' }) {
  function toggleTeam(teamId) {
    onChange(
      selectedTeamIds.includes(teamId)
        ? selectedTeamIds.filter((entry) => entry !== teamId)
        : [...selectedTeamIds, teamId],
    );
  }

  function selectAllTeams() {
    onChange(teams.map((team) => team.id));
  }

  function clearSelection() {
    onChange([]);
  }

  return (
    <div className={`final-team-card ${className}`.trim()}>
      <strong>Correct Teams</strong>
      <div className="selection-toolbar">
        <span className="mini-label">Final Scoring</span>
        <div className="selection-actions">
          <button type="button" className="tiny-button" onClick={selectAllTeams}>Select All</button>
          <button type="button" className="tiny-button" onClick={clearSelection}>Clear</button>
        </div>
      </div>
      <div className="team-selector-list">
        {teams.map((team) => (
          <label key={team.id} className="team-selector-item">
            <input
              type="checkbox"
              checked={selectedTeamIds.includes(team.id)}
              onChange={() => toggleTeam(team.id)}
            />
            <span>{team.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
