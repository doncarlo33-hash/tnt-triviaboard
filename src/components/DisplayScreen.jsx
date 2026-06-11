import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OPENING_EXPLOSION_LEAD_SECONDS } from '../config.js';
import { useSettings, applyThemeToBody } from '../settingsStore.js';
import { useMediaUrl } from '../utils/media.js';
import { useRemoteClient } from '../utils/remote.js';
import { getActiveQuestion, getRankedTeams } from '../utils/state.js';
import LeaderboardCard from './LeaderboardCard.jsx';
import QuestionCard, { QuestionTimer } from './QuestionCard.jsx';
import { FinalRoundInstructions, GameRulesView, EndGameWinners, PostGameRecap, HostTipCard, FinalCategoriesView, SocialMediaView, PlayerJoinQR } from './DisplayViews.jsx';
import { getQuestionLabel } from '../utils/helpers.js';
import { audioEngine } from '../utils/audio.js';

function CrownOvertakeOverlay({ event, onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!event || !event.newLeader) return null;

  return (
    <div className="crown-overtake-overlay">
      <div className="crown-icon">👑</div>
      <div className="crown-text">{event.newLeader.name} takes the lead!</div>
      {event.oldLeader && <div className="crown-subtext">Dethroning {event.oldLeader.name}</div>}
    </div>
  );
}

