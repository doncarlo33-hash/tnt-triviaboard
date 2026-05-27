import { SCREEN_PARAM, STANDARD_POINT_VALUES } from '../config.js';

export function getScreenMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(SCREEN_PARAM);
  } catch {
    return null;
  }
}

export function numberOrZero(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeIdList(value) {
  return Array.isArray(value) ? [...new Set(value.filter((entry) => typeof entry === "string"))] : [];
}

export function normalizeWagerMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([teamId, wager]) => [teamId, Math.max(0, numberOrZero(wager))]),
  );
}

export function getFinalWagerBudget(team) {
  return Math.max(0, getTeamTotal(team));
}

export function getClampedFinalWagerPair(finalRound, team) {
  const budget = getFinalWagerBudget(team);
  const firstWager = clampNumber(numberOrZero(finalRound.questions?.[0]?.wagers?.[team.id]), 0, budget);
  const secondWager = clampNumber(numberOrZero(finalRound.questions?.[1]?.wagers?.[team.id]), 0, Math.max(0, budget - firstWager));
  return [firstWager, secondWager];
}

export function clampFinalWagers(finalRound, teams) {
  teams.forEach((team) => {
    const wagerPair = getClampedFinalWagerPair(finalRound, team);
    finalRound.questions.forEach((question, index) => {
      question.wagers[team.id] = wagerPair[index];
    });
  });
}

export function updateFinalWager(draft, questionIndex, teamId, value) {
  const team = draft.teams.find((entry) => entry.id === teamId);
  const question = draft.finalRound.questions[questionIndex];
  if (!team || !question) {
    return;
  }

  const budget = getFinalWagerBudget(team);
  const nextWager = clampNumber(numberOrZero(value), 0, budget);
  if (questionIndex === 0) {
    const secondWager = clampNumber(numberOrZero(draft.finalRound.questions[1]?.wagers?.[teamId]), 0, Math.max(0, budget - nextWager));
    draft.finalRound.questions[0].wagers[teamId] = nextWager;
    draft.finalRound.questions[1].wagers[teamId] = secondWager;
    return;
  }

  const firstWager = clampNumber(numberOrZero(draft.finalRound.questions[0]?.wagers?.[teamId]), 0, budget);
  draft.finalRound.questions[0].wagers[teamId] = firstWager;
  question.wagers[teamId] = clampNumber(nextWager, 0, Math.max(0, budget - firstWager));
  clampFinalWagers(draft.finalRound, draft.teams);
}

export function getTeamTotal(team) {
  return team.rounds.reduce((sum, current) => sum + current, 0) + team.f1 + team.f2 + team.boost;
}

export function getQuestionLabel(question) {
  return question.kind === "booster" ? "BOOST" : question.points;
}

export function formatTimer(seconds) {
  const safeSeconds = Math.max(0, numberOrZero(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function getPostGameRecap(teams) {
  const [winner, runnerUp] = teams;
  const closestRace = winner && runnerUp
    ? `${winner.name} won by ${Math.abs(winner.total - runnerUp.total)}`
    : "Waiting for scores";
  let bestRoundTeam = null;
  let bestRoundIndex = 0;
  let bestRoundScore = Number.NEGATIVE_INFINITY;
  let finalSwingTeam = null;
  let finalSwingScore = 0;

  teams.forEach((team) => {
    team.rounds.forEach((score, index) => {
      if (score > bestRoundScore) {
        bestRoundScore = score;
        bestRoundTeam = team;
        bestRoundIndex = index;
      }
    });

    const finalSwing = numberOrZero(team.f1) + numberOrZero(team.f2);
    if (!finalSwingTeam || Math.abs(finalSwing) > Math.abs(finalSwingScore)) {
      finalSwingScore = finalSwing;
      finalSwingTeam = team;
    }
  });

  return {
    winner,
    closestRace,
    bestRoundLabel: bestRoundTeam ? `${bestRoundTeam.name}, Round ${bestRoundIndex + 1}: ${bestRoundScore}` : "No rounds scored",
    finalSwingLabel: finalSwingTeam ? `${finalSwingTeam.name}: ${finalSwingScore > 0 ? "+" : ""}${finalSwingScore}` : "No final swings",
  };
}

export function parseQuestionRows(rows) {
  return rows.flatMap((row) => {
    const normalizedRow = normalizeSpreadsheetRow(row);
    if (!normalizedRow) {
      return [];
    }
    return [normalizedRow];
  });
}

export function normalizeSpreadsheetRow(row) {
  const categoryRaw = String(row.Category || row.category || row.Round || row.round || "").trim();
  const valueRaw = String(row.Value || row.value || row.Points || row.points || "").trim();
  const prompt = String(row.Prompt || row.prompt || row.Question || row.question || row.Text || row.text || "").trim();
  const answer = String(row.Answer || row.answer || "").trim();
  const title = String(row.Title || row.title || "").trim();
  const categoryTitle = String(
    row["Category Title"] ||
      row["category title"] ||
      row.CategoryTitle ||
      row.categoryTitle ||
      row["Category Name"] ||
      row["category name"] ||
      row.CategoryName ||
      row.categoryName ||
      title ||
      "",
  ).trim();

  if (!categoryRaw && !String(row.Final || row.final || "").trim()) {
    return null;
  }

  if (/^f(inal)?\s*1$/i.test(categoryRaw) || String(row.Final || row.final).trim() === "1") {
    return { kind: "final", questionIndex: 0, title, prompt, answer };
  }

  if (/^f(inal)?\s*2$/i.test(categoryRaw) || String(row.Final || row.final).trim() === "2") {
    return { kind: "final", questionIndex: 1, title, prompt, answer };
  }

  const categoryIndex = Number(categoryRaw) - 1;
  if (!Number.isInteger(categoryIndex) || categoryIndex < 0 || categoryIndex > 5) {
    return null;
  }

  if (!valueRaw && categoryTitle) {
    return { kind: "category", categoryIndex, title: categoryTitle };
  }

  const normalizedValue = /^boost$/i.test(valueRaw) ? "BOOST" : Number(valueRaw);
  const questionIndex = normalizedValue === "BOOST"
    ? 6
    : STANDARD_POINT_VALUES.findIndex((value) => value === normalizedValue);

  if (questionIndex < 0) {
    return null;
  }

  return { kind: "board", categoryIndex, questionIndex, prompt, answer, categoryTitle };
}

export function getQuestionMediaTarget(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const baseName = file.name
    .slice(0, Math.max(0, file.name.length - extension.length - 1))
    .toLowerCase()
    .trim();
  const match = baseName.match(/^(?:round|r)?\s*([1-6])[\s._-]+(10|20|30|40|50|60|boost|booster)(?:\b|[\s._-])/);
  if (!match) {
    return null;
  }

  const categoryIndex = Number(match[1]) - 1;
  const value = match[2];
  const questionIndex = value === "boost" || value === "booster"
    ? 6
    : STANDARD_POINT_VALUES.findIndex((points) => points === Number(value));

  if (questionIndex < 0) {
    return null;
  }

  const mediaType = getMediaType(file, extension);
  if (!mediaType) {
    return null;
  }

  return { categoryIndex, questionIndex, mediaType };
}

export function getMediaType(file, extension) {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("audio/")) {
    return "audio";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(extension)) {
    return "image";
  }
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension)) {
    return "audio";
  }
  if (["mp4", "webm", "mov", "m4v", "ogv"].includes(extension)) {
    return "video";
  }
  return null;
}
