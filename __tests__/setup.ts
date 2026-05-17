import "@testing-library/jest-native/extend-expect";
import { server } from "./_server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
