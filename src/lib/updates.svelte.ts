/**
 * Keeping the installed app current, without the app going online on its own.
 *
 *  - Desktop, opt-in: the Rust side (`src-tauri/src/updates.rs`) fetches the
 *    release manifest from icarus.4oli.com shortly after the diary opens and
 *    every few hours; the webview itself never touches the network. A newer
 *    version shows the notice (`UpdateNotice.svelte`) and a dot on the
 *    settings button until it is installed.
 *  - Everywhere else in the apps (Android, which has no network permission,
 *    and desktop with the check off): once the build is a month old, a monthly
 *    reminder asks whether to look for a new version. On desktop that runs a
 *    single check; on Android it opens the download page in the browser,
 *    which compares versions there.
 *
 * The browser app updates itself when the site is deployed, so it has none of
 * this. On the dev server, `?debug=updates`, `?debug=updates-reminder` and
 * `?debug=updates-android` fake each case to work on the UI in a browser.
 */
import {
  getSavedUpdateCheck,
  getSavedUpdateRemindAfter,
  getSavedUpdateReminder,
  setSavedUpdateCheck,
  setSavedUpdateRemindAfter,
  setSavedUpdateReminder,
} from './config';
import { debugFlag } from './debug';
import { devError } from './log';
import { runningOnAndroid, runningUnderTauri } from './runtime';
import { compareVersions, isVersion } from './semver';
import { DOWNLOAD_PAGE, openExternal } from './external';

const DAY = 86_400_000;
/** Wait after the diary opens, so the check never competes with it. */
const FIRST_CHECK_DELAY = 4_000;
/** How often a long-running window checks again. */
const RECHECK_INTERVAL = 6 * 60 * 60 * 1000;
/** A build this old probably has a successor, and the reminder repeats this often. */
export const REMINDER_INTERVAL = 30 * DAY;

export interface LatestRelease {
  version: string;
  /** ISO 8601 timestamp of the publish. */
  published: string;
}

export type UpdateStatus = 'idle' | 'checking' | 'done' | 'failed';

interface UpdateSource {
  currentVersion(): Promise<string>;
  /** When the running build was made, or null if unknown. */
  builtAt: Date | null;
  /** Ask the release manifest directly. Absent where the app has no network. */
  latestRelease?: () => Promise<LatestRelease>;
}

function buildDate(): Date | null {
  const date = typeof __ICARUS_BUILT_AT__ === 'string' ? new Date(__ICARUS_BUILT_AT__) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

async function tauriVersion(): Promise<string> {
  const { getVersion } = await import('@tauri-apps/api/app');
  return getVersion();
}

const desktopSource: UpdateSource = {
  currentVersion: tauriVersion,
  builtAt: buildDate(),
  async latestRelease() {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<LatestRelease>('latest_release');
  },
};

const androidSource: UpdateSource = { currentVersion: tauriVersion, builtAt: buildDate() };

function debugSource(kind: 'desktop' | 'reminder' | 'android'): UpdateSource {
  const source: UpdateSource = {
    currentVersion: async () => '0.2.0',
    builtAt: new Date(Date.now() - (kind === 'desktop' ? 2 : 41) * DAY),
  };
  if (kind === 'android') return source;
  source.latestRelease = async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { version: '0.3.0', published: new Date(Date.now() - 2 * DAY).toISOString() };
  };
  return source;
}

function pickSource(): UpdateSource | null {
  if (debugFlag('updates')) return debugSource('desktop');
  if (debugFlag('updates-reminder')) return debugSource('reminder');
  if (debugFlag('updates-android')) return debugSource('android');
  if (!runningUnderTauri() || typeof navigator === 'undefined') return null;
  return runningOnAndroid() ? androidSource : desktopSource;
}

function isLatestRelease(value: unknown): value is LatestRelease {
  const release = value as Partial<LatestRelease> | null;
  return (
    typeof release?.version === 'string' &&
    isVersion(release.version) &&
    typeof release.published === 'string' &&
    Number.isFinite(Date.parse(release.published))
  );
}

/** What looking for an update from the reminder found. */
export type LookResult = 'available' | 'current' | 'failed' | 'opened';

class Updates {
  private readonly source = pickSource();
  /** False in the browser app: the Settings section stays hidden. */
  readonly supported = this.source !== null;
  /** The app can ask for the latest version itself (desktop). */
  readonly canCheck = !!this.source?.latestRelease;
  readonly builtAt = this.source?.builtAt ?? null;

