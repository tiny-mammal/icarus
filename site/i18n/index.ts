/** The public site's catalogs. English (`en.ts`) is the source and the shape. */
import type { Locale } from '../../src/lib/i18n/locales';
import en from './en';
import es from './es';
import it from './it';
import fr from './fr';
import de from './de';

export type SiteMessages = typeof en;

export const SITE_MESSAGES: Record<Locale, SiteMessages> = { en, es, it, fr, de };
