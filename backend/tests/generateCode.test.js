
const generateShortCode = require("../src/utils/generateCode");

describe("generateShortCode", () => {
  it("should generate a code with the default length of 6", () => {
    const code = generateShortCode();

    expect(code).toHaveLength(6);
  });

  it("should generate a code with a custom length", () => {
    expect(generateShortCode(10)).toHaveLength(10);
  });

  it("should contain only letters and digits", () => {
    const code = generateShortCode(20);

    expect(code).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("should generate different codes across calls", () => {
    const codes = new Set(
      Array.from({ length: 10 }, () => generateShortCode())
    );

    expect(codes.size).toBeGreaterThan(1);
  });

  it("should return an empty string for length zero", () => {
    expect(generateShortCode(0)).toBe("");
  });
});
