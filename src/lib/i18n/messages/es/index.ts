/** The Spanish catalog. Mirrors `../en`, key for key. */
import type { Messages } from '../en';
import common from './common';
import settings from './settings';
import app from './app';
import privacy from './privacy';
import editor from './editor';
import nav from './nav';
import stats from './stats';
import tracker from './tracker';

export default { common, settings, app, privacy, editor, nav, stats, tracker } satisfies Messages;
