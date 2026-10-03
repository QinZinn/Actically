import type { ActicallyClient } from "@/contracts/client";
import MockAdapter from "./mockAdapter";
import HttpAdapter from "./httpAdapter";

export * from "./errors";
export * from "./utils";

export function createActicallyClient(): ActicallyClient {
  const isDemoEnv = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (isDemoEnv) {
    return new MockAdapter();
  }

  return new HttpAdapter();
}

let singletonClient: ActicallyClient | null = null;

export function getClient(): ActicallyClient {
  if (!singletonClient) {
    singletonClient = createActicallyClient();
  }
  return singletonClient;
}
