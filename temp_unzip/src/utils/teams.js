import { numberOrZero } from './helpers.js';

export function updateTeamValue(setState, teamId, key, value) {
  setState((current) => {
    const draft = structuredClone(current);
    const team = draft.teams.find((entry) => entry.id === teamId);
    if (team) {
      team[key] = key === "name" ? value : numberOrZero(value);
    }
    return draft;
  });
}

export function updateTeamRound(setState, teamId, roundIndex, value) {
  setState((current) => {
    const draft = structuredClone(current);
    const team = draft.teams.find((entry) => entry.id === teamId);
    if (team) {
      team.rounds[roundIndex] = numberOrZero(value);
    }
    return draft;
  });
}

export function updateTeamDoubleTap(setState, teamId, currentCategoryIndex) {
  setState((current) => {
    const draft = structuredClone(current);
    const team = draft.teams.find((entry) => entry.id === teamId);
    if (!team || team.doubleTapStatus === "used" || currentCategoryIndex === null) {
      return draft;
    }

    if (team.doubleTapStatus === "armed" && team.doubleTapCategoryIndex === currentCategoryIndex) {
      team.doubleTapStatus = "ready";
      team.doubleTapCategoryIndex = null;
      return draft;
    }

    team.doubleTapStatus = "armed";
    team.doubleTapCategoryIndex = currentCategoryIndex;
    return draft;
  });
}
