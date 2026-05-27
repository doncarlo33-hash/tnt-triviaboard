import { Howl, Howler } from 'howler';
import { useSettings } from '../settingsStore.js';

import { isIndexedDbMediaRef, getMediaRecord } from './media.js';
import { MEDIA_REF_PREFIX } from '../config.js';

class AudioEngine {
  constructor() {
    this.sounds = {};
    this.currentSettings = null;

    // Subscribe to settings changes
    useSettings.subscribe((state) => {
      this.syncSounds(state.settings);
    });

    // Initial sync
    this.syncSounds(useSettings.getState().settings);
  }

  syncSounds(settings) {
    if (this.currentSettings === settings) return;
    this.currentSettings = settings;

    this.updateSound('tick', settings.sfxTickSrc);
    this.updateSound('ding', settings.sfxDingSrc);
    this.updateSound('swoosh', settings.sfxSwooshSrc);
    this.updateSound('award', settings.sfxAwardSrc);
    this.updateSound('buzzer', settings.sfxBuzzerSrc);
    this.updateSound('drumroll', settings.sfxDrumrollSrc);
    this.updateSound('streak', settings.sfxStreakSrc);
    this.updateSound('categoryReveal', settings.sfxCategoryRevealSrc);
    this.updateSound('endGame', settings.endGameMusicSrc, { loop: true });
    this.updateSound('explosion', settings.openingExplosionAudioSrc);
  }

  async updateSound(key, src, options = {}) {
    if (!src) return;
    
    let resolvedSrc = src;
    if (isIndexedDbMediaRef(src)) {
      try {
        const record = await getMediaRecord(src.slice(MEDIA_REF_PREFIX.length));
        if (record && record.dataUrl) {
          resolvedSrc = record.dataUrl;
        }
      } catch (err) {
        console.error("Could not load media for audio", err);
      }
    }

    // If we already have this sound loaded with the same src, skip
    if (this.sounds[key] && this.sounds[key]._src === resolvedSrc) {
      return;
    }

    // Unload old sound if it exists
    if (this.sounds[key]) {
      this.sounds[key].unload();
    }

    // Create new sound
    const sound = new Howl({
      src: [resolvedSrc],
      preload: true,
      ...options
    });
    sound._src = resolvedSrc;
    this.sounds[key] = sound;
  }

  playLocal(key, volume = 1.0) {
    const sound = this.sounds[key];
    if (sound) {
      sound.volume(volume);
      sound.play();
    }
  }

  play(key, volume = 1.0) {
    this.playLocal(key, volume);
    
    // Broadcast to remote screens
    import('./remote.js').then(({ globalHostConnections }) => {
      if (globalHostConnections && globalHostConnections.length > 0) {
        const msg = JSON.stringify({ type: 'AUDIO_PLAY', key, volume });
        globalHostConnections.forEach(conn => {
          if (conn.open) {
            conn.send(msg);
          }
        });
      }
    }).catch(err => console.error("Failed to broadcast audio", err));
  }

  stop(key) {
    const sound = this.sounds[key];
    if (sound) {
      sound.stop();
    }
  }
  
  stopAll() {
    Howler.stop();
  }
}

export const audioEngine = new AudioEngine();
