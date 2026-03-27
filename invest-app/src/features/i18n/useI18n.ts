import { useSettingsStore } from '../settings/store/settingsStore';
import { translate } from './translations';
import type { AppLanguage } from './types';

export function useI18n() {
  const language = useSettingsStore((s) => s.language);
  return {
    language,
    t: (key: string, params?: Record<string, string | number>) => translate(language, key, params),
  };
}

export function getAppLanguage(): AppLanguage {
  return useSettingsStore.getState().language;
}

export function tFromStore(key: string, params?: Record<string, string | number>): string {
  return translate(getAppLanguage(), key, params);
}
