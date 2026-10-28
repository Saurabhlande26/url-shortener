
jest.mock("../src/services/auth.service", () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const { registerUser, loginUser } = require("../src/services/auth.service");

describe("Authentication API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a user successfully", async () => {
      registerUser.mockResolvedValue({
        id: "1",
        email: "test@example.com",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "Password123!",
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    it("should return 400 when registration fails", async () => {
      registerUser.mockRejectedValue(new Error("Email already exists"));

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "Password123!",
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Email already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should log in successfully", async () => {
      loginUser.mockResolvedValue({
        token: "mock-jwt-token",
        user: {
          id: "1",
          email: "test@example.com",
        },
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "Password123!",
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(loginUser).toHaveBeenCalledTimes(1);
    });

    it("should return 401 when login fails", async () => {
      loginUser.mockRejectedValue(new Error("Invalid credentials"));

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrong-password",
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
    });
  });
});
