export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

export const useRouter = jest.fn(() => router);
export const useLocalSearchParams = jest.fn(() => ({}));
export const usePathname = jest.fn(() => "/");
export const useSegments = jest.fn(() => []);
export const Redirect = jest.fn(() => null);
export const Slot = jest.fn(() => null);
export const Link = jest.fn(({ children }: { children: React.ReactNode }) => children);
export const Stack = {
  Screen: jest.fn(() => null),
};
export const Tabs = {
  Screen: jest.fn(() => null),
};
