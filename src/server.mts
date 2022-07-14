import { CreateHTTPContextOptions, createHTTPServer } from "@trpc/server/adapters/standalone";
import { CreateWSSContextFnOptions, applyWSSHandler } from "@trpc/server/adapters/ws";
import { observable } from "@trpc/server/observable";
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import { WebSocketServer } from "ws";
import { z } from "zod";

// This is how you initialize a context for the server
function createContext(_opts: CreateHTTPContextOptions | CreateWSSContextFnOptions) {
  return {};
}

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC<{ ctx: Context }>()();

const appRouter = t.router({
  greeting: t.procedure.input(z.object({ name: z.string() })).query(({ input }) => {
    return `Hello ${input.name}`;
  }),
  getUser: t.procedure.input(z.string()).query((req) => {
    return { id: req.input, name: "Bilbo" };
  }),
  createUser: t.procedure.input(z.object({ name: z.string() })).mutation((req) => {
    return { id: "1", name: req.input.name };
  }),
  randomNumber: t.procedure.subscription(() => {
    return observable<{ randomNumber: number }>((emit) => {
      const timer = setInterval(() => {
        emit.next({ randomNumber: Math.random() });
      }, 200);

      return () => {
        console.log("cleaning up");
        clearInterval(timer);
      };
    });
  }),
});

// only export *type signature* of router!
// to avoid accidentally importing your API
// into client-side code
export type AppRouter = typeof appRouter;

// http server
const { server, listen } = createHTTPServer({
  router: appRouter,
  createContext,
});

// ws server
const wss = new WebSocketServer({ server });
applyWSSHandler<AppRouter>({
  wss,
  router: appRouter,
  createContext,
});

// setInterval(() => {
//   console.log('Connected clients', wss.clients.size);
// }, 1000);
listen(2022);

console.log("🐹 Listening on: http://localhost:2022");
