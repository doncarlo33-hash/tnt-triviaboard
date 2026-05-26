import { useState, useEffect } from 'react';
import { LabeledInput, LabeledTextarea, MediaUploadField } from './FormControls.jsx';
import { QuestionTimer } from './QuestionCard.jsx';
import RoundController from './RoundController.jsx';

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

          <div className="question-award-grid media-upload-grid">
            <MediaUploadField
              label="Image File"
              accept="image/*"
              currentValue={question.imageUrl}
              onChange={(value) => updateState((draft) => {
                draft.categories[categoryIndex].questions[questionIndex].imageUrl = value;
                return draft;
              })}
            />
            <MediaUploadField
              label="Audio File"
              accept="audio/*"
              currentValue={question.audioUrl}
              onChange={(value) => updateState((draft) => {
                draft.categories[categoryIndex].questions[questionIndex].audioUrl = value;
                return draft;
              })}
            />
            <MediaUploadField
              label="Video File"
              accept="video/*"
              currentValue={question.videoUrl}
              onChange={(value) => updateState((draft) => {
                draft.categories[categoryIndex].questions[questionIndex].videoUrl = value;
                return draft;
              })}
            />
          </div>

          <div className="question-award-grid">
            <AwardPanel
              title="Award Correct"
              buttonLabel={`+${question.points}`}
              buttonClass="primary-button"
              teams={state.teams}
              question={question}
              onApply={(teamIds) => applyBoardScore(teamIds, categoryIndex, question)}
              onSelectionChange={setAwardSelectedTeamIds}
              onClose={closeModal}
            />
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
      </div>
    </div>
  );
}

export function AwardPanel({ title, buttonLabel, buttonClass, teams, question, onApply, onSelectionChange, onClose }) {
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
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

  return (
    <div className="final-team-card">
      <strong>{title}</strong>
      <div className="selection-toolbar" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="mini-label">Teams</span>
          <div className="selection-actions">
            <button type="button" className="tiny-button" onClick={selectAllTeams}>Select All</button>
            <button type="button" className="tiny-button" onClick={clearSelection}>Clear</button>
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
      <div className="team-selector-list">
        {teams.map((team) => {
          const isSelected = selectedTeamIds.includes(team.id);
          return (
            <label key={team.id} className={`team-selector-item${isSelected ? " selected" : ""}`}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleTeam(team.id)}
              />
              <span className="team-selector-name">{team.name}</span>
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
