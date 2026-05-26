import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import AnimatedNumber from './AnimatedNumber.jsx';
import { FINAL_ROUND_INSTRUCTIONS, VENMO_QR_SRC } from '../config.js';
import { getPostGameRecap } from '../utils/helpers.js';

export function FinalRoundInstructions() {
  return (
    <section className="final-instructions-card">
      <p className="section-label">Final Round</p>
      <h2>Instructions</h2>
      <ol>
        {FINAL_ROUND_INSTRUCTIONS.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ol>
    </section>
  );
}

const GAME_RULES = [
  'All-answer game — I ask a question, you write an answer down.',
  'Keep your boards DOWN until I tell everyone to put them up.',
  'Keep your boards UP until I say put them down.',
  'Six rounds of six questions — 10 to 60 points each, plus a 50-point booster.',
  'Before each category I\'ll ask if you want to DOUBLE TAP it — doubling the points on any 10–60 pt question in that round.',
  'You can only do it ONCE, and you don\'t know the future categories — so choose wisely!',
];

export function GameRulesView() {
  return (
    <section className="game-rules-card">
      <div className="game-rules-head">
        <h2>How to Play</h2>
      </div>
      <ol className="game-rules-list">
        {GAME_RULES.map((rule, i) => (
          <li key={i}>{rule}</li>
        ))}
      </ol>
    </section>
  );
}

export function SocialMediaQR() {
  return (
    <aside className="social-media-banner" style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', background: 'var(--panel-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <div className="social-qr-wrap">
        <img src="/qr-facebook.png" alt="Scan to find us on Facebook" style={{ width: '180px', height: '180px', objectFit: 'contain', borderRadius: '12px' }} />
      </div>
      <div className="social-qr-wrap">
        <img src="/qr-instagram.png" alt="Scan to find us on Instagram" style={{ width: '180px', height: '180px', objectFit: 'contain', borderRadius: '12px' }} />
      </div>
    </aside>
  );
}

export function SocialMediaView() {
  return (
    <section className="social-media-full-view">
      <div className="recap-head">
        <p className="section-label">Connect With Us</p>
        <h2>Follow TNT Trivia</h2>
      </div>
      <div className="social-media-grid" style={{ display: 'flex', gap: '100px', marginTop: '60px', justifyContent: 'center' }}>
        <div className="social-qr-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" style={{ height: '80px', fill: 'white', marginBottom: '24px' }}>
            <path d="M80 299.3V512H216V299.3H288L304 186.3H216V130C216 103.1 234.3 96 248.8 96H304V0H214.3C117 0 80 62.4 80 152.1V186.3H16V299.3H80Z"/>
          </svg>
          <img src="/qr-facebook.png" alt="Scan to find us on Facebook" style={{ width: '800px', height: '800px', objectFit: 'contain', borderRadius: '32px', boxShadow: '0 16px 64px rgba(0,0,0,0.6)' }} />
        </div>
        <div className="social-qr-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style={{ height: '80px', fill: 'white', marginBottom: '24px' }}>
            <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
          </svg>
          <img src="/qr-instagram.png" alt="Scan to find us on Instagram" style={{ width: '800px', height: '800px', objectFit: 'contain', borderRadius: '32px', boxShadow: '0 16px 64px rgba(0,0,0,0.6)' }} />
        </div>
      </div>
    </section>
  );
}

export function EndGameWinners({ teams }) {
  const [winner, secondPlace, thirdPlace] = teams;
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showConfetti, setShowConfetti] = useState(false);
  const [revealStep, setRevealStep] = useState(0); // 0 = none, 1 = 3rd, 2 = 2nd, 3 = winner

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    
    const timers = [
      setTimeout(() => setRevealStep(1), 1000),
      setTimeout(() => setRevealStep(2), 3000),
      setTimeout(() => {
        setRevealStep(3);
        setShowConfetti(true);
      }, 6000),
      setTimeout(() => setShowConfetti(false), 14000)
    ];

    return () => {
      window.removeEventListener('resize', handleResize);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        numberOfPieces={showConfetti ? 300 : 0}
        recycle={false}
        colors={['#ffbe56', '#c6532b', '#ff6b35', '#ffd700', '#ff4444', '#ffffff']}
      />
      <HostTipCard />
      <section className="end-game-card">
        <div className="firework-ring" aria-hidden="true" style={{ opacity: revealStep >= 3 ? 1 : 0 }}>
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <h2 style={{ opacity: revealStep >= 3 ? 1 : 0, transition: 'opacity 0.5s' }}>WINNER!!!</h2>
        {winner ? (
          <div className={`winner-spotlight ${revealStep >= 3 ? 'revealed' : ''}`}>
            <strong>{winner.name}</strong>
            <span><AnimatedNumber value={revealStep >= 3 ? winner.total : 0} /></span>
          </div>
        ) : (
          <p className="end-game-empty" style={{ opacity: revealStep >= 3 ? 1 : 0, transition: 'opacity 0.5s' }}>No teams yet.</p>
        )}
        {(secondPlace || thirdPlace) && (
          <div className="runner-up-list">
            {secondPlace ? (
              <div className="runner-up-row" style={{ opacity: revealStep >= 2 ? 1 : 0, transition: 'opacity 0.5s' }}>
                <span>2nd Place</span>
                <strong>{secondPlace.name}</strong>
                <span>{secondPlace.total}</span>
              </div>
            ) : <div className="runner-up-row" style={{ opacity: 0 }}></div>}
            {thirdPlace ? (
              <div className="runner-up-row" style={{ opacity: revealStep >= 1 ? 1 : 0, transition: 'opacity 0.5s' }}>
                <span>3rd Place</span>
                <strong>{thirdPlace.name}</strong>
                <span>{thirdPlace.total}</span>
              </div>
            ) : <div className="runner-up-row" style={{ opacity: 0 }}></div>}
          </div>
        )}
      </section>
      <HostTipCard />
    </>
  );
}

export function HostTipCard({ text = "Enjoyed the trivia? Feel free to tip your trivia host!" }) {
  return (
    <aside className="host-tip-card">
      <p>{text}</p>
      <img src={VENMO_QR_SRC} alt="Venmo QR code for trivia host tips" />
    </aside>
  );
}

export function PostGameRecap({ teams }) {
  const recap = getPostGameRecap(teams);

  return (
    <section className="post-game-recap-card">
      <div className="recap-head">
        <p className="section-label">Post Game Recap</p>
        <h2>Game Highlights</h2>
      </div>
      <div className="recap-grid">
        <div className="recap-feature">
          <span>Champion</span>
          <strong>{recap.winner?.name || "No teams yet"}</strong>
          <b>{recap.winner ? recap.winner.total : 0}</b>
        </div>
        <div className="recap-stat">
          <span>Closest Race</span>
          <strong>{recap.closestRace}</strong>
        </div>
        <div className="recap-stat">
          <span>Best Round</span>
          <strong>{recap.bestRoundLabel}</strong>
        </div>
        <div className="recap-stat">
          <span>Final Swing</span>
          <strong>{recap.finalSwingLabel}</strong>
        </div>
      </div>
      <div className="recap-rankings">
        {teams.slice(0, 5).map((team, index) => (
          <div className="recap-ranking-row" key={team.id}>
            <span>{index + 1}</span>
            <strong>{team.name}</strong>
            <b>{team.total}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AwardMomentOverlay({ awardMoment }) {
  const recipients = Array.isArray(awardMoment.recipients) ? awardMoment.recipients : [];
  const featuredRecipients = recipients.slice(0, 6);
  const extraCount = Math.max(0, recipients.length - featuredRecipients.length);

  return (
    <div className="award-moment-overlay" key={awardMoment.id} aria-live="polite">
      <div className="award-shockwave" />
      <div className="award-moment-card">
        <span className="award-moment-label">Points Awarded</span>
        <strong>{awardMoment.title}</strong>
        <div className="award-moment-list">
          {featuredRecipients.map((recipient) => (
            <div className="award-moment-row" key={`${awardMoment.id}-${recipient.teamId}`}>
              <span>{recipient.name}</span>
              <b>+{recipient.delta}</b>
            </div>
          ))}
          {extraCount > 0 && (
            <div className="award-moment-row">
              <span>{extraCount} more teams</span>
              <b>scored</b>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScrambledText({ text, delay = 0 }) {
  const [display, setDisplay] = useState(text.replace(/[A-Za-z0-9]/g, '-'));
  
  useEffect(() => {
    let timeoutId;
    let intervalId;
    
    timeoutId = setTimeout(() => {
      let iteration = 0;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
      
      intervalId = setInterval(() => {
        setDisplay(prev => prev.split('').map((char, index) => {
          if (index < iteration) {
            return text[index];
          }
          if (text[index] === ' ') return ' ';
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(''));
        
        if (iteration >= text.length) {
          clearInterval(intervalId);
        }
        
        iteration += 1/3;
      }, 30);
    }, delay);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [text, delay]);

  return <span>{display}</span>;
}

export function FinalCategoriesView({ questions }) {
  return (
    <section className="final-instructions-card" style={{ maxWidth: '1200px', width: '90%' }}>
      <p className="section-label" style={{ fontSize: '1.4rem', letterSpacing: '4px', opacity: 0.8 }}>Final Round</p>
      <h2 style={{ fontSize: '3.5rem', marginBottom: '20px', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>Categories</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: questions.length > 1 ? '1fr 1fr' : '1fr', 
        gap: '40px', 
        marginTop: '40px', 
        width: '100%' 
      }}>
        {questions.map((q, i) => (
          <div key={q.id || i} className="panel" style={{ 
            padding: '60px 40px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px', 
            background: 'linear-gradient(145deg, rgba(198, 83, 43, 0.3) 0%, rgba(20, 30, 48, 0.9) 100%)', 
            border: '2px solid var(--accent-strong)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,244,220,0.1), 0 0 30px rgba(198, 83, 43, 0.4)',
            borderRadius: '24px'
          }}>
            <span className="mini-label" style={{ fontSize: '1.2rem', color: 'var(--accent-strong)' }}>Question {i + 1}</span>
            <h3 style={{ 
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', 
              margin: 0, 
              color: '#ffffff',
              fontWeight: 800,
              lineHeight: 1.2,
              textShadow: '0 4px 16px rgba(0,0,0,0.6)'
            }}><ScrambledText text={q.title} delay={i * 1000 + 500} /></h3>
          </div>
        ))}
      </div>
    </section>
  );
}
