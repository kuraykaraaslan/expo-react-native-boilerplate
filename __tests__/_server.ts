import { setupServer } from "msw/native";
import { handlers } from "./_handlers";

export const server = setupServer(...handlers);
