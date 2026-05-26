import { useState } from 'react';
import { useSettings } from '../settingsStore.js';
import { MediaUploadField } from './FormControls.jsx';
import { audioEngine } from '../utils/audio.js';

export default function AudioSetupModal({ onClose }) {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="modal-backdrop">
      <div className="question-modal-card" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="panel-header">
          <div>
            <p className="section-label">Settings</p>
            <h2>Audio Setup</h2>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
        </div>

        <div className="audio-setup-grid" style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 1fr' }}>
          
          <div className="settings-group">
            <h3>Game Flow Music</h3>
            
            <div className="audio-field-row" style={{ display: 'flex', alignItems: 'end', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <MediaUploadField
                  label="End Game Music"
                  accept="audio/*"
                  currentValue={settings.endGameMusicSrc}
                  onChange={(val) => {
                    updateSettings({ endGameMusicSrc: val });
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" className="tiny-button" onClick={() => audioEngine.play('endGame')}>Test</button>
                <button type="button" className="tiny-button ghost-button" onClick={() => audioEngine.stop('endGame')}>Stop</button>
              </div>
            </div>

            <div className="audio-field-row" style={{ display: 'flex', alignItems: 'end', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <MediaUploadField
                  label="Opening Explosion Audio"
                  accept="audio/*"
                  currentValue={settings.openingExplosionAudioSrc}
                  onChange={(val) => {
                    updateSettings({ openingExplosionAudioSrc: val });
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" className="tiny-button" onClick={() => audioEngine.play('explosion')}>Test</button>
                <button type="button" className="tiny-button ghost-button" onClick={() => audioEngine.stop('explosion')}>Stop</button>
              </div>
            </div>
            
            <div className="audio-field-row" style={{ display: 'flex', alignItems: 'end', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <MediaUploadField
                  label="Opening Explosion Video"
                  accept="video/*"
                  currentValue={settings.openingExplosionVideoSrc}
                  onChange={(val) => updateSettings({ openingExplosionVideoSrc: val })}
                />
              </div>
            </div>
          </div>

          <div className="settings-group">
            <h3>Sound Effects</h3>

            {[
              { id: 'tick', key: 'sfxTickSrc', label: 'Timer Tick' },
              { id: 'ding', key: 'sfxDingSrc', label: 'Correct Ding' },
              { id: 'swoosh', key: 'sfxSwooshSrc', label: 'Swoosh Transition' },
              { id: 'award', key: 'sfxAwardSrc', label: 'Award Points' },
              { id: 'buzzer', key: 'sfxBuzzerSrc', label: 'Wrong / Buzzer' },
              { id: 'drumroll', key: 'sfxDrumrollSrc', label: 'Drumroll' },
              { id: 'streak', key: 'sfxStreakSrc', label: 'Hot Streak' },
              { id: 'categoryReveal', key: 'sfxCategoryRevealSrc', label: 'Category Reveal' },
            ].map(sfx => (
              <div className="audio-field-row" key={sfx.key} style={{ display: 'flex', alignItems: 'end', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <MediaUploadField
                    label={sfx.label}
                    accept="audio/*"
                    currentValue={settings[sfx.key]}
                    onChange={(val) => {
                      updateSettings({ [sfx.key]: val });
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button type="button" className="tiny-button" onClick={() => audioEngine.play(sfx.id)}>Test</button>
                  <button type="button" className="tiny-button ghost-button" onClick={() => audioEngine.stop(sfx.id)}>Stop</button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
