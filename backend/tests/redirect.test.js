
jest.mock("../src/services/redirect.service", () => ({
  getOriginalUrl: jest.fn(),
}));

jest.mock("../src/services/analytics.stream", () => ({
  publishClickEvent: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const app = require("../src/app");
const { getOriginalUrl } = require("../src/services/redirect.service");
const { publishClickEvent } = require("../src/services/analytics.stream");

describe("GET /:shortCode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should redirect to the original URL", async () => {
    getOriginalUrl.mockResolvedValue({
      id: "1",
      originalUrl: "https://example.com",
    });

    const response = await request(app).get("/test123");

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("https://example.com");
    expect(publishClickEvent).toHaveBeenCalledTimes(1);
  });

  it("should return 404 when the short URL does not exist", async () => {
    const error = new Error("Short URL not found");
    error.statusCode = 404;
    getOriginalUrl.mockRejectedValue(error);

    const response = await request(app).get("/missing123");

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Short URL not found",
    });
    expect(publishClickEvent).not.toHaveBeenCalled();
  });

  it("should return 410 when the short URL has expired", async () => {
    const error = new Error("This short URL has expired");
    error.statusCode = 410;
    getOriginalUrl.mockRejectedValue(error);

    const response = await request(app).get("/expired123");

    expect(response.statusCode).toBe(410);
    expect(response.body.message).toBe("This short URL has expired");
  });
});
