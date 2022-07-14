/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTRPCClient, createTRPCClientProxy, createWSClient, httpLink, splitLink, wsLink } from "@trpc/client";
import AbortController from "abort-controller";
import ws from "ws";

import type { AppRouter } from "./server.mjs";

// polyfill fetch & websocket
const globalAny = global as any;
globalAny.AbortController = AbortController;
globalAny.fetch = fetch;
globalAny.WebSocket = ws;

const wsClient = createWSClient({
  url: `ws://localhost:2022`,
});

const client = createTRPCClient<AppRouter>({
  links: [
    // call subscriptions through websockets and the rest over http
    splitLink({
      condition: (op) => op.type === "subscription",
      true: wsLink({ client: wsClient }),
      false: httpLink({ url: `http://localhost:2022` }),
    }),
  ],
});

const proxy = createTRPCClientProxy(client);

async function main() {
  const helloResponse = await proxy.greeting.query({ name: "world" });
  console.log("helloResponse", helloResponse);

  const createUserRes = await proxy.createUser.mutate({ name: "Bilbo" });
  console.log(createUserRes);

  // Why can't use rxjs/operators here?
  // It would be nice to simple do randomNumber$.pipe(take(3))
  let count = 0;
  await new Promise<void>((resolve) => {
    const subscription = client.subscription("randomNumber", undefined, {
      next(data) {
        // ^ note that `data` here is inferred
        console.log("received", data);
        count++;
        if (count > 3) {
          // stop after 3 pulls
          subscription.unsubscribe();
          resolve();
        }
      },
      error(err) {
        console.error("error", err);
      },
    });
  });

  wsClient.close();
}

main();
