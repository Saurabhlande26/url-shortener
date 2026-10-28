
jest.mock("jsonwebtoken", () => ({
    verify: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const authenticate = require("../src/middleware/auth.middleware");

describe("Authentication middleware", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();

        req = { headers: {} };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        next = jest.fn();
        process.env.JWT_SECRET = "test-secret";
    });

    it("should return 401 when authorization header is missing", () => {
        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Authorization header is required",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should reject an authorization header with the wrong scheme", () => {
        req.headers.authorization = "Basic abc123";

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid authorization format",
        });
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it("should reject a missing bearer token", () => {
        req.headers.authorization = "Bearer ";

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid authorization format",
        });
    });

    it("should reject an invalid or expired token", () => {
        req.headers.authorization = "Bearer invalid-token";
        jwt.verify.mockImplementation(() => {
            throw new Error("jwt expired");
        });

        authenticate(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith(
            "invalid-token",
            "test-secret"
        );
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid or expired token",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should attach the user and call next for a valid token", () => {
        req.headers.authorization = "Bearer valid-token";
        jwt.verify.mockReturnValue({ userId: "user-123" });

        authenticate(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith(
            "valid-token",
            "test-secret"
        );
        expect(req.user).toEqual({ id: "user-123" });
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
