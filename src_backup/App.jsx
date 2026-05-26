import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { STORAGE_KEY, SCREEN_PARAM, AWARD_MOMENT_DURATION_MS } from './config.js';
import { getScreenMode, numberOrZero, getTeamTotal, getClampedFinalWagerPair, parseQuestionRows, getQuestionMediaTarget } from './utils/helpers.js';
import { createDefaultState, normalizeState, resetLoadedGameState, loadState, getCurrentCategoryIndex, getActiveQuestion, getRankedTeams } from './utils/state.js';
import { saveMediaFile, inlineGameMediaRefs, storeInlineGameMediaRefs } from './utils/media.js';
import { audioEngine } from './utils/audio.js';
import { useRemoteHost } from './utils/remote.js';
import { useSettings, applyThemeToBody } from './settingsStore.js';

import RoundController from './components/RoundController.jsx';
import QuestionCard from './components/QuestionCard.jsx';
import ScoreboardPanel, { DoubleTapCell } from './components/ScoreboardPanel.jsx';
import FinalRoundPanel from './components/FinalRoundPanel.jsx';
import { updateTeamDoubleTap } from './utils/teams.js';
import QuestionModal from './components/QuestionModal.jsx';
import DisplayScreen from './components/DisplayScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import BackgroundEffects from './components/BackgroundEffects.jsx';
import AudioSetupModal from './components/AudioSetupModal.jsx';
import HotkeyGuide from './components/HotkeyGuide.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  const screen = getScreenMode();
  const isDisplayScreen = screen === "display";
  const displayWindowRef = useRef(null);
  const [state, setState] = useState(() => loadState(STORAGE_KEY));
  const { settings } = useSettings();
  const [modalQuestion, setModalQuestion] = useState(null);
  const [adminView, setAdminView] = useState("board");
  const [finalAdminQuestionIndex, setFinalAdminQuestionIndex] = useState(0);
  const [showAudioSetup, setShowAudioSetup] = useState(false);
  const [showHotkeyGuide, setShowHotkeyGuide] = useState(false);
  const undoStackRef = useRef([]);

  // WebRTC Remote Host
  const { roomId, connectionCount } = useRemoteHost(state);

  // Persist game state to localStorage (debounced)
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error("Could not save game state", error);
        window.alert("The game state could not be saved. Large media files are now stored separately; try uploading that media again.");
      }
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [state]);

  // Fast cross-tab sync for display window using BroadcastChannel
  const lastBroadcastTimeRef = useRef(0);
  
  useEffect(() => {
    const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' 
      ? new BroadcastChannel('trivia-state-sync')
      : null;

    if (isDisplayScreen) {
      if (channel) {
        channel.onmessage = (event) => {
          if (event.data?.type === 'STATE_UPDATE') {
            lastBroadcastTimeRef.current = Date.now();
            setState(event.data.state);
          }
        };
      }

      // Fallback polling for initial load or unsupported browsers
      const interval = setInterval(() => {
        // If we received a broadcast update in the last 2 seconds, localStorage might be stale
        // due to the 300ms debounce on the admin side. Skip polling to avoid a race condition.
        if (Date.now() - lastBroadcastTimeRef.current < 2000) {
          return;
        }
        try {
          const rawState = window.localStorage.getItem(STORAGE_KEY);
          if (rawState) {
            const parsed = JSON.parse(rawState);
            setState(prev => {
              if (JSON.stringify(prev) !== rawState) {
                return normalizeState(parsed);
              }
              return prev;
            });
          }
          const rawSettings = window.localStorage.getItem('trivia-scoreboard-settings');
          if (rawSettings) {
            const { theme } = JSON.parse(rawSettings);
            if (theme) applyThemeToBody(theme);
          }
        } catch (e) {}
      }, 1000);

      return () => {
        if (channel) channel.close();
        clearInterval(interval);
      };
    } else {
      // Admin screen instantly pushes updates to display screen
      if (channel) {
        channel.postMessage({ type: 'STATE_UPDATE', state });
      }
      return () => {
        if (channel) channel.close();
      };
    }
  }, [isDisplayScreen, state]);

  // Apply theme class to body whenever settings change, and push to display window
  useEffect(() => {
    applyThemeToBody(settings.theme);

    // Push to display window using the same proven pattern as fullscreen/music control
    const displayWindow = displayWindowRef.current || window.__triviaDisplayWindow;
    if (displayWindow && !displayWindow.closed && displayWindow.__triviaDisplayControls?.setTheme) {
      displayWindow.__triviaDisplayControls.setTheme(settings.theme);
    }
  }, [settings.theme]);

  useEffect(() => {
    if (!state.awardMoment) {
      return undefined;
    }

    const awardMomentId = state.awardMoment.id;
    const timeoutId = window.setTimeout(() => {
      setState((current) => {
        if (current.awardMoment?.id !== awardMomentId) {
          return current;
        }
        const draft = structuredClone(current);
        draft.awardMoment = null;
        return draft;
      });
    }, AWARD_MOMENT_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [state.awardMoment?.id]);

  const rankedTeams = useMemo(() => getRankedTeams(state.teams), [state.teams]);

  const currentCategoryIndex = useMemo(() => getCurrentCategoryIndex(state.categories), [state.categories]);

  const activeQuestion = useMemo(() => getActiveQuestion(state), [state.activeQuestion, state.categories, state.finalRound.questions]);

  useEffect(() => {
    if (currentCategoryIndex === null) {
      return;
    }
    setState((current) => {
      let changed = false;
      const draft = structuredClone(current);
      draft.teams.forEach((team) => {
        if (
          team.doubleTapStatus === "armed" &&
          team.doubleTapCategoryIndex !== null &&
          team.doubleTapCategoryIndex < currentCategoryIndex
        ) {
          team.doubleTapStatus = "used";
          team.doubleTapCategoryIndex = null;
          changed = true;
        }
      });
      return changed ? draft : current;
    });
  }, [currentCategoryIndex]);

  function updateState(updater) {
    setState((current) => {
      const clonedCurrent = structuredClone(current);
      const nextState = updater(clonedCurrent);
      undoStackRef.current.push(current);
      if (undoStackRef.current.length > 20) {
        undoStackRef.current.shift();
      }
      return nextState || clonedCurrent;
    });
  }

  function handleUndo() {
    if (undoStackRef.current.length > 0) {
      const prevState = undoStackRef.current.pop();
      setState(prevState);
      audioEngine.play('swoosh', 0.5);
    }
  }

  // Global keyboard hotkeys
  useEffect(() => {
    function handleKeyDown(event) {
      // Don't trigger hotkeys when typing in inputs
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      if (event.key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleUndo();
        return;
      }

      switch (event.key) {
        case '?':
          setShowHotkeyGuide((prev) => !prev);
          break;
        case 'Escape':
          if (modalQuestion) closeQuestionModal();
          break;
        case ' ':
          // Space — toggle reveal answer
          if (state.activeQuestion) {
            event.preventDefault();
            setRevealAnswer(!state.activeQuestion.revealAnswer);
          }
          break;
        case 'r':
        case 'R':
          // R — restart question timer
          if (state.activeQuestion) restartQuestionTimer();
          break;
        case 'b':
        case 'B':
          // B — show board on display
          showBoardOnDisplay();
          break;
        case 'l':
        case 'L':
          // L — show leaderboard on display
          showLeaderboardOnDisplay();
          break;
        case '1':
          // 1 — round stage: question
          if (state.activeQuestion) setRoundStage('question');
          break;
        case '2':
          // 2 — round stage: answer
          if (state.activeQuestion) setRoundStage('answer');
          break;
        case '3':
          // 3 — round stage: teams
          if (state.activeQuestion) setRoundStage('teams');
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalQuestion, state.activeQuestion]);

  function resetGame() {
    const confirmed = window.confirm("Reset the board, teams, wagers, and scores?");
    if (!confirmed) {
      return;
    }
    setState(createDefaultState());
    setAdminView("board");
    setModalQuestion(null);
  }

  function startGameOver() {
    const confirmed = window.confirm("Start this game over? Questions, answers, and media will stay loaded.");
    if (!confirmed) {
      return;
    }
    updateState((draft) => {
      draft.categories.forEach(c => {
        c.titleRevealed = false;
        c.questions.forEach(q => {
          q.answered = false;
          q.awardedTeamIds = [];
        });
      });
      draft.teams.forEach(t => {
        t.tb = 0; t.dbl = 0; t.doubleTapStatus = "ready"; t.doubleTapCategoryIndex = null;
        t.rounds = [0, 0, 0, 0, 0, 0]; t.f1 = 0; t.f2 = 0; t.boost = 0;
      });
      draft.activeQuestion = null;
      draft.awardMoment = null;
      draft.displayView = "board";
      draft.displayCategoryIndex = 0;
      draft.hasStartedGame = false;
      draft.openingMusicPlaying = false;
      if (draft.finalRound && draft.finalRound.questions) {
        draft.finalRound.questions.forEach(q => {
          q.wagers = {}; q.correctTeamIds = [];
        });
      }
      return draft;
    });
    setAdminView("board");
    setModalQuestion(null);
  }

  async function exportGame() {
    try {
      const exportState = await inlineGameMediaRefs(state);
      const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tnt-trivia-game.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Could not export game state", error);
      window.alert("The game could not be exported.");
    }
  }

  function importGame(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const importedState = await storeInlineGameMediaRefs(JSON.parse(reader.result));
        setState(normalizeState(importedState));
        setModalQuestion(null);
      } catch (error) {
        console.error(error);
        window.alert("That file could not be imported.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function importQuestionsSpreadsheet(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      const imported = parseQuestionRows(rows);

      updateState((draft) => {
        imported.forEach((entry) => {
          if (entry.kind === "category") {
            const category = draft.categories[entry.categoryIndex];
            if (category && entry.title) {
              category.title = entry.title;
            }
            return;
          }

          if (entry.kind === "final") {
            const finalQuestion = draft.finalRound.questions[entry.questionIndex];
            if (!finalQuestion) {
              return;
            }
            finalQuestion.title = entry.title || finalQuestion.title;
            finalQuestion.text = entry.prompt || finalQuestion.text;
            finalQuestion.answer = entry.answer || finalQuestion.answer;
            return;
          }

          const category = draft.categories[entry.categoryIndex];
          if (category && entry.categoryTitle) {
            category.title = entry.categoryTitle;
          }

          const question = category?.questions?.[entry.questionIndex];
          if (!question) {
            return;
          }
          question.text = entry.prompt || question.text;
          question.answer = entry.answer || question.answer;
        });
        return draft;
      });
    } catch (error) {
      console.error(error);
      window.alert("The spreadsheet could not be imported. Use columns like Category, Value, Prompt, and Answer.");
    }

    event.target.value = "";
  }

  async function importQuestionMediaFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    try {
      const importedFiles = await Promise.all(
        files.map(async (file) => {
          const target = getQuestionMediaTarget(file);
          if (!target) {
            return null;
          }
          return {
            ...target,
            mediaRef: await saveMediaFile(file),
          };
        }),
      );
      const matchedFiles = importedFiles.filter(Boolean);

      if (matchedFiles.length === 0) {
        window.alert("No media files matched a round and point value. Use names like 1.10.png, 2-60.mp3, Round 3 boost.mp4, or 4_20 question.jpg.");
        event.target.value = "";
        return;
      }

      updateState((draft) => {
        matchedFiles.forEach((entry) => {
          const question = draft.categories?.[entry.categoryIndex]?.questions?.[entry.questionIndex];
          if (!question) {
            return;
          }
          if (entry.mediaType === "image") {
            question.imageUrl = entry.mediaRef;
          }
          if (entry.mediaType === "audio") {
            question.audioUrl = entry.mediaRef;
          }
          if (entry.mediaType === "video") {
            question.videoUrl = entry.mediaRef;
          }
        });
        return draft;
      });
    } catch (error) {
      console.error(error);
      window.alert("The media files could not be imported.");
    }

    event.target.value = "";
  }

  function openQuestionModal(categoryIndex, questionIndex) {
    audioEngine.play('swoosh');
    setModalQuestion({ categoryIndex, questionIndex });
    setState((current) => {
      const draft = structuredClone(current);
      draft.activeQuestion = { type: "board", categoryIndex, questionIndex, revealAnswer: false, showTeams: false, fullscreenImage: false, mediaPlayTrigger: 0, timerRestartKey: 0, selectedTeamIds: [] };
      draft.displayView = "board";
      return draft;
    });
  }

  function closeQuestionModal() {
    if (!modalQuestion) {
      return;
    }
    audioEngine.play('swoosh');
    const { categoryIndex, questionIndex } = modalQuestion;
    setState((current) => {
      const draft = structuredClone(current);
      const question = draft.categories?.[categoryIndex]?.questions?.[questionIndex];
      if (question) {
        question.answered = true;
      }
      draft.activeQuestion = null;
      draft.displayView = "board";
      return draft;
    });
    setModalQuestion(null);
  }

  function applyBoardScore(teamIds, categoryIndex, question) {
    updateState((draft) => {
      if (!Array.isArray(teamIds) || teamIds.length === 0) {
        return draft;
      }

      const draftQuestion = draft.categories?.[categoryIndex]?.questions?.find((entry) => entry.id === question.id);
      if (!draftQuestion) {
        return draft;
      }

      const awardedTeamIds = Array.isArray(draftQuestion.awardedTeamIds) ? draftQuestion.awardedTeamIds : [];
      const nextTeamIds = [...new Set(teamIds)].filter(
        (teamId) => draft.teams.some((team) => team.id === teamId) && !awardedTeamIds.includes(teamId),
      );
      if (nextTeamIds.length === 0) {
        return draft;
      }

      const recipients = [];
      nextTeamIds.forEach((teamId) => {
        const team = draft.teams.find((entry) => entry.id === teamId);
        if (!team) {
          return;
        }

        if (draftQuestion.kind === "booster") {
          const delta = draftQuestion.points;
          team.boost += delta;
          recipients.push({ teamId, name: team.name, delta, total: getTeamTotal(team) });
          return;
        }

        const multiplier =
          team.doubleTapStatus === "armed" && team.doubleTapCategoryIndex === categoryIndex ? 2 : 1;
        const delta = draftQuestion.points * multiplier;
        team.rounds[categoryIndex] += delta;
        recipients.push({ teamId, name: team.name, delta, total: getTeamTotal(team) });
      });

      if (nextTeamIds.length > 0) {
        audioEngine.play('award');
      }

      draftQuestion.awardedTeamIds = [...new Set([...awardedTeamIds, ...nextTeamIds])];
      draft.awardMoment = {
        id: crypto.randomUUID(),
        title: draftQuestion.kind === "booster" ? "Booster Awarded" : `${draftQuestion.points} Point Question`,
        recipients,
      };
      if (
        draft.activeQuestion?.type === "board" &&
        draft.activeQuestion.categoryIndex === categoryIndex &&
        draft.activeQuestion.questionIndex === draft.categories?.[categoryIndex]?.questions?.findIndex((entry) => entry.id === draftQuestion.id)
      ) {
        draft.activeQuestion.revealAnswer = false;
        draft.activeQuestion.showTeams = true;
        draft.activeQuestion.selectedTeamIds = [];
      }
      return draft;
    });
  }

  function setActiveFinalQuestion(questionIndex) {
    audioEngine.play('swoosh');
    updateState((draft) => {
      draft.activeQuestion = { type: "final", questionIndex, revealAnswer: false, showTeams: false, fullscreenImage: false, mediaPlayTrigger: 0, timerRestartKey: 0, selectedTeamIds: [] };
      draft.displayView = "board";
      return draft;
    });
  }

  function setRevealAnswer(revealAnswer) {
    if (revealAnswer) audioEngine.play('ding');
    updateState((draft) => {
      if (!draft.activeQuestion) {
        return draft;
      }
      draft.activeQuestion.revealAnswer = revealAnswer;
      if (revealAnswer) {
        draft.activeQuestion.showTeams = false;
        draft.activeQuestion.fullscreenImage = false;
      }
      return draft;
    });
  }

  function setShowTeams(showTeams) {
    updateState((draft) => {
      if (!draft.activeQuestion) {
        return draft;
      }
      draft.activeQuestion.showTeams = showTeams;
      if (showTeams) {
        draft.activeQuestion.revealAnswer = false;
        draft.activeQuestion.fullscreenImage = false;
      }
      return draft;
    });
  }

  function setRoundStage(stage) {
    updateState((draft) => {
      if (!draft.activeQuestion) {
        return draft;
      }

      draft.displayView = "board";
      if (stage === "question") {
        draft.activeQuestion.revealAnswer = false;
        draft.activeQuestion.showTeams = false;
        draft.activeQuestion.fullscreenImage = false;
        draft.activeQuestion.timerRestartKey = numberOrZero(draft.activeQuestion.timerRestartKey) + 1;
      }
      if (stage === "answer") {
        draft.activeQuestion.revealAnswer = true;
        draft.activeQuestion.showTeams = false;
        draft.activeQuestion.fullscreenImage = false;
      }
      if (stage === "teams") {
        draft.activeQuestion.revealAnswer = false;
        draft.activeQuestion.showTeams = true;
        draft.activeQuestion.fullscreenImage = false;
      }
      return draft;
    });
  }

  function restartQuestionTimer() {
    updateState((draft) => {
      if (!draft.activeQuestion) {
        return draft;
      }
      draft.activeQuestion.timerRestartKey = numberOrZero(draft.activeQuestion.timerRestartKey) + 1;
      return draft;
    });
  }

  function setFullscreenImage(fullscreenImage) {
    updateState((draft) => {
      if (!draft.activeQuestion) {
        return draft;
      }
      draft.activeQuestion.fullscreenImage = fullscreenImage;
      return draft;
    });
  }

  function playActiveQuestionMedia() {
    updateState((draft) => {
      if (!draft.activeQuestion) {
        return draft;
      }
      draft.activeQuestion.mediaPlayTrigger = numberOrZero(draft.activeQuestion.mediaPlayTrigger) + 1;
      return draft;
    });
  }

  function setAwardSelectedTeamIds(selectedTeamIds) {
    updateState((draft) => {
      if (!draft.activeQuestion) {
        return draft;
      }
      draft.activeQuestion.selectedTeamIds = selectedTeamIds;
      return draft;
    });
  }

  function showBoardOnDisplay() {
    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "board";
      return draft;
    });
  }

  function showLeaderboardOnDisplay() {
    audioEngine.play('swoosh');
    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "leaderboard";
      return draft;
    });
  }

  function showSocialOnDisplay() {
    audioEngine.play('swoosh');
    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "social";
      return draft;
    });
  }

  function showHalftimeOnDisplay() {
    audioEngine.play('swoosh');
    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "halftime";
      return draft;
    });
  }

  function showFinalInstructionsOnDisplay() {
    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "finalInstructions";
      return draft;
    });
  }

  function showRulesOnDisplay() {
    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "rules";
      return draft;
    });
  }

  function showEndGameOnDisplay() {
    const controls = (displayWindowRef.current || window.__triviaDisplayWindow)?.__triviaDisplayControls;
    controls?.playEndGameMusic?.();

    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "endGame";
      draft.openingMusicPlaying = false;
      return draft;
    });
  }

  function showPostGameRecapOnDisplay() {
    updateState((draft) => {
      draft.activeQuestion = null;
      draft.displayView = "recap";
      draft.openingMusicPlaying = false;
      return draft;
    });
  }

  function showDisplayCategory(categoryIndex) {
    updateState((draft) => {
      draft.displayCategoryIndex = categoryIndex;
      draft.activeQuestion = null;
      draft.displayView = "board";
      return draft;
    });
  }

  function applyFinalResults(questionIndex) {
    updateState((draft) => {
      const question = draft.finalRound.questions[questionIndex];
      if (!question) {
        return draft;
      }

      draft.teams.forEach((team) => {
        const wagerPair = getClampedFinalWagerPair(draft.finalRound, team);
        draft.finalRound.questions.forEach((entry, index) => {
          entry.wagers[team.id] = wagerPair[index];
        });
        const wager = wagerPair[questionIndex];
        const delta = question.correctTeamIds.includes(team.id) ? wager : wager * -1;
        if (questionIndex === 0) {
          team.f1 = delta;
        } else {
          team.f2 = delta;
        }
      });
      return draft;
    });
  }

  function openDisplayScreen() {
    displayWindowRef.current = openOrGetDisplayWindow();
  }

  async function magicDisplayLaunch() {
    try {
      if ('getScreenDetails' in window) {
        const screenDetails = await window.getScreenDetails();
        // Find the first external screen, or default to the current screen if none attached
        const externalScreen = screenDetails.screens.find((s) => s !== screenDetails.currentScreen) || screenDetails.currentScreen;
        
        const features = [
          `left=${externalScreen.availLeft}`,
          `top=${externalScreen.availTop}`,
          `width=${externalScreen.availWidth}`,
          `height=${externalScreen.availHeight}`,
          `popup=1`,
          `fullscreen=1`,
        ].join(',');

        const win = window.open(getDisplayUrl(), "trivia-display", features);
        displayWindowRef.current = win;
      } else {
        alert("Your browser doesn't support the Multi-Screen Window Placement API. Falling back to normal open.");
        openDisplayScreen();
      }
    } catch (err) {
      console.error("Magic launch failed:", err);
      openDisplayScreen();
    }
  }

  function getDisplayUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set(SCREEN_PARAM, "display");
    return url.toString();
  }

  function openOrGetDisplayWindow() {
    const knownWindow = displayWindowRef.current || window.__triviaDisplayWindow;
    if (knownWindow && !knownWindow.closed) {
      displayWindowRef.current = knownWindow;
      return knownWindow;
    }

    displayWindowRef.current = window.open(getDisplayUrl(), "trivia-display");
    return displayWindowRef.current;
  }

  async function toggleDisplayFullscreen() {
    const displayWindow = openOrGetDisplayWindow();
    
    // Attempt synchronously first to preserve the user gesture required for Fullscreen API
    if (displayWindow && displayWindow.__triviaDisplayControls) {
      const succeeded = await displayWindow.__triviaDisplayControls.toggleFullscreen();
      if (!succeeded) {
        window.alert("The browser blocked fullscreen. Please click the button again.");
      }
      return;
    }

    // Fallback (this usually loses the user gesture, causing it to be blocked)
    const controls = await waitForDisplayControls(displayWindow);
    if (!controls) {
      window.alert("The display screen is still loading. Try Display Fullscreen again in a moment.");
      return;
    }

    const succeeded = await controls.toggleFullscreen();
    if (!succeeded) {
      window.alert("The browser blocked fullscreen because the window was still loading. Click Display Fullscreen again now that it is open.");
    }
  }

  function waitForDisplayControls(displayWindow) {
    return new Promise((resolve) => {
      let attempts = 0;

      function checkControls() {
        const controls = displayWindow?.__triviaDisplayControls;
        if (controls) {
          resolve(controls);
          return;
        }
        attempts += 1;
        if (attempts >= 10) {
          resolve(null);
          return;
        }
        window.setTimeout(checkControls, 100);
      }

      checkControls();
    });
  }

  function setOpeningMusicPlaying(isPlaying) {
    const controls = (displayWindowRef.current || window.__triviaDisplayWindow)?.__triviaDisplayControls;
    if (isPlaying) {
      controls?.playOpeningMusic?.();
    } else {
      controls?.pauseOpeningMusic?.();
    }

    updateState((draft) => {
      draft.openingMusicPlaying = isPlaying;
      return draft;
    });
  }

  function startOpeningGame() {
    displayWindowRef.current?.__triviaDisplayControls?.pauseOpeningMusic?.();
    updateState((draft) => {
      draft.hasStartedGame = true;
      draft.openingMusicPlaying = false;
      draft.activeQuestion = null;
      draft.displayView = "board";
      return draft;
    });
  }

  function showOpeningScreen() {
    updateState((draft) => {
      draft.hasStartedGame = false;
      draft.activeQuestion = null;
      draft.displayView = "board";
      return draft;
    });
  }

  if (isDisplayScreen) {
    return (
      <ErrorBoundary>
        <BackgroundEffects />
        <DisplayScreen state={state} setState={setState} updateState={updateState} />
      </ErrorBoundary>
    );
  }

  return (
    <>
      <BackgroundEffects />
      <div className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">TNT Trivia Game Control Room</p>
            <h1>TNT Control Program</h1>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={magicDisplayLaunch}>Magic Launch Display</button>
            <button className="secondary-button" onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('screen', 'display');
              url.searchParams.set('room', roomId);
              navigator.clipboard.writeText(url.toString());
              alert(`Copied Remote Display URL: ${url.toString()}`);
            }}>Copy Remote Link</button>
            <span className="muted" style={{ padding: '0 8px', fontSize: '0.9em' }}>
              {connectionCount > 0 ? `🟢 ${connectionCount} Connected` : '⚪ Remote Ready'}
            </span>
            <div style={{ flexBasis: '100%', height: 0 }}></div>
            <button className="secondary-button" onClick={toggleDisplayFullscreen}>Display Fullscreen</button>
            <button className="secondary-button" onClick={() => setOpeningMusicPlaying(!state.openingMusicPlaying)}>
              {state.openingMusicPlaying ? "Pause Open Music" : "Start Open Music"}
            </button>
            <button className="primary-button" onClick={startOpeningGame}>Start Game</button>
            <button className="ghost-button" onClick={showOpeningScreen}>Opening Screen</button>
            <button className={adminView === "board" ? "primary-button" : "ghost-button"} onClick={() => setAdminView("board")}>Board</button>
            <button className={adminView === "scoreboard" ? "primary-button" : "ghost-button"} onClick={() => setAdminView("scoreboard")}>Scoreboard</button>
            <button className={adminView === "final" ? "primary-button" : "ghost-button"} onClick={() => setAdminView("final")}>Final Round</button>
            <button className={adminView === "settings" ? "primary-button" : "ghost-button"} onClick={() => setAdminView("settings")}>Settings</button>
            <button className="ghost-button" onClick={() => setShowAudioSetup(true)}>Audio Setup</button>
            <button className="ghost-button" onClick={startGameOver}>Start Game Over</button>
            <button className="ghost-button" onClick={resetGame}>Reset Game</button>
            <button className="secondary-button" onClick={exportGame}>Export Game JSON</button>
            <label className="secondary-button file-label" htmlFor="importFile">Import Game JSON</label>
            <input id="importFile" type="file" accept=".json,application/json" hidden onChange={importGame} />
          </div>
        </header>

        <main className={`layout${adminView === "scoreboard" ? " layout-full" : ""}`}>
          {adminView === "board" ? (
            !state.hasStartedGame ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px', textAlign: 'center', backgroundColor: 'var(--panel-bg)', borderRadius: '12px', padding: '40px', flex: '1 1 auto' }}>
                <div style={{ width: '400px', maxWidth: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', position: 'relative' }}>
                   <video src={settings.openingAnimationSrc} autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} />
                </div>
                <h2>Opening Screen is Live</h2>
                <p className="muted" style={{ maxWidth: '400px' }}>The audience display is showing the intro animation. Click Start Game below or in the top menu to reveal the board.</p>
                <button className="primary-button" style={{ fontSize: '1.2rem', padding: '16px 32px' }} onClick={startOpeningGame}>Start Game Now</button>

                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                  <label className="secondary-button file-label" htmlFor="openingQuestionSpreadsheet">Import Question Spreadsheet</label>
                  <input
                    id="openingQuestionSpreadsheet"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    hidden
                    onChange={importQuestionsSpreadsheet}
                  />
                  <label className="secondary-button file-label" htmlFor="openingQuestionMediaFiles">Import Question Media</label>
                  <input
                    id="openingQuestionMediaFiles"
                    type="file"
                    accept="image/*,audio/*,video/*"
                    multiple
                    hidden
                    onChange={importQuestionMediaFiles}
                  />
                </div>
              </div>
            ) : (
              <GameBoard
                categories={state.categories}
                displayCategoryIndex={state.displayCategoryIndex}
                updateState={updateState}
                importQuestionsSpreadsheet={importQuestionsSpreadsheet}
                importQuestionMediaFiles={importQuestionMediaFiles}
                showDisplayCategory={showDisplayCategory}
                openQuestionModal={openQuestionModal}
              />
            )
          ) : adminView === "scoreboard" ? (
            <ScoreboardPanel
              teams={rankedTeams}
              setState={setState}
              updateState={updateState}
              currentCategoryIndex={currentCategoryIndex}
              fullscreen
            />
          ) : adminView === "final" ? (
            <FinalRoundPanel
              state={state}
              updateState={updateState}
              setActiveFinalQuestion={setActiveFinalQuestion}
              applyFinalResults={applyFinalResults}
              selectedQuestionIndex={finalAdminQuestionIndex}
              setSelectedQuestionIndex={setFinalAdminQuestionIndex}
            />
          ) : adminView === "settings" ? (
            <SettingsPanel updateState={updateState} />
          ) : null}

          {adminView !== "scoreboard" && (
          <aside className="stack">
            {adminView !== "scoreboard" && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="section-label">Audience Preview</p>
                  <h2>Display Feed</h2>
                </div>
                <div className="hero-actions">
                  {activeQuestion && (
                    <>
                      <button
                        className="secondary-button"
                        onClick={() => setRevealAnswer(!state.activeQuestion?.revealAnswer)}
                      >
                        {state.activeQuestion?.revealAnswer ? "Hide Answer" : "Reveal Answer"}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => setShowTeams(!state.activeQuestion?.showTeams)}
                      >
                        {state.activeQuestion?.showTeams ? "Hide Teams" : "Show Teams"}
                      </button>
                      {activeQuestion.question.imageUrl && (
                        <button
                          className="secondary-button"
                          onClick={() => setFullscreenImage(!state.activeQuestion?.fullscreenImage)}
                        >
                          {state.activeQuestion?.fullscreenImage ? "Close Image Fullscreen" : "Show Image Fullscreen"}
                        </button>
                      )}
                      {(activeQuestion.question.audioUrl || activeQuestion.question.videoUrl) && (
                        <button className="secondary-button" onClick={playActiveQuestionMedia}>
                          Play Media
                        </button>
                      )}
                    </>
                  )}
                  <button
                    className="ghost-button"
                    onClick={showBoardOnDisplay}
                  >
                    Show Board
                  </button>
                  <button
                    className="ghost-button"
                    onClick={showHalftimeOnDisplay}
                  >
                    Half Time
                  </button>
                  <button
                    className="ghost-button"
                    onClick={showLeaderboardOnDisplay}
                  >
                    Show Leaderboard
                  </button>
                  <button
                    className="ghost-button"
                    onClick={showSocialOnDisplay}
                  >
                    Show Social Media
                  </button>
                  <button
                    className="ghost-button"
                    onClick={showRulesOnDisplay}
                  >
                    Game Rules
                  </button>
                  <button
                    className="ghost-button"
                    onClick={showFinalInstructionsOnDisplay}
                  >
                    Final Round Instructions
                  </button>
                  <button
                    className="ghost-button"
                    onClick={showEndGameOnDisplay}
                  >
                    End of Game
                  </button>
                  <button
                    className="ghost-button"
                    onClick={showPostGameRecapOnDisplay}
                  >
                    Post Game Recap
                  </button>
                </div>
              </div>

              {activeQuestion && (
                <RoundController
                  activeQuestion={activeQuestion}
                  setRoundStage={setRoundStage}
                  restartQuestionTimer={restartQuestionTimer}
                  playActiveQuestionMedia={playActiveQuestionMedia}
                  showLeaderboardOnDisplay={showLeaderboardOnDisplay}
                  showBoardOnDisplay={showBoardOnDisplay}
                />
              )}

              {!state.hasStartedGame ? (
                <div className="question-viewer-empty">
                  <h3>Opening Screen</h3>
                  <p>The audience display is showing the intro animation.</p>
                </div>
              ) : !activeQuestion ? (
                <div className="question-viewer-empty">
                  <h3>Board is live</h3>
                  <p>The audience display will show the board until you open a question.</p>
                </div>
              ) : (
                <QuestionCard {...activeQuestion} teams={rankedTeams} />
              )}
            </section>
            )}

            <section className="panel doubletap-sidebar-panel">
              <div className="panel-header">
                <div>
                  <p className="section-label">Round {currentCategoryIndex !== null ? currentCategoryIndex + 1 : '—'}</p>
                  <h2>Double Tap</h2>
                </div>
              </div>
              <div className="doubletap-sidebar-list">
                {rankedTeams.map((team) => (
                  <div key={team.id} className="doubletap-sidebar-row">
                    <span className="doubletap-sidebar-name">{team.name}</span>
                    <DoubleTapCell
                      team={team}
                      currentCategoryIndex={currentCategoryIndex}
                      onToggle={() => updateTeamDoubleTap(setState, team.id, currentCategoryIndex)}
                    />
                  </div>
                ))}
              </div>
            </section>

          </aside>
          )}
        </main>

        {modalQuestion && (
          <QuestionModal
            state={state}
            modalQuestion={modalQuestion}
            closeModal={closeQuestionModal}
            updateState={updateState}
            applyBoardScore={applyBoardScore}
            setRevealAnswer={setRevealAnswer}
            setShowTeams={setShowTeams}
            setFullscreenImage={setFullscreenImage}
            playActiveQuestionMedia={playActiveQuestionMedia}
            setAwardSelectedTeamIds={setAwardSelectedTeamIds}
            setRoundStage={setRoundStage}
            restartQuestionTimer={restartQuestionTimer}
            showLeaderboardOnDisplay={showLeaderboardOnDisplay}
            showBoardOnDisplay={showBoardOnDisplay}
          />
        )}
        
        {showAudioSetup && (
          <AudioSetupModal onClose={() => setShowAudioSetup(false)} />
        )}
        {showHotkeyGuide && (
          <HotkeyGuide onClose={() => setShowHotkeyGuide(false)} />
        )}
      </div>
    </>
  );
}
