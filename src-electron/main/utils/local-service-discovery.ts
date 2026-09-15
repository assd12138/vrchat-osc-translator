import Bonjour, { type Service } from "bonjour-service";

export const LOCAL_SERVICE_TYPE = "vt";
const PROTOCOL = "tcp";

export interface LocalService {
  host: string;
  port: number;
}

let bonjour: Bonjour | null = null;
let browser: ReturnType<Bonjour["find"]> | null = null;
const services = new Map<string, LocalService>();

function toLocalService(service: Service): LocalService | null {
  const host = (service.addresses ?? []).find(
    (address) => address === "127.0.0.1" || address === "::1",
  );
  if (!host || !Number.isInteger(service.port) || service.port < 1) {
    return null;
  }

  return {
    host,
    port: service.port,
  };
}

function updateService(service: Service) {
  console.log(service);
  const localService = toLocalService(service);
  if (localService) {
    services.set(service.fqdn, localService);
  } else {
    services.delete(service.fqdn);
  }
}

export function startLocalServiceDiscovery() {
  if (browser) {
    return;
  }

  bonjour = new Bonjour({}, (error: Error) => {
    console.error("mDNS discovery error:", error);
  });
  browser = bonjour.find({
    type: LOCAL_SERVICE_TYPE,
    protocol: PROTOCOL,
  });

  browser.on("up", updateService);
  browser.on("srv-update", updateService);
  browser.on("txt-update", updateService);
  browser.on("down", (service) => {
    services.delete(service.fqdn);
  });
}

export function stopLocalServiceDiscovery() {
  browser?.stop();
  browser = null;
  services.clear();
  bonjour?.destroy();
  bonjour = null;
}

export function getLocalService(): LocalService | null {
  return services.values().next().value ?? null;
}
