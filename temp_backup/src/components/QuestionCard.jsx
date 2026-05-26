import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { useMediaUrl } from '../utils/media.js';
import { QUESTION_TIMER_SECONDS, DISPLAY_AWARD_TEAMS_PER_COLUMN } from '../config.js';
import { formatTimer, numberOrZero } from '../utils/helpers.js';
import { audioEngine } from '../utils/audio.js';
import { getLeaderboardColumns } from './LeaderboardCard.jsx';

function useTilt() {
  const ref = useRef(null);

  const handleMouseMove = useCallback((event) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * 6; // max 3 degrees
    const rotateY = (x - 0.5) * 6;
    el.style.transform = `perspective(var(--tilt-perspective, 800px)) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = '';
  }, []);

  return { ref, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}

export default function QuestionCard({ title, subtitle, question, displayMode = false, hideHeader = false, revealAnswer = false, showTeams = false, fullscreenImage = false, mediaPlayTrigger = 0, selectedTeamIds = [], teams = [], awardMoment = null }) {
  const tilt = useTilt();
  const showQuestionContent = !displayMode || !showTeams;
  const showHeader = showQuestionContent && !hideHeader;
  const showAnswerReveal = Boolean(question.answer && displayMode && revealAnswer && showQuestionContent);
  const showPromptContent = showQuestionContent && !showAnswerReveal;
  const imageUrl = useMediaUrl(question.imageUrl);
  const audioUrl = useMediaUrl(question.audioUrl);
  const videoUrl = useMediaUrl(question.videoUrl);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState("");
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!displayMode) {
      return;
    }
    setFullscreenImageUrl(fullscreenImage && imageUrl ? imageUrl : "");
  }, [displayMode, fullscreenImage, imageUrl]);

  useEffect(() => {
    if (!displayMode || mediaPlayTrigger <= 0) {
      return;
    }
    [audioRef.current, videoRef.current].forEach((mediaElement) => {
      if (!mediaElement) {
        return;
      }
      mediaElement.currentTime = 0;
      mediaElement.play().catch((error) => console.error("Question media failed", error));
    });
  }, [displayMode, mediaPlayTrigger]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`question-viewer-card${displayMode ? " display-mode jeopardy-mode" : " tilt-card"}`}
      {...(!displayMode ? { ref: tilt.ref, onMouseMove: tilt.onMouseMove, onMouseLeave: tilt.onMouseLeave } : {})}
    >
      {showHeader && (
        <div className="viewer-header">
          <div>
            <h3 className="viewer-category-title">{title}</h3>
            <p className="muted">{subtitle}</p>
          </div>
        </div>
      )}
      {!displayMode && (
        <div className="viewer-badge-row">
          {question.answered && <span className="viewer-badge">Already asked</span>}
          {question.answer && <span className="viewer-badge">Answer saved</span>}
        </div>
      )}
      {showPromptContent && (
        <>
          <div className="viewer-text">
            <ReactMarkdown>{question.text || "No prompt entered yet."}</ReactMarkdown>
          </div>
          <div className="viewer-media">
            {imageUrl && (
              <button type="button" className="viewer-image-button" onClick={() => setFullscreenImageUrl(imageUrl)}>
                <img src={imageUrl} alt={title} />
              </button>
            )}
            {audioUrl && <audio ref={audioRef} src={audioUrl} controls autoPlay={displayMode} />}
            {videoUrl && <video ref={videoRef} src={videoUrl} controls autoPlay={displayMode} playsInline />}
          </div>
        </>
      )}
      {question.answer && !displayMode && (
        <div className="helper-text">
          <ReactMarkdown>{`**Answer:** ${question.answer}`}</ReactMarkdown>
        </div>
      )}
      {showAnswerReveal && (
        <motion.div 
          className="answer-reveal-card"
          initial={{ opacity: 0, rotateX: -90, y: 20 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, mass: 1.2 }}
        >
          <p className="answer-reveal-label">Answer</p>
          <div className="answer-reveal-text">
            <ReactMarkdown>{question.answer}</ReactMarkdown>
          </div>
        </motion.div>
      )}
      {displayMode && showTeams && <DisplayTeamsList teams={teams} selectedTeamIds={selectedTeamIds} awardPoints={question.points} awardMoment={awardMoment} />}
      {fullscreenImageUrl && createPortal(
        <div className="image-lightbox" onClick={() => setFullscreenImageUrl("")}>
          <button type="button" className="image-lightbox-close" onClick={() => setFullscreenImageUrl("")}>
            Close
          </button>
          <img src={fullscreenImageUrl} alt={`${title} full screen`} onClick={(event) => event.stopPropagation()} />
        </div>,
        document.body,
      )}
    </motion.div>
  );
}

export function QuestionTimer({ timerKey }) {
  const timerSeconds = useQuestionTimer(timerKey);

  return (
    <div className={`question-timer${timerSeconds <= 10 ? " ending" : ""}`}>
      <span>Time</span>
      <strong>{formatTimer(timerSeconds)}</strong>
    </div>
  );
}

export function useQuestionTimer(timerKey) {
  const [secondsRemaining, setSecondsRemaining] = useState(QUESTION_TIMER_SECONDS);

  useEffect(() => {
    if (!timerKey) {
      setSecondsRemaining(QUESTION_TIMER_SECONDS);
      return undefined;
    }

    setSecondsRemaining(QUESTION_TIMER_SECONDS);
    const intervalId = window.setInterval(() => {
      setSecondsRemaining((current) => {
        const next = Math.max(0, current - 1);
        if (next > 0 && next <= 10) {
          audioEngine.play('tick', 0.5);
        } else if (next === 0 && current > 0) {
          audioEngine.play('tick', 1.0);
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerKey]);

  return secondsRemaining;
}

export function DisplayTeamsList({ teams, selectedTeamIds = [], awardPoints = 0, awardMoment = null }) {
  const { columns: leaderboardColumns, teamsPerColumn } = getLeaderboardColumns(teams, DISPLAY_AWARD_TEAMS_PER_COLUMN);
  const densityClass = leaderboardColumns.length > 4 ? " compact ultra-compact" : leaderboardColumns.length > 2 ? " compact" : "";
  const awardingTeamIds = new Set((awardMoment?.recipients || []).map((recipient) => recipient.teamId));

  return (
    <section
      className={`leaderboard-card display-teams-card${densityClass}`}
      style={{
        "--leaderboard-column-count": leaderboardColumns.length,
        "--display-team-row-count": Math.min(teamsPerColumn, teams.length || 1),
      }}
    >
      <div className="leaderboard-head">
        <p className="section-label">Teams</p>
        <h2>Leaderboard</h2>
      </div>
      <div className="leaderboard-list">
        {leaderboardColumns.map((column) => (
          <div className="leaderboard-column" key={`display-teams-column-${column.columnIndex}`}>
            {column.teams.map((team, teamIndex) => {
              const rank = column.columnIndex * teamsPerColumn + teamIndex + 1;
              const isSelected = selectedTeamIds.includes(team.id);
              const isAwarding = awardingTeamIds.has(team.id);
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className={`leaderboard-row${isSelected ? " selected" : ""}${isAwarding ? " awarding" : ""}`} 
                  key={team.id}
                >
                  <span className="leaderboard-rank">{rank}</span>
                  <span className={`leaderboard-name${team.doubleTapStatus !== "ready" ? " energized" : ""}`}>{team.name}</span>
                  <span className="leaderboard-score">
                    {isSelected && <span className="leaderboard-award">+{awardPoints}</span>}
                    <span className="leaderboard-total">{team.total}</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
