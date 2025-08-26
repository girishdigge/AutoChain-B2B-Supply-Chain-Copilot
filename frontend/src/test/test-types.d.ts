// Type declarations for test files
declare global {
  function describe(description: string, spec: () => void): void;
  function it(description: string, spec: () => void): void;
  function beforeEach(action: () => void): void;

  namespace jest {
    interface Matchers<R> {
      toBe(expected: any): R;
      toHaveLength(expected: number): R;
      toContain(expected: any): R;
      toBeDefined(): R;
    }
  }

  function expect<T>(actual: T): jest.Matchers<T>;
}

export {};
