
jest.mock("../src/config/redis", () => ({
    eval: jest.fn(),
}));

const redisClient = require("../src/config/redis");
const authRateLimiter = require("../src/middleware/authRateLimit.middleware");

describe("Authentication rate limiter", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();

        redisClient.eval.mockResolvedValue(1);

        req = { ip: "127.0.0.1" };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        next = jest.fn();
    });

    it("allows a request within the limit", async () => {
        await authRateLimiter(req, res, next);

        expect(redisClient.eval).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it("rejects a request when the limit is reached", async () => {
        redisClient.eval.mockResolvedValue(0);

        await authRateLimiter(req, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Too many authentication attempts. Please try again later.",
        });

        expect(next).not.toHaveBeenCalled();
    });

    it("returns 503 when Redis fails", async () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });

        redisClient.eval.mockRejectedValue(new Error("Redis unavailable"));

        try {
            await authRateLimiter(req, res, next);

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Authentication service temporarily unavailable.",
            });

            expect(next).not.toHaveBeenCalled();
        } finally {
            consoleError.mockRestore();
        }
    });
});
