
jest.mock("../src/services/click.service", () => ({
  getUrlAnalytics: jest.fn(),
}));

jest.mock("../src/middleware/auth.middleware", () =>
  jest.fn((req, res, next) => {
    req.user = { id: "user-1" };
    next();
  })
);

const request = require("supertest");
const app = require("../src/app");
const { getUrlAnalytics } = require("../src/services/click.service");

describe("GET /api/urls/:id/analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return analytics successfully", async () => {
    const mockAnalytics = {
      totalClicks: 10,
      clicks: [
        {
          id: "click-1",
          createdAt: "2026-10-28T10:00:00.000Z",
          referer: "https://google.com",
        },
      ],
    };

    getUrlAnalytics.mockResolvedValue(mockAnalytics);

    const response = await request(app)
      .get("/api/urls/url-1/analytics");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: mockAnalytics,
    });
    expect(getUrlAnalytics).toHaveBeenCalledWith(
      "url-1",
      "user-1"
    );
  });

  it("should return 404 when the URL is not found", async () => {
    const error = new Error("URL not found");
    error.statusCode = 404;

    getUrlAnalytics.mockRejectedValue(error);

    const response = await request(app)
      .get("/api/urls/missing/analytics");

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "URL not found",
    });
  });

  it("should return 500 when analytics retrieval fails", async () => {
    getUrlAnalytics.mockRejectedValue(
      new Error("Analytics retrieval failed")
    );

    const response = await request(app)
      .get("/api/urls/url-1/analytics");

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Analytics retrieval failed",
    });
  });
});
