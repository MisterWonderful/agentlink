/**
 * Terminal Sound Effects
 *
 * Subtle, professional sound effects for AgentLink Terminal.
 * Respects system sound settings and allows easy disabling.
 */

// Sound configuration
interface SoundConfig {
  enabled: boolean;
  volume: number;
  sounds: {
    messageSent: string;
    messageReceived: string;
    error: string;
    success: string;
    keystroke: string;
  };
}

// Default configuration
const defaultConfig: SoundConfig = {
  enabled: false, // Disabled by default - user must opt-in
  volume: 0.3,
  sounds: {
    messageSent: "",
    messageReceived: "",
    error: "",
    success: "",
    keystroke: "",
  },
};

// Current configuration (mutable)
let config: SoundConfig = { ...defaultConfig };

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

/**
 * Initialize the audio context
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext)();
    } catch {
      console.warn("Web Audio API not supported");
      return null;
    }
  }

  // Resume if suspended (browser policy)
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

/**
 * Generate a subtle click sound using Web Audio API
 */
function generateClickSound(frequency: number = 800, duration: number = 0.05): void {
  const ctx = getAudioContext();
  if (!ctx || !config.enabled) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(config.volume * 0.5, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

/**
 * Generate a success chime sound
 */
function generateSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx || !config.enabled) return;

  const frequencies = [523.25, 659.25, 783.99]; // C major chord
  const duration = 0.1;

  frequencies.forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.05);
    oscillator.type = "sine";

    const startTime = ctx.currentTime + index * 0.05;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(config.volume * 0.3, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
}

/**
 * Generate an error sound
 */
function generateErrorSound(): void {
  const ctx = getAudioContext();
  if (!ctx || !config.enabled) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(200, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
  oscillator.type = "sawtooth";

  gainNode.gain.setValueAtTime(config.volume * 0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);
}

/**
 * Generate message sent sound
 */
function generateMessageSentSound(): void {
  generateClickSound(600, 0.08);
}

/**
 * Generate message received sound
 */
function generateMessageReceivedSound(): void {
  const ctx = getAudioContext();
  if (!ctx || !config.enabled) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(440, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(config.volume * 0.2, ctx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

/**
 * Terminal sound effects API
 */
export const terminalSounds = {
  /**
   * Play message sent sound
   */
  messageSent: (): void => {
    generateMessageSentSound();
  },

  /**
   * Play message received sound
   */
  messageReceived: (): void => {
    generateMessageReceivedSound();
  },

  /**
   * Play error sound
   */
  error: (): void => {
    generateErrorSound();
  },

  /**
   * Play success sound
   */
  success: (): void => {
    generateSuccessSound();
  },

  /**
   * Play keystroke sound
   */
  keystroke: (): void => {
    generateClickSound(1200, 0.02);
  },

  /**
   * Enable or disable sounds
   */
  setEnabled: (enabled: boolean): void => {
    config.enabled = enabled;
    if (enabled && typeof window !== "undefined") {
      // Initialize audio context on user interaction
      void getAudioContext()?.resume();
    }
  },

  /**
   * Check if sounds are enabled
   */
  isEnabled: (): boolean => {
    return config.enabled;
  },

  /**
   * Set volume (0-1)
   */
  setVolume: (volume: number): void => {
    config.volume = Math.max(0, Math.min(1, volume));
  },

  /**
   * Get current volume
   */
  getVolume: (): number => {
    return config.volume;
  },

  /**
   * Toggle sound on/off
   */
  toggle: (): boolean => {
    config.enabled = !config.enabled;
    if (config.enabled) {
      void getAudioContext()?.resume();
    }
    return config.enabled;
  },
};

/**
 * Hook to check if sounds should be enabled
 * Respects system sound settings
 */
export function shouldEnableSounds(): boolean {
  if (typeof window === "undefined") return false;

  // Check for system preference (some browsers support this)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prefersSilent = (navigator as any).doNotTrack === "1";

  // Check for low power mode on mobile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isLowPower = (navigator as any).getBattery
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).getBattery().then((b: unknown) => {
        const battery = b as { charging: boolean; level: number };
        return !battery.charging && battery.level < 0.2;
      })
    : Promise.resolve(false);

  return !prefersSilent && !isLowPower;
}

/**
 * Initialize sounds with user preference
 */
export function initializeSounds(userEnabled: boolean): void {
  config.enabled = userEnabled;

  if (userEnabled && typeof window !== "undefined") {
    // Add interaction listener to initialize audio context
    const initAudio = (): void => {
      void getAudioContext()?.resume();
      document.removeEventListener("click", initAudio);
      document.removeEventListener("keydown", initAudio);
    };

    document.addEventListener("click", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });
  }
}

export default terminalSounds;
