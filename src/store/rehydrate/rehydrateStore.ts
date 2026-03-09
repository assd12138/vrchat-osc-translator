import { REDUX_STORAGE_KEY, rehydrateFlag } from "./rehydrateConstant";

export function redux_store(module: string, data: string) {
  if (!rehydrateFlag.flag) return;

  // biome-ignore lint/suspicious/noExplicitAny: 任意存储，无需定义
  const obj: any = JSON.parse(
    localStorage.getItem(REDUX_STORAGE_KEY) || JSON.stringify({}),
  );
  obj[module] = data;
  localStorage.setItem(REDUX_STORAGE_KEY, JSON.stringify(obj));
}
