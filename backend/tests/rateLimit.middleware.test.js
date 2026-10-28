
jest.mock("../src/config/redis", () => ({
    zRemRangeByScore: jest.fn(),
    zCard: jest.fn(),
    zAdd: jest.fn(),
    pExpire: jest.fn(),
}));

const redisClient = require("../src/config/redis");
const rateLimiter = require("../src/middleware/rateLimit.middleware");

describe("Rate limiter middleware", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();

        redisClient.zRemRangeByScore.mockResolvedValue(0);
        redisClient.zCard.mockResolvedValue(0);
        redisClient.zAdd.mockResolvedValue(1);
        redisClient.pExpire.mockResolvedValue(true);

        req = {
            user: { id: "user-123" },
            ip: "127.0.0.1",
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        next = jest.fn();
    });

    it("should allow a request within the limit", async () => {
        await rateLimiter(req, res, next);

        expect(redisClient.zRemRangeByScore).toHaveBeenCalled();
        expect(redisClient.zCard).toHaveBeenCalled();
        expect(redisClient.zAdd).toHaveBeenCalled();
        expect(redisClient.pExpire).toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it("should use the authenticated user's ID as the identifier", async () => {
        await rateLimiter(req, res, next);

        expect(redisClient.zRemRangeByScore).toHaveBeenCalledWith(
            "rate-limit:url-create:user:user-123",
            0,
            expect.any(Number)
        );
    });

    it("should use the IP address when no user is authenticated", async () => {
        req.user = undefined;

        await rateLimiter(req, res, next);

        expect(redisClient.zRemRangeByScore).toHaveBeenCalledWith(
            "rate-limit:url-create:ip:127.0.0.1",
            0,
            expect.any(Number)
        );
    });

    it("should reject a request when the limit is reached", async () => {
        redisClient.zCard.mockResolvedValue(100);

        await rateLimiter(req, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Too many requests. Please try again later.",
        });
        expect(redisClient.zAdd).not.toHaveBeenCalled();
        expect(redisClient.pExpire).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    it("should continue if Redis throws an error", async () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });

        redisClient.zCard.mockRejectedValue(new Error("Redis unavailable"));

        await rateLimiter(req, res, next);

        expect(consoleError).toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();

        consoleError.mockRestore();
    });
});
