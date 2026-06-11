import { STANDARD_POINT_VALUES, BOOSTER_POINTS } from '../config.js';
import { numberOrZero, normalizeIdList, normalizeWagerMap, clampFinalWagers, getTeamTotal, generateUUID } from './helpers.js';

export function createDefaultState() {
  return {
    categories: Array.from({ length: 6 }, (_, index) => ({
      id: generateUUID(),
      title: `Category ${index + 1}`,
      titleRevealed: false,
      questions: createDefaultQuestions(),
    })),
    teams: [createTeam("Team 1"), createTeam("Team 2"), createTeam("Team 3")],
    activeQuestion: null,
    awardMoment: null,
    displayView: "board",
    displayCategoryIndex: 0,
    displayTheme: 'theme-classic',
    hasStartedGame: false,
    openingMusicPlaying: false,
    finalRound: {
      questions: [
        createFinalQuestion("Final Question 1"),
        createFinalQuestion("Final Question 2"),
      ],
    },
    submittedAnswers: {},
    teamClaims: {}
  };
}



export function createTeam(name) {
  return {
    id: generateUUID(),
    name,
    tb: 0,
    dbl: 0,
    doubleTapStatus: "ready",
    doubleTapCategoryIndex: null,
    rounds: [0, 0, 0, 0, 0, 0],
    f1: 0,
    f2: 0,
    boost: 0,
  };
}

export function createFinalQuestion(title) {
  return {
    id: generateUUID(),
    title,
    text: "",
    answer: "",
    imageUrl: "",
    audioUrl: "",
    videoUrl: "",
    wagers: {},
    correctTeamIds: [],
  };
}

export function loadState(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? normalizeState(JSON.parse(raw)) : createDefaultState();
  } catch (error) {
    console.error("Could not load saved state", error);
    return createDefaultState();
  }
}

export function normalizeState(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const fallback = createDefaultState();
  const categories = Array.isArray(source.categories) && source.categories.length === 6
    ? source.categories.map((categoryCandidate, categoryIndex) => {
        const category = categoryCandidate && typeof categoryCandidate === "object" ? categoryCandidate : {};
        return {
          id: category.id || generateUUID(),
          title: category.title || `Category ${categoryIndex + 1}`,
          titleRevealed: Boolean(category.titleRevealed),
          questions: normalizeQuestions(category.questions),
        };
      })
    : fallback.categories;
  const teams = Array.isArray(source.teams) && source.teams.length
    ? source.teams.map((teamCandidate, teamIndex) => {
        const team = teamCandidate && typeof teamCandidate === "object" ? teamCandidate : {};
        return {
          id: team.id || generateUUID(),
          name: team.name || `Team ${teamIndex + 1}`,
          tb: numberOrZero(team.tb),
          dbl: numberOrZero(team.dbl),
          doubleTapStatus: normalizeDoubleTapStatus(team),
          doubleTapCategoryIndex: normalizeDoubleTapCategoryIndex(team),
          rounds: Array.from({ length: 6 }, (_, index) => numberOrZero(team.rounds?.[index])),
          f1: numberOrZero(team.f1),
          f2: numberOrZero(team.f2),
          boost: numberOrZero(team.boost),
          onFire: Boolean(team.onFire),
          sweptCount: numberOrZero(team.sweptCount),
        };
      })
    : fallback.teams;
  const finalRound = {
    questions: Array.isArray(source.finalRound?.questions) && source.finalRound.questions.length === 2
      ? source.finalRound.questions.map((questionCandidate, index) => {
          const question = questionCandidate && typeof questionCandidate === "object" ? questionCandidate : {};
          return {
            id: question.id || generateUUID(),
            title: question.title || `Final Question ${index + 1}`,
            text: question.text || "",
            answer: question.answer || "",
            imageUrl: question.imageUrl || "",
            audioUrl: question.audioUrl || "",
            videoUrl: question.videoUrl || "",
            wagers: normalizeWagerMap(question.wagers),
            correctTeamIds: normalizeIdList(question.correctTeamIds),
          };
        })
      : fallback.finalRound.questions,
  };

  clampFinalWagers(finalRound, teams);

  const ALL_THEMES = [
    'theme-classic', 'theme-blue', 'theme-cyberpunk', 'theme-dark',
    'theme-christmas', 'theme-halloween', 'theme-stpatricks', 'theme-july4th', 'theme-thanksgiving'
  ];

  return {
    categories,
    teams,
    activeQuestion: normalizeActiveQuestion(source.activeQuestion, categories, finalRound.questions),
    awardMoment: normalizeAwardMoment(source.awardMoment, teams),
    displayView: normalizeDisplayView(source.displayView),
    displayCategoryIndex: normalizeDisplayCategoryIndex(source.displayCategoryIndex),
    displayTheme: ALL_THEMES.includes(source.displayTheme) ? source.displayTheme : 'theme-classic',
    hasStartedGame: Boolean(source.hasStartedGame),
    openingMusicPlaying: Boolean(source.openingMusicPlaying),
    finalRound,
    submittedAnswers: source.submittedAnswers && typeof source.submittedAnswers === "object" ? source.submittedAnswers : fallback.submittedAnswers,
    teamClaims: source.teamClaims && typeof source.teamClaims === "object" ? source.teamClaims : fallback.teamClaims
  };
}

