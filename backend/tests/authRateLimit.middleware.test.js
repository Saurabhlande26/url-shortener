
jest.mock("../src/config/redis", () => ({
    zRemRangeByScore: jest.fn(),
    zCard: jest.fn(),
    zAdd: jest.fn(),
    pExpire: jest.fn(),
}));

const redisClient = require("../src/config/redis");
const authRateLimiter = require("../src/middleware/authRateLimit.middleware");

describe("Authentication rate limiter", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();

        redisClient.zRemRangeByScore.mockResolvedValue(0);
        redisClient.zCard.mockResolvedValue(0);
        redisClient.zAdd.mockResolvedValue(1);
        redisClient.pExpire.mockResolvedValue(true);

        req = { ip: "127.0.0.1" };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        next = jest.fn();
    });

    it("allows a request within the limit", async () => {
        await authRateLimiter(req, res, next);

        expect(redisClient.zCard).toHaveBeenCalled();
        expect(redisClient.zAdd).toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it("rejects a request when the limit is reached", async () => {
        redisClient.zCard.mockResolvedValue(10);

        await authRateLimiter(req, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Too many authentication attempts. Please try again later.",
        });
        expect(redisClient.zAdd).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 503 when Redis fails", async () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });

        redisClient.zCard.mockRejectedValue(new Error("Redis unavailable"));

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
