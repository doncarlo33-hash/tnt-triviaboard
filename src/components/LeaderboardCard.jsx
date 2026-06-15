import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber.jsx';
import { LEADERBOARD_TEAMS_PER_COLUMN } from '../config.js';
import { useTilt } from '../utils/useTilt.js';



export default function LeaderboardCard({ teams }) {
  const tilt = useTilt();
  const { columns: leaderboardColumns, teamsPerColumn } = getLeaderboardColumns(teams);
  const densityClass = leaderboardColumns.length > 4 ? " compact ultra-compact" : leaderboardColumns.length > 2 ? " compact" : "";

  return (
    <section
      className={`leaderboard-card tilt-card${densityClass}`}
      style={{ "--leaderboard-column-count": leaderboardColumns.length }}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
    >
      <div className="leaderboard-head">
        <p className="section-label">Standings</p>
        <h2>Leaderboard</h2>
      </div>
      <div className="leaderboard-list">
        {leaderboardColumns.map((column) => (
          <div className="leaderboard-column" key={`leaderboard-column-${column.columnIndex}`}>
            {column.teams.map((team, teamIndex) => {
              const rank = column.columnIndex * teamsPerColumn + teamIndex + 1;
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="leaderboard-row" 
                  key={team.id}
                >
                  <span className="leaderboard-rank">{rank}</span>
                  <span className={`leaderboard-name${team.doubleTapStatus !== "ready" ? " energized" : ""}${team.onFire ? " on-fire" : ""}`}>{team.name}</span>
                  <span className="leaderboard-score">
                    <AnimatedNumber value={team.total} />
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

export function getLeaderboardColumns(teams, teamsPerColumn = LEADERBOARD_TEAMS_PER_COLUMN) {
  const columnCount = Math.max(1, Math.ceil(teams.length / teamsPerColumn));
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => ({
    columnIndex,
    teams: teams.slice(columnIndex * teamsPerColumn, (columnIndex + 1) * teamsPerColumn),
  })).filter((column) => column.teams.length > 0);

  return { columns, teamsPerColumn };
}