export function createDefaultQuestions() {
  return [
    ...STANDARD_POINT_VALUES.map((points) => createBoardQuestion(points, "standard")),
    createBoardQuestion(BOOSTER_POINTS, "booster"),
  ];
}

export function createBoardQuestion(points, kind) {
  return {
    id: generateUUID(),
    points,
    kind,
    text: "",
    answer: "",
    imageUrl: "",
    audioUrl: "",
    videoUrl: "",
    answered: false,
    awardedTeamIds: [],
  };
}

export function normalizeQuestions(candidateQuestions) {
  const questions = Array.isArray(candidateQuestions) ? candidateQuestions : [];
  const usedIds = new Set();
  const normalized = STANDARD_POINT_VALUES.map((points, questionIndex) => {
    const indexedQuestion = questions[questionIndex];
    const matchingQuestion = questions.find(
      (question, index) =>
        index < 6 &&
        question?.kind !== "booster" &&
        numberOrZero(question?.points) === points,
    );
    const sourceQuestion = indexedQuestion?.kind !== "booster" ? indexedQuestion : matchingQuestion;
    const id = sourceQuestion?.id && !usedIds.has(sourceQuestion.id) ? sourceQuestion.id : generateUUID();
    usedIds.add(id);

    return {
      id,
      points,
      kind: "standard",
      text: sourceQuestion?.text || "",
      answer: sourceQuestion?.answer || "",
      imageUrl: sourceQuestion?.imageUrl || "",
      audioUrl: sourceQuestion?.audioUrl || "",
      videoUrl: sourceQuestion?.videoUrl || "",
      answered: Boolean(sourceQuestion?.answered),
      awardedTeamIds: normalizeIdList(sourceQuestion?.awardedTeamIds),
    };
  });

  const boosterQuestion =
    questions[6]?.kind === "booster"
      ? questions[6]
      : questions.find((question) => question?.kind === "booster");
  const boosterId = boosterQuestion?.id && !usedIds.has(boosterQuestion.id) ? boosterQuestion.id : generateUUID();

  normalized.push({
    id: boosterId,
    points: BOOSTER_POINTS,
    kind: "booster",
    text: boosterQuestion?.text || "",
    answer: boosterQuestion?.answer || "",
    imageUrl: boosterQuestion?.imageUrl || "",
    audioUrl: boosterQuestion?.audioUrl || "",
    videoUrl: boosterQuestion?.videoUrl || "",
    answered: Boolean(boosterQuestion?.answered),
    awardedTeamIds: normalizeIdList(boosterQuestion?.awardedTeamIds),
  });

  return normalized;
}

export function normalizeDoubleTapStatus(team) {
  if (team?.doubleTapStatus === "armed" || team?.doubleTapStatus === "used" || team?.doubleTapStatus === "ready") {
    return team.doubleTapStatus;
  }
  if (Boolean(team?.doubleTapUsed) || numberOrZero(team?.dbl) > 1) {
    return "used";
  }
  if (Boolean(team?.doubleTapArmed) || numberOrZero(team?.dbl) === 1) {
    return "armed";
  }
  return "ready";
}

export function normalizeDoubleTapCategoryIndex(team) {
  const parsed = Number(team?.doubleTapCategoryIndex);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < 6 ? parsed : null;
}

export function normalizeDisplayCategoryIndex(index) {
  const parsed = Number(index);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < 6 ? parsed : 0;
}

export function normalizeDisplayView(view) {
  return ["board", "leaderboard", "halftime", "finalInstructions", "finalCategories", "endGame", "recap", "rules", "social", "playerJoin"].includes(view) ? view : "board";
}

