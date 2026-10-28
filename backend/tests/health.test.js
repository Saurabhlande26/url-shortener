
const request = require("supertest");
const app = require("../src/app");

describe("GET /health", () => {
  it("should return API health status", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("URL Shortener API is running");
    expect(["connected", "disconnected"]).toContain(response.body.redis);
  });
});
