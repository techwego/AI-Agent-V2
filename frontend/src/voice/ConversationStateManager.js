export const State = {
  IDLE: 'IDLE',
  INTRODUCING: 'INTRODUCING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  RETRIEVING: 'RETRIEVING',
  GENERATING: 'GENERATING',
  SPEAKING: 'SPEAKING'
};

const VALID_TRANSITIONS = {
  [State.IDLE]: [State.INTRODUCING, State.LISTENING],
  [State.INTRODUCING]: [State.IDLE, State.LISTENING],
  [State.LISTENING]: [State.PROCESSING, State.IDLE],
  [State.PROCESSING]: [State.RETRIEVING, State.IDLE],
  [State.RETRIEVING]: [State.GENERATING, State.IDLE],
  [State.GENERATING]: [State.SPEAKING, State.IDLE],
  [State.SPEAKING]: [State.IDLE, State.LISTENING]
};

const STATUS_TEXTS = {
  [State.IDLE]: 'Idle',
  [State.INTRODUCING]: 'Introducing...',
  [State.LISTENING]: 'Listening...',
  [State.PROCESSING]: 'Processing Speech...',
  [State.RETRIEVING]: 'Retrieving Information...',
  [State.GENERATING]: 'Generating Response...',
  [State.SPEAKING]: 'Speaking...'
};

class ConversationStateManager {
  constructor() {
    this.currentState = State.IDLE;
    this.listeners = new Set();
  }

  getState() {
    return this.currentState;
  }

  canTransitionTo(newState) {
    if (newState === State.IDLE) return true; // Emergency reset
    const allowed = VALID_TRANSITIONS[this.currentState] || [];
    return allowed.includes(newState);
  }

  setState(newState) {
    if (!this.canTransitionTo(newState)) {
      console.warn(`Invalid state transition from ${this.currentState} to ${newState}`);
      return false;
    }

    this.currentState = newState;
    this.notifyListeners();
    return true;
  }

  reset() {
    this.currentState = State.IDLE;
    this.notifyListeners();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.currentState); // Initial state push
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  getStatusText() {
    return STATUS_TEXTS[this.currentState] || 'Unknown Status';
  }
}

const instance = new ConversationStateManager();
export default instance;
