
jest.mock("../src/services/url.service", () => ({
  createShortUrl: jest.fn(),
  getUserUrls: jest.fn(),
  deleteUserUrl: jest.fn(),
}));

// Mock authentication: simulate a logged-in user.
jest.mock("../src/middleware/auth.middleware", () =>
  jest.fn((req, res, next) => {
    req.user = { id: "user-1" };
    next();
  })
);

// Mock rate limiter so it doesn't interfere with tests.
jest.mock("../src/middleware/rateLimit.middleware", () =>
  jest.fn((req, res, next) => next())
);

const request = require("supertest");
const app = require("../src/app");
const { BadRequestError } = require("../src/utils/errors");
const {
  createShortUrl,
  getUserUrls,
  deleteUserUrl,
} = require("../src/services/url.service");

describe("URL API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/urls", () => {
    it("should create a short URL successfully", async () => {
      createShortUrl.mockResolvedValue({
        id: "url-1",
        shortCode: "abc123",
        originalUrl: "https://example.com",
        clickCount: 0,
        createdAt: "2026-10-28T10:00:00.000Z",
      });

      const response = await request(app)
        .post("/api/urls")
        .send({ originalUrl: "https://example.com" });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shortCode).toBe("abc123");
      expect(response.body.data.shortUrl).toBe(
        "http://localhost:5000/abc123"
      );

      expect(createShortUrl).toHaveBeenCalledWith({
        originalUrl: "https://example.com",
        customAlias: undefined,
        userId: "user-1",
      });
    });


    it("should return 400 when originalUrl is missing", async () => {
      createShortUrl.mockRejectedValue(
        new BadRequestError("Original URL is required")
      );

      const response = await request(app)
        .post("/api/urls")
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Original URL is required");
    });

  });

  describe("GET /api/urls", () => {
    it("should return the user's URLs", async () => {
      getUserUrls.mockResolvedValue([
        {
          id: "url-1",
          shortCode: "abc123",
          originalUrl: "https://example.com",
          clickCount: "5",
          expiresAt: null,
          isActive: true,
          createdAt: "2026-10-28T10:00:00.000Z",
        },
      ]);

      const response = await request(app).get("/api/urls");

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].clickCount).toBe(5);
      expect(getUserUrls).toHaveBeenCalledWith("user-1");
    });

    it("should return 500 when fetching URLs fails", async () => {
      getUserUrls.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/urls");

      expect(response.body.message).toBe("Internal Server Error");
      expect(response.body.message).toBe("Internal Server Error");
    });
  });

  describe("DELETE /api/urls/:id", () => {
    it("should delete a URL successfully", async () => {
      deleteUserUrl.mockResolvedValue(undefined);

      const response = await request(app).delete("/api/urls/url-1");

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "URL deleted successfully",
      });
      expect(deleteUserUrl).toHaveBeenCalledWith("url-1", "user-1");
    });

    it("should return an error when URL deletion fails", async () => {
      const error = new Error("URL not found");
      error.statusCode = 404;
      deleteUserUrl.mockRejectedValue(error);

      const response = await request(app).delete("/api/urls/missing");

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe("URL not found");
    });
  });
});
