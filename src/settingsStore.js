import { create } from 'zustand';
import {
  LOGO_SRC, NAME_LOGO_SRC, OPENING_ANIMATION_SRC, OPENING_EXPLOSION_VIDEO_SRC, OPENING_EXPLOSION_AUDIO_SRC, END_GAME_MUSIC_SRC
} from './config.js';

const SETTINGS_KEY = 'trivia-scoreboard-settings';

const defaultSettings = {
  theme: 'theme-classic',
  logoSrc: LOGO_SRC,
  nameLogoSrc: NAME_LOGO_SRC,
  openingAnimationSrc: OPENING_ANIMATION_SRC,
  openingExplosionVideoSrc: OPENING_EXPLOSION_VIDEO_SRC,
  openingExplosionAudioSrc: OPENING_EXPLOSION_AUDIO_SRC,
  endGameMusicSrc: END_GAME_MUSIC_SRC,
  sfxTickSrc: '',
  sfxDingSrc: '/correct-answer-ding-achieve-win-success-3-SBA-300419317.wav',
  sfxSwooshSrc: '/fireball-swoosh-SBA-300139578.wav',
  sfxAwardSrc: '/good-idea-shiny-achievement-achieve-3-SBA-300462164.wav',
  sfxBuzzerSrc: '/flash-whoosh-swoosh-SBA-300463416.wav',
  sfxDrumrollSrc: '',
  sfxStreakSrc: '',
  sfxCategoryRevealSrc: '/magic-poof-spell-2-SBA-300420753.wav',
  aiApiKey: '',
};

function loadSettings() {
  try {
    const saved = window.localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (e) {}
  return defaultSettings;
}

const ALL_THEME_CLASSES = [
  'theme-classic', 'theme-blue', 'theme-cyberpunk', 'theme-matrix', 'theme-dark',
  'theme-christmas', 'theme-halloween', 'theme-stpatricks', 'theme-july4th', 'theme-thanksgiving'
];

function applyThemeToBody(theme, animate = false) {
  const currentTheme = ALL_THEME_CLASSES.find(c => document.body.classList.contains(c)) || 'theme-classic';
  const nextTheme = theme || 'theme-classic';
  
  if (currentTheme === nextTheme) return;

  const updateDOM = () => {
    document.body.classList.remove(...ALL_THEME_CLASSES);
    if (nextTheme !== 'theme-classic') {
      document.body.classList.add(nextTheme);
    }
  };

  if (animate && document.startViewTransition) {
    document.documentElement.classList.add('theme-transitioning');
    const transition = document.startViewTransition(updateDOM);
    if (transition.finished) {
      transition.finished.finally(() => {
        document.documentElement.classList.remove('theme-transitioning');
      });
    } else {
      // Fallback if transition.finished is somehow not implemented
      setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 1500);
    }
  } else {
    updateDOM();
  }
}

// BroadcastChannel for instant cross-window settings sync
const settingsChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('trivia-settings')
  : null;

export const useSettings = create((set) => ({
  settings: loadSettings(),
  updateSettings: (newSettings) => {
    set((current) => {
      const nextSettings = { ...current.settings, ...newSettings };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
      // Broadcast to all other windows (display screen, etc.)
      settingsChannel?.postMessage({ type: 'settings-update', settings: nextSettings });
      return { settings: nextSettings };
    });
  }
}));

if (typeof window !== 'undefined') {
  // BroadcastChannel listener — fires instantly in all other same-origin windows
  if (settingsChannel) {
    settingsChannel.onmessage = (event) => {
      if (event.data?.type === 'settings-update') {
        const nextSettings = { ...defaultSettings, ...event.data.settings };
        useSettings.setState({ settings: nextSettings });
        applyThemeToBody(nextSettings.theme);
      }
    };
  }

  // Fallback: storage event for tabs not using BroadcastChannel
  window.addEventListener('storage', (event) => {
    if (event.key !== SETTINGS_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      const nextSettings = { ...defaultSettings, ...parsed };
      useSettings.setState({ settings: nextSettings });
      applyThemeToBody(nextSettings.theme);
    } catch (error) {}
  });
}

export { applyThemeToBody, ALL_THEME_CLASSES };
