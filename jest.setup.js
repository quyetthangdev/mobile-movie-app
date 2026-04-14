// Mock expo winter runtime to avoid import.meta issues in Jest
jest.mock('expo/src/winter/ImportMetaRegistry', () => ({
  ImportMetaRegistry: { url: 'http://localhost/' },
}))
