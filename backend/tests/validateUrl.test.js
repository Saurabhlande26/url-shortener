
const isValidUrl = require("../src/utils/validateUrl");

describe("isValidUrl", () => {
  it("should return true for a valid HTTP URL", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("should return true for a valid HTTPS URL", () => {
    expect(isValidUrl("https://example.com/path")).toBe(true);
  });

  it("should return false for an invalid URL", () => {
    expect(isValidUrl("not-a-url")).toBe(false);
  });

  it("should return false for an empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("should reject FTP URLs", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
  });

  it("should reject URLs without a protocol", () => {
    expect(isValidUrl("example.com")).toBe(false);
  });

  it("should return false for an invalid URL format", () => {
    expect(isValidUrl("http://")).toBe(false);
  });
});
