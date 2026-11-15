import type { ReactionProtocol, ReactionSessionInput, ReactionTrialInput } from '@hestia/api-client';

export type ReactionPhase = 'intro' | 'wait' | 'go' | 'feedback' | 'ready' | 'paused' | 'done';
export type ReactionState = {
  phase: ReactionPhase;
  mode: 'practice' | 'measured';
  trialNumber: number;
  practiceCompleted: number;
  feedback: string;
  trials: ReactionTrialInput[];
  result: ReactionSessionInput | null;
};

export type ReactionClock = {
  now: () => number;
  date: () => string;
  random: () => number;
  id: () => string;
  later: (callback: () => void, ms: number) => number;
  cancel: (id: number) => void;
  frame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
};

const initialState = (): ReactionState => ({
  phase: 'intro',
  mode: 'practice',
  trialNumber: 1,
  practiceCompleted: 0,
  feedback: '',
  trials: [],
  result: null,
});

/** Offline preview only; the station recomputes these from the raw attempts. */
export function previewReaction(trials: ReactionTrialInput[]) {
  const valid = trials
    .filter((trial) => trial.outcome === 'valid' && trial.reaction_ms != null)
    .map((trial) => trial.reaction_ms!)
    .sort((a, b) => a - b);
  const middle = Math.floor(valid.length / 2);
  return {
    median: valid.length ? (valid[middle] + valid[Math.floor((valid.length - 1) / 2)]) / 2 : null,
    valid: valid.length,
    falseStarts: trials.filter((trial) => trial.outcome === 'false_start').length,
    noResponses: trials.filter((trial) => trial.outcome === 'no_response').length,
  };
}

/** Synchronous guards prevent two input events from recording the same trial. */
export class ReactionRunner {
  state = initialState();
  private timer: number | null = null;
  private frameId: number | null = null;
  private signalAt = 0;
  private sessionId = '';
  private startedAt = '';
  private protocol: ReactionProtocol;
  private deviceId: string | null;
  private clock: ReactionClock;
  private publish: (state: ReactionState, signal?: boolean) => void;

  constructor(
    protocol: ReactionProtocol,
    deviceId: string | null,
    clock: ReactionClock,
    publish: (state: ReactionState, signal?: boolean) => void,
  ) {
    this.protocol = protocol;
    this.deviceId = deviceId;
    this.clock = clock;
    this.publish = publish;
  }

  private update(patch: Partial<ReactionState>, signal = false) {
    this.state = { ...this.state, ...patch };
    this.publish(this.state, signal);
  }

  dispose() {
    if (this.timer != null) this.clock.cancel(this.timer);
    if (this.frameId != null) this.clock.cancelFrame(this.frameId);
    this.timer = this.frameId = null;
  }

  start() {
    this.dispose();
    this.state = initialState();
    this.sessionId = this.clock.id();
    this.startedAt = this.clock.date();
    this.arm();
  }

  startMeasured() {
    if (this.state.phase !== 'ready') return;
    this.update({ mode: 'measured', trialNumber: 1 });
    this.arm();
  }

  private arm() {
    this.dispose();
    if (this.state.trials.length >= this.protocol.max_attempts) {
      this.finish('interrupted', 'Too many attempts. Restart when you are ready.');
      return;
    }
    this.update({ phase: 'wait', feedback: '' });
    const wait =
      this.protocol.wait_min_ms +
      this.clock.random() * (this.protocol.wait_max_ms - this.protocol.wait_min_ms);
    this.timer = this.clock.later(() => {
      this.frameId = this.clock.frame(() => {
        if (this.state.phase !== 'wait') return;
        this.update({ phase: 'go' }, true);
        this.signalAt = this.clock.now();
        this.timer = this.clock.later(() => this.respond('no_response'), this.protocol.response_timeout_ms);
      });
    }, wait);
  }

  tap() {
    if (this.state.phase === 'wait') this.respond('false_start');
    else if (this.state.phase === 'go') {
      const elapsed = this.clock.now() - this.signalAt;
      if (elapsed >= this.protocol.response_timeout_ms) this.respond('no_response');
      else this.respond('valid', Math.max(0, elapsed));
    }
  }

  private respond(outcome: 'valid' | 'false_start' | 'no_response', reactionMs?: number) {
    if (this.state.phase !== 'wait' && this.state.phase !== 'go') return;
    this.dispose();
    const attempt: ReactionTrialInput = { trial_number: this.state.trialNumber, outcome };
    if (reactionMs != null) attempt.reaction_ms = reactionMs;
    const trials = this.state.mode === 'measured' ? [...this.state.trials, attempt] : this.state.trials;
    const feedback =
      outcome === 'false_start'
        ? 'Too early. Wait for the signal.'
        : outcome === 'no_response'
          ? 'No response. This trial has no reaction time.'
          : `${Math.round(reactionMs!)} ms`;
    const completed = outcome !== 'false_start';
    const number = this.state.trialNumber;
    this.update({
      phase: 'feedback',
      feedback,
      trials,
      practiceCompleted: this.state.mode === 'practice' && completed ? number : this.state.practiceCompleted,
    });
    if (this.state.mode === 'measured' && completed && number === this.protocol.measured_trials) {
      this.finish('complete');
      return;
    }
    this.timer = this.clock.later(() => {
      if (this.state.mode === 'practice' && completed && number === this.protocol.practice_trials) {
        this.update({ phase: 'ready', trialNumber: 1 });
      } else {
        this.update({ trialNumber: completed ? number + 1 : number });
        this.arm();
      }
    }, this.protocol.feedback_ms);
  }

  interrupt() {
    if (!['wait', 'go', 'feedback', 'ready'].includes(this.state.phase)) return;
    if (this.state.mode === 'measured' && ['wait', 'go'].includes(this.state.phase)) {
      this.update({
        trials: [...this.state.trials, { trial_number: this.state.trialNumber, outcome: 'interrupted' }],
      });
    }
    this.finish(
      'interrupted',
      'The test was interrupted when the app lost focus. This session is not complete.',
    );
  }

  abandon() {
    if (this.state.phase === 'intro' || this.state.phase === 'done' || this.state.phase === 'paused') return;
    this.finish('abandoned', 'Session abandoned. It will not be used in your personal reference.');
  }

  private finish(status: ReactionSessionInput['status'], feedback = '') {
    this.dispose();
    const result: ReactionSessionInput = {
      id: this.sessionId,
      protocol_version: this.protocol.version,
      device_id: this.deviceId,
      started_at: this.startedAt,
      ended_at: this.clock.date(),
      status,
      source: 'manual',
      practice_completed: this.state.practiceCompleted,
      trials: this.state.trials,
    };
    this.update({ phase: status === 'complete' ? 'done' : 'paused', feedback, result });
  }
}
