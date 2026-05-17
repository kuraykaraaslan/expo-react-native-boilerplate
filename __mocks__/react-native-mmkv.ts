const mockStorage: Record<string, string | number | boolean | Uint8Array> = {};

const mockMMKV = {
  getString: jest.fn((key: string) => mockStorage[key] as string | undefined),
  set: jest.fn((key: string, value: string | number | boolean | Uint8Array) => {
    mockStorage[key] = value;
  }),
  delete: jest.fn((key: string) => {
    delete mockStorage[key];
  }),
  contains: jest.fn((key: string) => key in mockStorage),
  getAllKeys: jest.fn(() => Object.keys(mockStorage)),
  clearAll: jest.fn(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  }),
};

export const MMKV = jest.fn().mockImplementation(() => mockMMKV);
