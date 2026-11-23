/**
 * The English catalog: the source every translation mirrors. Each namespace
 * lives in its own file; `Messages` is its shape, which every other language
 * must match (`satisfies Messages` in its own index).
 */
import common from './common';
import settings from './settings';
import app from './app';
import privacy from './privacy';
import editor from './editor';
import nav from './nav';
import stats from './stats';
import tracker from './tracker';

const en = { common, settings, app, privacy, editor, nav, stats, tracker };

export type Messages = typeof en;
export default en;
