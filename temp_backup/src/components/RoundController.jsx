import React from 'react';
export default React.memo(function RoundController({ activeQuestion, setRoundStage, restartQuestionTimer, playActiveQuestionMedia, showLeaderboardOnDisplay, showBoardOnDisplay }) {
  const stage = activeQuestion.showTeams ? "teams" : activeQuestion.revealAnswer ? "answer" : "question";
  const hasMedia = Boolean(activeQuestion.question.audioUrl || activeQuestion.question.videoUrl);

  return (
    <div className="round-controller">
      <div>
        <span className="mini-label">Round Controller</span>
        <strong>{activeQuestion.title}</strong>
      </div>
      <div className="round-controller-steps" aria-label="Question stage">
        <button type="button" className={stage === "question" ? "primary-button" : "tiny-button"} onClick={() => setRoundStage("question")}>
          Question
        </button>
        <button type="button" className="tiny-button" onClick={restartQuestionTimer}>
          Timer
        </button>
        <button type="button" className={stage === "answer" ? "primary-button" : "tiny-button"} onClick={() => setRoundStage("answer")}>
          Answer
        </button>
        <button type="button" className={stage === "teams" ? "primary-button" : "tiny-button"} onClick={() => setRoundStage("teams")}>
          Teams
        </button>
        {hasMedia && (
          <button type="button" className="tiny-button" onClick={playActiveQuestionMedia}>
            Media
          </button>
        )}
        <button type="button" className="tiny-button" onClick={showLeaderboardOnDisplay}>
          Leaderboard
        </button>
        <button type="button" className="tiny-button" onClick={showBoardOnDisplay}>
          Board
        </button>
      </div>
    </div>
  );
});
