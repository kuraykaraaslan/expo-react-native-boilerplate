import { setupServer } from "msw/node";
import { handlers } from "./_handlers";

export const server = setupServer(...handlers);