export default function DisplayScreen({ state: localState, setState, hostRoomId }) {
  const { settings } = useSettings();
  

  const resolvedEndGameMusicSrc = useMediaUrl(settings.endGameMusicSrc);
  const resolvedOpeningExplosionAudioSrc = useMediaUrl(settings.openingExplosionAudioSrc);
  const resolvedOpeningAnimationSrc = useMediaUrl(settings.openingAnimationSrc);
  const resolvedOpeningExplosionVideoSrc = useMediaUrl(settings.openingExplosionVideoSrc);
  
  // Wrap applyThemeToBody to play sound on change
  const previousThemeRef = useRef(null);
  const applyThemeWithSoundRef = useRef(null);
  applyThemeWithSoundRef.current = (theme) => {
    if (!theme) return;
    
    const isThemeChange = previousThemeRef.current && previousThemeRef.current !== theme;
    
    if (isThemeChange) {
      audioEngine.playLocal('swoosh', 0.6);
    }
    
    // Only animate if it's an actual change during the session, not the first load.
    const shouldAnimate = Boolean(isThemeChange);
    previousThemeRef.current = theme;
    
    applyThemeToBody(theme, shouldAnimate);
  };
  const applyThemeWithSound = useCallback((theme) => applyThemeWithSoundRef.current(theme), []);

  // Apply theme via Zustand (works for same-window, BroadcastChannel updates)
  useEffect(() => {
    applyThemeWithSound(settings.theme);
  }, [settings.theme, applyThemeWithSound]);

  // Listen for direct postMessage from admin window (reliable across PWA/browser boundaries)
  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'trivia-theme-change') {
        applyThemeWithSound(event.data.theme);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Remote Control support
  const roomId = useMemo(() => new URLSearchParams(window.location.search).get('room'), []);
  const activeRoomId = roomId || hostRoomId;
  const { remoteState, status: remoteStatus } = useRemoteClient(roomId);

  useEffect(() => {
    function handleRemoteAudio(e) {
      if (e.detail && e.detail.key) {
        audioEngine.playLocal(e.detail.key, e.detail.volume);
      }
    }
    window.addEventListener('remote-audio-play', handleRemoteAudio);
    return () => window.removeEventListener('remote-audio-play', handleRemoteAudio);
  }, []);
  
  // Use remote state if available and connected, otherwise fall back to local storage state
  const state = (roomId && remoteState) ? remoteState : localState;
  const rankedTeams = getRankedTeams(state.teams || []);
  const activeQuestion = getActiveQuestion(state);

  const [previousLeaderId, setPreviousLeaderId] = useState(rankedTeams[0]?.id);
  const [overtakeEvent, setOvertakeEvent] = useState(null);

  useEffect(() => {
    const currentLeaderId = rankedTeams[0]?.id;
    if (currentLeaderId && previousLeaderId && currentLeaderId !== previousLeaderId) {
      const newLeader = rankedTeams[0];
      const oldLeader = state.teams.find(t => t.id === previousLeaderId);
      // Only trigger if new leader actually has more points (prevent triggering on team deletion/reset)
      if (newLeader && oldLeader && newLeader.total > oldLeader.total) {
        setOvertakeEvent({ newLeader, oldLeader, timestamp: Date.now() });
        audioEngine.playLocal('swoosh', 0.8);
      }
    }
    if (currentLeaderId) {
      setPreviousLeaderId(currentLeaderId);
    }
  }, [rankedTeams, previousLeaderId, state.teams]);

  // Apply theme from game state — syncs reliably via the existing proven state channel
  useEffect(() => {
    if (state.displayTheme) {
      applyThemeWithSound(state.displayTheme);
    }
  }, [state.displayTheme, applyThemeWithSound]);

  const openingMusicRef = useRef(null);
  const openingExplosionAudioRef = useRef(null);
  const openingExplosionVideoRef = useRef(null);
  const endGameMusicRef = useRef(null);
  const hasStartedOpeningExplosionRef = useRef(false);
  const openingExplosionTimerRef = useRef(null);
  const [isOpeningMusicPlaying, setIsOpeningMusicPlaying] = useState(false);
  const [isOpeningExplosionActive, setIsOpeningExplosionActive] = useState(false);
  const displayCategoryIndex = Number.isInteger(state.displayCategoryIndex) ? state.displayCategoryIndex : 0;
  const displayCategory = state.categories[displayCategoryIndex] || state.categories[0];

  const [hasInteracted, setHasInteracted] = useState(false);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
      return true;
    } catch (error) {
      console.error("Fullscreen toggle failed", error);
      return false;
    }
  }

  async function playOpeningMusic() {
    const audio = openingMusicRef.current;
    if (!audio) {
      return;
    }

    try {
      pauseEndGameMusic();
      resetOpeningExplosion();
      await audio.play();
      setIsOpeningMusicPlaying(true);
      scheduleOpeningExplosion();
    } catch (error) {
      console.error("Opening music failed", error);
    }
  }

  function pauseOpeningMusic() {
    openingMusicRef.current?.pause();
    clearOpeningExplosionTimer();
    setIsOpeningMusicPlaying(false);
  }

  function clearOpeningExplosionTimer() {
    if (openingExplosionTimerRef.current) {
      window.clearTimeout(openingExplosionTimerRef.current);
      openingExplosionTimerRef.current = null;
    }
  }

  function resetOpeningExplosion() {
    clearOpeningExplosionTimer();
    hasStartedOpeningExplosionRef.current = false;
    setIsOpeningExplosionActive(false);

    const explosionVideo = openingExplosionVideoRef.current;
    if (explosionVideo) {
      explosionVideo.pause();
      explosionVideo.currentTime = 0;
    }

    const explosionAudio = openingExplosionAudioRef.current;
    if (explosionAudio) {
      explosionAudio.pause();
      explosionAudio.currentTime = 0;
    }

    const mainMusic = openingMusicRef.current;
    if (mainMusic) {
      mainMusic.pause();
      mainMusic.currentTime = 0;
    }
  }

  function scheduleOpeningExplosion() {
    const audio = openingMusicRef.current;
    if (!audio || audio.paused || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    clearOpeningExplosionTimer();
    const millisecondsUntilExplosion = Math.max(
      0,
      (audio.duration - audio.currentTime - OPENING_EXPLOSION_LEAD_SECONDS) * 1000,
    );
    openingExplosionTimerRef.current = window.setTimeout(startOpeningExplosionVideo, millisecondsUntilExplosion);
  }

  function startOpeningExplosionVideo() {
    if (hasStartedOpeningExplosionRef.current) {
      return;
    }
    hasStartedOpeningExplosionRef.current = true;
    setIsOpeningExplosionActive(true);

    const explosionVideo = openingExplosionVideoRef.current;
    if (explosionVideo) {
      explosionVideo.currentTime = 0;
      explosionVideo.play().catch((error) => console.error("Explosion video failed", error));
    }
  }

  function syncOpeningExplosion(event) {
    const audio = event.currentTarget;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    if (audio.duration - audio.currentTime <= OPENING_EXPLOSION_LEAD_SECONDS) {
      startOpeningExplosionVideo();
    }
  }

  async function playEndGameMusic() {
    const audio = endGameMusicRef.current;
    if (!audio) {
      return;
    }

    try {
      pauseOpeningMusic();
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.error("End game music failed", error);
    }
  }

  function pauseEndGameMusic() {
    endGameMusicRef.current?.pause();
  }

  function finishOpeningMusic() {
    if (!isOpeningMusicPlaying) {
      return; // Ignore spurious onEnded events if music wasn't actually playing
    }

    setIsOpeningMusicPlaying(false);
    clearOpeningExplosionTimer();
    startOpeningExplosionVideo();
    const explosionAudio = openingExplosionAudioRef.current;
    if (explosionAudio) {
      explosionAudio.currentTime = 0;
      explosionAudio.play().catch((error) => console.error("Explosion audio failed", error));
    }

    window.setTimeout(() => {
      setState((current) => {
        const draft = structuredClone(current);
        draft.hasStartedGame = true;
        draft.openingMusicPlaying = false;
        draft.activeQuestion = null;
        draft.displayView = "board";
        return draft;
      });
      setIsOpeningExplosionActive(false);
    }, 2100);
  }

  useEffect(() => {
    // Only attempt cross-tab commands if we are running locally (no room param)
    if (!roomId && window.opener && !window.opener.closed) {
      window.opener.__triviaDisplayWindow = window;
    }
  }, []);

  useEffect(() => {
    function handleDoubleClick() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error("dblclick fullscreen failed:", err));
      } else {
        document.exitFullscreen().catch(err => console.error("exit fullscreen failed:", err));
      }
    }
    window.addEventListener('dblclick', handleDoubleClick);
    return () => window.removeEventListener('dblclick', handleDoubleClick);
  }, []);

  useEffect(() => {
    window.__triviaDisplayControls = {
      toggleFullscreen,
      playOpeningMusic,
      pauseOpeningMusic,
      playEndGameMusic,
      pauseEndGameMusic,
      setTheme: (theme) => applyThemeWithSound(theme),
    };
    return () => {
      delete window.__triviaDisplayControls;
    };
  }, []);

  useEffect(() => {
    if (state.openingMusicPlaying) {
      playOpeningMusic();
    } else {
      pauseOpeningMusic();
    }
  }, [state.openingMusicPlaying]);

  useEffect(() => {
    if (state.displayView === "endGame") {
      playEndGameMusic();
    } else {
      pauseEndGameMusic();
    }
  }, [state.displayView]);

  useEffect(() => {
    if (!state.hasStartedGame) {
      resetOpeningExplosion();
    }
  }, [state.hasStartedGame]);

  const showQuestionTimer = activeQuestion && !activeQuestion.revealAnswer;
  const showQuestionMeta = activeQuestion && !activeQuestion.showTeams;
  const showQuestionTopbar = showQuestionTimer || showQuestionMeta;

  return (
    <div className={`display-shell${!state.hasStartedGame ? " intro-display-shell" : ""}`} onClick={() => setHasInteracted(true)}>
      {!hasInteracted && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', cursor: 'pointer', fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️ Enable Audio</h1>
          <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>Click anywhere on this screen to allow sound effects.</p>
        </div>
      )}
      {roomId && (
        <div className="remote-status-badge">
          {remoteStatus === 'connected' ? '🟢 Remote Linked' : remoteStatus === 'connecting' ? '🟡 Linking...' : '🔴 Remote Offline'}
        </div>
      )}
      <audio ref={endGameMusicRef} src={resolvedEndGameMusicSrc} />
      {!state.hasStartedGame ? (
        <section className={`intro-screen${isOpeningExplosionActive ? " exploding" : ""}`}>
          <audio
            ref={openingMusicRef}
            src="/opening-theme.mp3"
            onLoadedMetadata={scheduleOpeningExplosion}
            onDurationChange={scheduleOpeningExplosion}
            onTimeUpdate={syncOpeningExplosion}
            onEnded={finishOpeningMusic}
          />
          <audio ref={openingExplosionAudioRef} src={resolvedOpeningExplosionAudioSrc} />
          <div className="intro-card">
            <div className="intro-logo-wrap">
              <video
                className="intro-animation"
                src={resolvedOpeningAnimationSrc}
                autoPlay
                loop
                muted
                playsInline
                aria-label="TNT Trivia opening animation"
              />
            </div>
          </div>
          {activeRoomId && !settings.hidePlayerQR && (
            <div style={{ position: 'absolute', bottom: '40px', right: '40px', zIndex: 10, transform: 'scale(0.85)', transformOrigin: 'bottom right' }}>
              <PlayerJoinQR roomId={activeRoomId} />
            </div>
          )}
          <video
            ref={openingExplosionVideoRef}
            className={`intro-explosion-video${isOpeningExplosionActive ? " active" : ""}`}
            src={resolvedOpeningExplosionVideoSrc}
            preload="auto"
            muted
            playsInline
            aria-hidden="true"
          />
        </section>
      ) : (
        <div className="display-frame">
          <header className="display-header tnt-header">
            <div className="display-brand">
              <img className="display-brand-logo" src={settings.logoSrc} alt="TNT Trivia logo" />
              <img className="display-brand-name" src={settings.nameLogoSrc} alt="TNT Trivia" />
            </div>
          </header>


          <AnimatePresence mode="wait">
            {activeQuestion ? (
              <motion.section 
                key="question"
                initial={{ opacity: 0, rotateY: -90, scale: 0.6 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                className="display-jeopardy-stage"
              >
                {showQuestionTopbar && (
                  <div className="display-question-topbar">
                    {showQuestionTimer && <QuestionTimer timerKey={`${activeQuestion.question.id}-${activeQuestion.timerRestartKey}`} />}
                    {showQuestionMeta && (
                      <div className="display-question-meta">
                        <h3 className="viewer-category-title">{activeQuestion.title}</h3>
                        <p className="muted">{activeQuestion.subtitle}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="jeopardy-board-frame question-zoom-frame">
                  <QuestionCard {...activeQuestion} teams={rankedTeams} displayMode hideHeader awardMoment={state.awardMoment} />
                </div>
              </motion.section>
            ) : state.displayView === "leaderboard" ? (
              <motion.main 
                key="leaderboard"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
                className="display-leaderboard-only"
              >
                                  <LeaderboardCard teams={rankedTeams} categories={state.categories} />
              </motion.main>
            ) : state.displayView === "halftime" ? (
              <motion.main 
                key="halftime"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="display-halftime-screen"
                style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 40px' }}
              >
                <div style={{ flex: '1 1 auto', maxWidth: '1400px', width: '100%' }}>
                                    <LeaderboardCard teams={rankedTeams} categories={state.categories} />
                </div>
                <div style={{ flex: '0 0 340px' }}>
                  <HostTipCard text="Enjoying the trivia? Feel free to tip your host!" />
                </div>
              </motion.main>
            ) : state.displayView === "social" ? (
              <motion.main
                key="social"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <SocialMediaView />
              </motion.main>
            ) : state.displayView === "rules" ? (
              <motion.main
                key="rules"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="display-rules-screen"
              >
                <GameRulesView />
              </motion.main>
            ) : state.displayView === "playerJoin" ? (
              <motion.main 
                key="playerJoin"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                className="display-leaderboard-only"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
              >
                {activeRoomId ? (
                  <div style={{ transform: 'scale(1.5)' }}>
                    <PlayerJoinQR roomId={activeRoomId} />
                  </div>
                ) : (
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
                    <h2 style={{ color: '#ffea00', marginBottom: '16px' }}>Network Not Ready</h2>
                    <p>Wait for the game to connect or host to join a room.</p>
                  </div>
                )}
              </motion.main>
            ) : state.displayView === "finalInstructions" ? (
              <motion.main 
                key="instructions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="display-instructions-screen"
              >
                <FinalRoundInstructions />
              </motion.main>
            ) : state.displayView === "finalCategories" ? (
              <motion.main 
                key="finalCategories"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="display-instructions-screen"
              >
                <FinalCategoriesView questions={state.finalRound.questions} />
              </motion.main>
            ) : state.displayView === "endGame" ? (
              <motion.main 
                key="endgame"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="display-end-game-screen"
              >
                <EndGameWinners teams={rankedTeams} />
              </motion.main>
            ) : state.displayView === "recap" ? (
              <motion.main 
                key="recap"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="display-recap-screen"
              >
                <PostGameRecap teams={rankedTeams} />
              </motion.main>
            ) : (
              <motion.main 
                key="board"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="display-layout"
              >
                <section className="display-board">
                  <div className={`display-board-grid${state.displayCategoryIndex !== null ? " single-category-board" : ""}`}>
                    {(state.displayCategoryIndex !== null ? [displayCategory] : state.categories).map((category) => (
                      <div className="display-board-column" key={category.id}>
                        <div className={`display-column-title display-column-title-button${category.titleRevealed ? " revealed" : " concealed"}`}>
                          {category.titleRevealed ? category.title : "?"}
                        </div>
                        {category.questions.map((question) => (
                          <div
                            key={question.id}
                            className={`display-question-cell${question.answered ? " answered" : ""}${question.kind === "booster" ? " booster-cell" : ""}`}
                          >
                            {question.answered ? "" : getQuestionLabel(question)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
                <aside className="display-sidebar">
                                    <LeaderboardCard teams={rankedTeams} categories={state.categories} />
                </aside>
              </motion.main>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {overtakeEvent && <CrownOvertakeOverlay event={overtakeEvent} onComplete={() => setOvertakeEvent(null)} />}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
