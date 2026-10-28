
jest.mock("../src/config/database", () => ({
    getRepository: jest.fn(),
}));

jest.mock("../src/services/cache.service", () => ({
    getCachedUrl: jest.fn(),
    cacheUrl: jest.fn(),
}));

const AppDataSource = require("../src/config/database");
const {
    getCachedUrl,
    cacheUrl,
} = require("../src/services/cache.service");

const urlRepository = {
    findOne: jest.fn(),
};

AppDataSource.getRepository.mockReturnValue(urlRepository);

const { getOriginalUrl } = require("../src/services/redirect.service");

describe("redirect.service - getOriginalUrl", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => { });

        getCachedUrl.mockResolvedValue(null);
        cacheUrl.mockResolvedValue(undefined);
        urlRepository.findOne.mockResolvedValue(null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should return URL metadata from Redis cache", async () => {
        const cachedUrl = {
            id: 1,
            shortCode: "abc123",
            originalUrl: "https://example.com",
            userId: "user-1",
            isActive: true,
            expiresAt: null,
        };

        getCachedUrl.mockResolvedValue(cachedUrl);

        const result = await getOriginalUrl("abc123");

        expect(result).toEqual(cachedUrl);
        expect(urlRepository.findOne).not.toHaveBeenCalled();
        expect(cacheUrl).not.toHaveBeenCalled();
    });

    it("should fetch from PostgreSQL and cache when Redis misses", async () => {
        urlRepository.findOne.mockResolvedValue({
            id: 1,
            shortCode: "abc123",
            originalUrl: "https://example.com",
            user: { id: "user-1" },
            isActive: true,
            expiresAt: null,
        });

        const result = await getOriginalUrl("abc123");

        expect(urlRepository.findOne).toHaveBeenCalledWith({
            where: { shortCode: "abc123", isActive: true },
            relations: { user: true },
        });

        expect(result).toEqual({
            id: 1,
            shortCode: "abc123",
            originalUrl: "https://example.com",
            userId: "user-1",
            isActive: true,
            expiresAt: null,
        });

        expect(cacheUrl).toHaveBeenCalledWith(
            "abc123",
            expect.objectContaining({ shortCode: "abc123" })
        );
    });

    it("should use null userId when the URL has no user", async () => {
        urlRepository.findOne.mockResolvedValue({
            id: 2,
            shortCode: "public1",
            originalUrl: "https://example.com",
            user: null,
            isActive: true,
            expiresAt: null,
        });

        const result = await getOriginalUrl("public1");

        expect(result.userId).toBeNull();
    });

    it("should throw 404 when the short URL does not exist", async () => {
        await expect(getOriginalUrl("missing")).rejects.toMatchObject({
            message: "Short URL not found",
            statusCode: 404,
        });

        expect(cacheUrl).not.toHaveBeenCalled();
    });

    it("should throw 410 when the cached URL is disabled", async () => {
        getCachedUrl.mockResolvedValue({
            shortCode: "disabled1",
            isActive: false,
            expiresAt: null,
        });

        await expect(getOriginalUrl("disabled1")).rejects.toMatchObject({
            message: "Short URL is disabled",
            statusCode: 410,
        });
    });

    it("should throw 410 when the cached URL has expired", async () => {
        getCachedUrl.mockResolvedValue({
            shortCode: "expired1",
            isActive: true,
            expiresAt: "2020-01-01T00:00:00.000Z",
        });

        await expect(getOriginalUrl("expired1")).rejects.toMatchObject({
            message: "This short URL has expired",
            statusCode: 410,
        });
    });

    it("should allow a URL with a future expiration date", async () => {
        getCachedUrl.mockResolvedValue({
            shortCode: "future1",
            originalUrl: "https://example.com",
            isActive: true,
            expiresAt: "2099-01-01T00:00:00.000Z",
        });

        const result = await getOriginalUrl("future1");

        expect(result.shortCode).toBe("future1");
    });

    it("should propagate Redis errors", async () => {
        getCachedUrl.mockRejectedValue(new Error("Redis unavailable"));

        await expect(getOriginalUrl("abc123")).rejects.toThrow(
            "Redis unavailable"
        );

        expect(urlRepository.findOne).not.toHaveBeenCalled();
    });
});
