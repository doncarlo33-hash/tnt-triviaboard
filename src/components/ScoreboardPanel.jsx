
import { createTeam } from '../utils/state.js';
import { updateTeamValue, updateTeamRound, updateTeamDoubleTap } from '../utils/teams.js';
import { numberOrZero } from '../utils/helpers.js';

import React from 'react';
export default React.memo(function ScoreboardPanel({ teams, setState, updateState, currentCategoryIndex, teamClaims = {}, fullscreen = false }) {
  return (
    <section className={`panel scoreboard-panel${fullscreen ? " scoreboard-panel-full" : ""}`}>
      <div className="panel-header">
        <div>
          <p className="section-label">Standings</p>
          <h2>Scoreboard</h2>
        </div>
        <button
          className="primary-button"
          onClick={() => updateState((draft) => {
            draft.teams.push(createTeam(`Team ${draft.teams.length + 1}`));
            return draft;
          })}
        >
          Add Team
        </button>
      </div>

      <div className="scoreboard">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th title="Tie Breaker">TB</th>
              <th>DBL</th>
              <th>Team Name</th>
              <th>1</th>
              <th>2</th>
              <th>3</th>
              <th>4</th>
              <th>5</th>
              <th>6</th>
              <th>F1</th>
              <th>F2</th>
              <th>Boost</th>
              <th>Total</th>
              <th>Tools</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, rankIndex) => (
              <TeamRow 
                key={team.id}
                team={team}
                rankIndex={rankIndex}
                currentCategoryIndex={currentCategoryIndex}
                setState={setState}
                updateState={updateState}
                teamClaim={teamClaims[team.id]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

function TeamRowComponent({ team, rankIndex, currentCategoryIndex, setState, updateState, teamClaim }) {
  return (
    <tr>
      <td className="score-rank">{rankIndex + 1}</td>
      <NumericCell value={team.tb} onChange={(value) => updateTeamValue(setState, team.id, "tb", value)} />
      <td>
        <DoubleTapCell
          team={team}
          currentCategoryIndex={currentCategoryIndex}
          onToggle={() => updateTeamDoubleTap(setState, team.id, currentCategoryIndex)}
        />
      </td>
      <td>
        <input value={team.name} onChange={(event) => updateTeamValue(setState, team.id, "name", event.target.value)} />
      </td>
      {team.rounds.map((score, roundIndex) => (
        <NumericCell
          key={`${team.id}-${roundIndex}`}
          value={score}
          onChange={(value) => updateTeamRound(setState, team.id, roundIndex, value)}
        />
      ))}
      <NumericCell value={team.f1} onChange={(value) => updateTeamValue(setState, team.id, "f1", value)} />
      <NumericCell value={team.f2} onChange={(value) => updateTeamValue(setState, team.id, "f2", value)} />
      <NumericCell value={team.boost} onChange={(value) => updateTeamValue(setState, team.id, "boost", value)} />
      <td className="score-total">{team.total}</td>
      <td>
        <div className="team-tools">
          {teamClaim && (
            <button
              className="tiny-button"
              style={{ marginRight: '5px', background: '#ff9800' }}
              onClick={() => updateState((draft) => {
                if (draft.teamClaims) {
                  delete draft.teamClaims[team.id];
                }
                return draft;
              })}
              title="Kick connected device"
            >
              Kick Device
            </button>
          )}
          <button
            className="tiny-button"
            onClick={() => updateState((draft) => {
              if (draft.teams.length === 1) {
                window.alert("At least one team must remain.");
                return draft;
              }
              draft.teams = draft.teams.filter((entry) => entry.id !== team.id);
              return draft;
            })}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

function areTeamsEqual(prevProps, nextProps) {
  const p = prevProps.team;
  const n = nextProps.team;
  return (
    prevProps.rankIndex === nextProps.rankIndex &&
    prevProps.currentCategoryIndex === nextProps.currentCategoryIndex &&
    prevProps.teamClaim === nextProps.teamClaim &&
    p.id === n.id &&
    p.name === n.name &&
    p.tb === n.tb &&
    p.dbl === n.dbl &&
    p.doubleTapStatus === n.doubleTapStatus &&
    p.doubleTapCategoryIndex === n.doubleTapCategoryIndex &&
    p.f1 === n.f1 &&
    p.f2 === n.f2 &&
    p.boost === n.boost &&
    p.total === n.total &&
    p.rounds.every((val, i) => val === n.rounds[i])
  );
}

const TeamRow = memo(TeamRowComponent, areTeamsEqual);

export function NumericCell({ value, onChange }) {
  return (
    <td>
      <input type="number" value={value} onChange={(event) => onChange(numberOrZero(event.target.value))} />
    </td>
  );
}

export function DoubleTapCell({ team, currentCategoryIndex, onToggle }) {
  const label =
    team.doubleTapStatus === "used"
      ? "Used"
      : team.doubleTapStatus === "armed"
        ? `C${(team.doubleTapCategoryIndex ?? 0) + 1}`
        : currentCategoryIndex === null
          ? "Ready"
          : `DT${currentCategoryIndex + 1}`;

  return (
    <div className="double-cell">
      <button
        type="button"
        className={`tiny-button double-button${team.doubleTapStatus === "armed" ? " armed" : ""}${team.doubleTapStatus === "used" ? " used" : ""}`}
        onClick={onToggle}
        disabled={team.doubleTapStatus === "used" || currentCategoryIndex === null}
      >
        {label}
      </button>
    </div>
  );
}