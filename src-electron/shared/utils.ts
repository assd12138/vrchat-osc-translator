export function camelToSnake(str: string) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1_$2").toLowerCase();
}
