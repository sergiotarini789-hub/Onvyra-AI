import { CRMProvider } from "./types";
import { MockCRMProvider } from "./mock";
import { HubSpotProvider } from "./hubspot";

export type CRMProviderName = "mock" | "hubspot" | "pipedrive";

export function getCRMProvider(name: CRMProviderName = "mock"): CRMProvider {
  switch (name) {
    case "hubspot":
      return new HubSpotProvider();
    case "mock":
    default:
      return new MockCRMProvider();
  }
}

export * from "./types";
export { MockCRMProvider } from "./mock";
export { HubSpotProvider } from "./hubspot";
