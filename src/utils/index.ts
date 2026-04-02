export async function loadMicDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  const micDevices = devices.filter((device) => device.kind === "audioinput");
  return micDevices;
}
