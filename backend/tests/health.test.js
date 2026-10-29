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

  test("allows requests from the local frontend origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"])
      .toBe("http://localhost:5173");
  });

  test("does not grant CORS access to an untrusted origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://untrusted.example");

    expect(response.headers["access-control-allow-origin"])
      .toBeUndefined();
  });

  test("sets security headers using Helmet", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });
});