  /** The user's choice to check automatically (desktop). */
  enabled = $state(false);
  /** The user's choice to get the monthly reminder. */
  reminders = $state(true);
  status = $state<UpdateStatus>('idle');
  /** The running app's version. */
  current = $state('');
  latest = $state<LatestRelease | null>(null);
  /** The update notice was put away for this session ("Later" or "Download"). */
  snoozed = $state(false);
  /** The monthly reminder is due (set when the diary opens, cleared on answer). */
  reminderDue = $state(false);

  private remindAfter = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.source
      ?.currentVersion()
      .then((version) => (this.current = version))
      .catch((err) => devError('updates: could not read the app version', err));
  }

  /** A newer version than this one is published. */
  get available(): boolean {
    return this.latest !== null && this.current !== '' && compareVersions(this.latest.version, this.current) > 0;
  }

  /** Which notice to show, if any: a known update wins over the reminder. */
  get notice(): 'update' | 'reminder' | null {
    if (this.available && !this.snoozed) return 'update';
    if (this.reminderDue && !this.available && this.current !== '') return 'reminder';
    return null;
  }

  /** The reminder applies: on, and not replaced by automatic checks. */
  get remindsMonthly(): boolean {
    return this.reminders && !(this.canCheck && this.enabled);
  }

  /** The download page, told which version is installed so it can compare. */
  get downloadUrl(): string {
    return this.current ? `${DOWNLOAD_PAGE}?installed=${encodeURIComponent(this.current)}` : DOWNLOAD_PAGE;
  }

  /** Read the preferences stored beside a newly opened diary and act on them. */
  async load(now = Date.now()): Promise<void> {
    if (!this.supported) return;
    try {
      [this.enabled, this.reminders, this.remindAfter] = await Promise.all([
        this.canCheck ? getSavedUpdateCheck() : Promise.resolve(false),
        getSavedUpdateReminder(),
        getSavedUpdateRemindAfter(),
      ]);
    } catch (err) {
      devError('updates: could not read the update preferences', err);
      this.enabled = false;
    }
    this.reminderDue = this.isReminderDue(now);
    this.schedule(FIRST_CHECK_DELAY);
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    if (enabled) {
      this.reminderDue = false;
      void this.check();
    } else this.schedule(null);
    await setSavedUpdateCheck(enabled);
  }

  async setReminders(enabled: boolean): Promise<void> {
    this.reminders = enabled;
    if (!enabled) this.reminderDue = false;
    await setSavedUpdateReminder(enabled);
  }

  /** Ask for the latest version now (desktop). Resolves false when the check failed. */
  async check(): Promise<boolean> {
    const latestRelease = this.source?.latestRelease;
    if (!latestRelease || this.status === 'checking') return this.status !== 'failed';
    this.status = 'checking';
    try {
      const release: unknown = await latestRelease();
      if (!isLatestRelease(release)) throw new Error('Unexpected release manifest');
      this.latest = release;
      this.status = 'done';
      // Any answer, from Settings or the reminder, counts as having looked.
      if (this.reminderDue) void this.snoozeReminder();
      return true;
    } catch (err) {
      devError('updates: could not check for updates', err);
      this.status = 'failed';
      return false;
    } finally {
      if (this.enabled) this.schedule(RECHECK_INTERVAL);
    }
  }

  /**
   * Look for a new version on request (Settings, or the reminder): check
   * directly where the app can, otherwise open the download page. Either way
   * the reminder rests for another month.
   */
  async lookForUpdate(): Promise<LookResult> {
    if (!this.canCheck) {
      void this.snoozeReminder();
      await openExternal(this.downloadUrl);
      return 'opened';
    }
    // The reminder stays up (with its spinner) until there is an answer;
    // a successful check rests it, a failed one leaves it to retry.
    if (!(await this.check())) return 'failed';
    return this.available ? 'available' : 'current';
  }

  /** Open the download page and put the notice away. */
  async download(): Promise<void> {
    this.snoozed = true;
    await openExternal(this.downloadUrl);
  }

  snooze(): void {
    this.snoozed = true;
  }

  /** Quiet the reminder for another month ("Not now", or after looking). */
  async snoozeReminder(now = Date.now()): Promise<void> {
    this.reminderDue = false;
    this.remindAfter = now + REMINDER_INTERVAL;
    try {
      await setSavedUpdateRemindAfter(this.remindAfter);
    } catch (err) {
      devError('updates: could not save the reminder snooze', err);
    }
  }

  private isReminderDue(now: number): boolean {
    if (!this.remindsMonthly || !this.builtAt) return false;
    return now - this.builtAt.getTime() >= REMINDER_INTERVAL && now >= this.remindAfter;
  }

  private schedule(delay: number | null): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (delay === null || !this.enabled) return;
    this.timer = setTimeout(() => void this.check(), delay);
  }
}

export const updates = new Updates();
