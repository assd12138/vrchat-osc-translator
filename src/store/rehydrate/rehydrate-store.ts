import type { PanelExpansionState } from "../settings";
import {
  type EApiProviderType,
  REDUX_STORAGE_KEY,
  rehydrateFlag,
} from "./rehydrate-constant";

export function redux_store(
  module: string,
  data: string | EApiProviderType | boolean | string[] | PanelExpansionState,
) {
  if (!rehydrateFlag.flag) return;

  // biome-ignore lint/suspicious/noExplicitAny: 任意存储，无需定义
  const obj: any = JSON.parse(
    localStorage.getItem(REDUX_STORAGE_KEY) || JSON.stringify({}),
  );
  obj[module] = data;
  localStorage.setItem(REDUX_STORAGE_KEY, JSON.stringify(obj));
}