export function normalizeAwardMoment(awardMoment, teams) {
  if (!awardMoment || typeof awardMoment !== "object") {
    return null;
  }

  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  const recipients = Array.isArray(awardMoment.recipients)
    ? awardMoment.recipients.flatMap((recipient) => {
        if (!recipient || typeof recipient !== "object" || typeof recipient.teamId !== "string") {
          return [];
        }
        return [{
          teamId: recipient.teamId,
          name: String(recipient.name || teamNameById.get(recipient.teamId) || "Team"),
          delta: numberOrZero(recipient.delta),
          total: numberOrZero(recipient.total),
        }];
      })
    : [];

  if (!recipients.length) {
    return null;
  }

  return {
    id: String(awardMoment.id || generateUUID()),
    title: String(awardMoment.title || "Points Awarded"),
    recipients,
  };
}

export function normalizeActiveQuestion(activeQuestion, categories, finalQuestions) {
  if (!activeQuestion || typeof activeQuestion !== "object") {
    return null;
  }

  const showTeams = Boolean(activeQuestion.showTeams);
  const baseActiveQuestion = {
    revealAnswer: Boolean(activeQuestion.revealAnswer) && !showTeams,
    showTeams,
    fullscreenImage: Boolean(activeQuestion.fullscreenImage),
    mediaPlayTrigger: numberOrZero(activeQuestion.mediaPlayTrigger),
    timerRestartKey: numberOrZero(activeQuestion.timerRestartKey),
    selectedTeamIds: normalizeIdList(activeQuestion.selectedTeamIds),
  };

  if (activeQuestion.type === "board") {
    const categoryIndex = Number(activeQuestion.categoryIndex);
    const questionIndex = Number(activeQuestion.questionIndex);
    if (
      !Number.isInteger(categoryIndex) ||
      !Number.isInteger(questionIndex) ||
      !categories[categoryIndex]?.questions?.[questionIndex]
    ) {
      return null;
    }

    return { ...baseActiveQuestion, type: "board", categoryIndex, questionIndex };
  }

  if (activeQuestion.type === "final") {
    const questionIndex = Number(activeQuestion.questionIndex);
    if (!Number.isInteger(questionIndex) || !finalQuestions[questionIndex]) {
      return null;
    }

    return { ...baseActiveQuestion, type: "final", questionIndex };
  }

  return null;
}

export function getRankedTeams(teams) {
  return [...teams]
    .map((team) => ({ ...team, total: getTeamTotal(team) }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
}

export function getActiveQuestion(state) {
  if (!state.activeQuestion) {
    return null;
  }

  if (state.activeQuestion.type === "board") {
    const category = state.categories[state.activeQuestion.categoryIndex];
    const question = category?.questions?.[state.activeQuestion.questionIndex];
    if (!category || !question) {
      return null;
    }

    return {
      title: category.title,
      subtitle: question.kind === "booster" ? "BOOST" : `${question.points} Points`,
      question,
      revealAnswer: Boolean(state.activeQuestion.revealAnswer),
      showTeams: Boolean(state.activeQuestion.showTeams),
      fullscreenImage: Boolean(state.activeQuestion.fullscreenImage),
      mediaPlayTrigger: numberOrZero(state.activeQuestion.mediaPlayTrigger),
      timerRestartKey: numberOrZero(state.activeQuestion.timerRestartKey),
      selectedTeamIds: Array.isArray(state.activeQuestion.selectedTeamIds) ? state.activeQuestion.selectedTeamIds : [],
    };
  }

  if (state.activeQuestion.type !== "final") {
    return null;
  }

  const question = state.finalRound.questions[state.activeQuestion.questionIndex];
  if (!question) {
    return null;
  }

  return {
    title: question.title,
    subtitle: "Final Round",
    question,
    revealAnswer: Boolean(state.activeQuestion.revealAnswer),
    showTeams: Boolean(state.activeQuestion.showTeams),
    fullscreenImage: Boolean(state.activeQuestion.fullscreenImage),
    mediaPlayTrigger: numberOrZero(state.activeQuestion.mediaPlayTrigger),
    timerRestartKey: numberOrZero(state.activeQuestion.timerRestartKey),
    selectedTeamIds: Array.isArray(state.activeQuestion.selectedTeamIds) ? state.activeQuestion.selectedTeamIds : [],
  };
}

export function getCurrentCategoryIndex(categories) {
  const index = categories.findIndex((category) => !areStandardQuestionsComplete(category));
  return index === -1 ? null : index;
}

export function areStandardQuestionsComplete(category) {
  return category.questions
    .filter((question) => question.kind === "standard")
    .every((question) => question.answered);
}
