import { useSettings } from '../settingsStore.js';

function ThemeCard({ theme, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 18px',
        borderRadius: '14px',
        cursor: 'pointer',
        background: selected
          ? `linear-gradient(135deg, ${theme.accent}33, ${theme.strong}22)`
          : `${theme.bg}cc`,
        border: selected
          ? `2px solid ${theme.strong}`
          : '2px solid rgba(255,255,255,0.08)',
        boxShadow: selected
          ? `0 0 16px ${theme.accent}66, inset 0 0 0 1px ${theme.strong}44`
          : 'none',
        transition: 'all 0.2s ease',
        minWidth: '110px',
        color: '#fff',
        fontFamily: 'var(--body)',
      }}
    >
      <span style={{ fontSize: '2rem', lineHeight: 1 }}>{theme.emoji}</span>
      <span style={{
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: selected ? theme.strong : 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>{theme.name}</span>
      {selected && (
        <span style={{
          fontSize: '0.65rem',
          background: theme.accent,
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '999px',
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}>ACTIVE</span>
      )}
    </button>
  );
}

export default function SettingsPanel({ updateState }) {
  const { settings, updateSettings } = useSettings();

  function handleThemeChange(themeId) {
    updateSettings({ theme: themeId });
    // Also write into game state so the display window picks it up
    // via the already-proven state sync channel
    if (updateState) {
      updateState(draft => {
        draft.displayTheme = themeId;
        return draft;
      });
    }
  }

  return (
    <section className="panel panel-wide admin-workspace-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Configuration</p>
          <h2>Game Settings</h2>
        </div>
      </div>

      <div className="settings-grid" style={{ display: 'grid', gap: '24px', padding: '16px' }}>
        
        <div className="settings-group">
          <h3>Visual Theme</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: '4px 0 16px' }}>
            Choose a display theme for the game board and audience screen.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Base themes */}
            <div>
              <p className="mini-label" style={{ marginBottom: '10px' }}>Base Themes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {[
                  { id: 'theme-classic', name: 'Classic Fire', emoji: '🔥', accent: '#c6532b', strong: '#ffbe56', bg: '#05070b' },
                  { id: 'theme-blue',    name: 'Jeopardy Blue', emoji: '🎯', accent: '#1565c0', strong: '#42a5f5', bg: '#040a1a' },
                  { id: 'theme-cyberpunk', name: 'Cyberpunk',   emoji: '⚡', accent: '#e040fb', strong: '#00e5ff', bg: '#0a0012' },
                  { id: 'theme-matrix',    name: 'Matrix',      emoji: '💻', accent: '#00ff41', strong: '#008f11', bg: '#010201' },
                  { id: 'theme-dark',   name: 'Midnight',      emoji: '🌑', accent: '#78909c', strong: '#b0bec5', bg: '#0c0c0c' },
                ].map(theme => (
                  <ThemeCard key={theme.id} theme={theme} selected={settings.theme === theme.id} onSelect={() => handleThemeChange(theme.id)} />
                ))}
              </div>
            </div>

            {/* Holiday themes */}
            <div>
              <p className="mini-label" style={{ marginBottom: '10px' }}>Holiday Themes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {[
                  { id: 'theme-christmas',    name: 'Christmas',        emoji: '🎄', accent: '#c0392b', strong: '#f1c40f', bg: '#0a1a0f' },
                  { id: 'theme-halloween',    name: 'Halloween',        emoji: '🎃', accent: '#e65c00', strong: '#b026ff', bg: '#0d0608' },
                  { id: 'theme-stpatricks',   name: "St. Patrick's",    emoji: '🍀', accent: '#2e7d32', strong: '#ffd600', bg: '#041508' },
                  { id: 'theme-july4th',      name: 'July 4th',         emoji: '🎆', accent: '#c62828', strong: '#e3f2fd', bg: '#07060f' },
                  { id: 'theme-thanksgiving', name: 'Thanksgiving',     emoji: '🦃', accent: '#bf5700', strong: '#f0a500', bg: '#120b04' },
                ].map(theme => (
                  <ThemeCard key={theme.id} theme={theme} selected={settings.theme === theme.id} onSelect={() => handleThemeChange(theme.id)} />
                ))}
              </div>
            </div>

          </div>
        </div>
        
        <div className="settings-group">
          <h3>Display Preferences</h3>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={settings.hidePlayerQR || false} 
                onChange={e => updateSettings({ hidePlayerQR: e.target.checked })} 
              />
              Hide Player QR Code on Audience Display
            </label>
            
            <label className="final-question-editor" style={{ maxWidth: '400px' }}>
              <span className="mini-label">Local Network IP Override (for PWA)</span>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', margin: '4px 0 8px', lineHeight: '1.4' }}>
                If you installed the game as a PWA from localhost, enter your computer's local IP address (e.g., 192.168.1.5) here so players can still connect via the QR code.
              </p>
              <input 
                type="text" 
                value={settings.hostIpOverride || ''} 
                onChange={e => updateSettings({ hostIpOverride: e.target.value })} 
                placeholder="e.g. 192.168.1.5" 
              />
            </label>
          </div>
        </div>

        <div className="settings-group">
          <h3>AI Verification</h3>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', margin: '4px 0 16px' }}>
            Enter your Google Gemini API key to enable AI answer verification in the question panel.
          </p>
          <div style={{ display: 'grid', gap: '12px', marginTop: '12px', maxWidth: '400px' }}>
            <label className="final-question-editor">
              <span className="mini-label">Google Gemini API Key</span>
              <input 
                type="text" 
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                value={settings.aiApiKey || ''} 
                onChange={e => updateSettings({ aiApiKey: e.target.value })} 
                placeholder="AIzaSy..." 
              />
            </label>
          </div>
        </div>

        <div className="settings-group" style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <h3>Visual Assets</h3>
            <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
              <label className="final-question-editor">
                <span className="mini-label">Main Logo URL</span>
                <input value={settings.logoSrc} onChange={e => updateSettings({ logoSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Name Logo URL</span>
                <input value={settings.nameLogoSrc} onChange={e => updateSettings({ nameLogoSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Opening Animation Video URL</span>
                <input value={settings.openingAnimationSrc} onChange={e => updateSettings({ openingAnimationSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Opening Explosion Video URL</span>
                <input value={settings.openingExplosionVideoSrc} onChange={e => updateSettings({ openingExplosionVideoSrc: e.target.value })} />
              </label>
            </div>
          </div>

          <div>
            <h3>Audio Assets</h3>
            <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
              <label className="final-question-editor" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={settings.muteSoundEffects || false} 
                  onChange={e => updateSettings({ muteSoundEffects: e.target.checked })} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-strong)' }}
                />
                <span className="mini-label" style={{ marginBottom: 0, marginTop: '2px' }}>Mute Sound Effects</span>
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Opening Explosion Audio URL</span>
                <input value={settings.openingExplosionAudioSrc} onChange={e => updateSettings({ openingExplosionAudioSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">End Game Music URL</span>
                <input value={settings.endGameMusicSrc} onChange={e => updateSettings({ endGameMusicSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Tick SFX URL</span>
                <input value={settings.sfxTickSrc} onChange={e => updateSettings({ sfxTickSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Ding SFX URL</span>
                <input value={settings.sfxDingSrc} onChange={e => updateSettings({ sfxDingSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Swoosh SFX URL</span>
                <input value={settings.sfxSwooshSrc} onChange={e => updateSettings({ sfxSwooshSrc: e.target.value })} />
              </label>
              <label className="final-question-editor">
                <span className="mini-label">Award SFX URL</span>
                <input value={settings.sfxAwardSrc} onChange={e => updateSettings({ sfxAwardSrc: e.target.value })} />
              </label>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
