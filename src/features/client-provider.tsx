"use client";

import * as React from "react";
import type { ActicallyClient } from "@/contracts/client";
import { getClient } from "@/lib/client";

const singletonClient = getClient();

interface ActicallyClientContextValue {
  value: ActicallyClient;
  setValue?: (client: ActicallyClient) => void;
}

const ActicallyClientContext = React.createContext<ActicallyClientContextValue>({
  value: singletonClient,
});

export function ActicallyClientProvider({
  children,
  value,
  setValue,
}: {
  children: React.ReactNode;
  value?: ActicallyClient;
  setValue?: (client: ActicallyClient) => void;
}) {
  const client = value ?? singletonClient;
  return (
    <ActicallyClientContext.Provider value={{ value: client, setValue }}>
      {children}
    </ActicallyClientContext.Provider>
  );
}

export function useActicallyClient(): ActicallyClient {
  const ctx = React.useContext(ActicallyClientContext);
  return ctx.value;
}

export { singletonClient as client };
