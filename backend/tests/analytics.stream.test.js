
jest.mock("../src/config/redis", () => ({
    xAdd: jest.fn(),
}));

const redisClient = require("../src/config/redis");

const {
    ANALYTICS_STREAM,
    publishClickEvent,
} = require("../src/services/analytics.stream");

describe("analytics.stream", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        redisClient.xAdd.mockResolvedValue("1234567890-0");
    });

    it("should export the correct analytics stream name", () => {
        expect(ANALYTICS_STREAM).toBe("analytics:clicks");
    });

    it("should publish a click event with all fields", async () => {
        await publishClickEvent({
            urlId: 42,
            ipAddress: "127.0.0.1",
            userAgent: "Mozilla/5.0",
            referer: "https://google.com",
        });

        expect(redisClient.xAdd).toHaveBeenCalledWith(
            "analytics:clicks",
            "*",
            {
                urlId: "42",
                ipAddress: "127.0.0.1",
                userAgent: "Mozilla/5.0",
                referer: "https://google.com",
            }
        );
    });

    it("should convert URL ID to a string", async () => {
        await publishClickEvent({
            urlId: 123,
            ipAddress: "",
            userAgent: "",
            referer: "",
        });

        expect(redisClient.xAdd).toHaveBeenCalledWith(
            ANALYTICS_STREAM,
            "*",
            expect.objectContaining({ urlId: "123" })
        );
    });

    it("should use empty strings for missing optional fields", async () => {
        await publishClickEvent({ urlId: 7 });

        expect(redisClient.xAdd).toHaveBeenCalledWith(
            ANALYTICS_STREAM,
            "*",
            {
                urlId: "7",
                ipAddress: "",
                userAgent: "",
                referer: "",
            }
        );
    });

    it("should propagate errors when Redis publishing fails", async () => {
        redisClient.xAdd.mockRejectedValue(new Error("Redis unavailable"));

        await expect(
            publishClickEvent({ urlId: 42 })
        ).rejects.toThrow("Redis unavailable");
    });
});
