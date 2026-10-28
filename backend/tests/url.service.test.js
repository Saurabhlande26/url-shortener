
jest.mock("../src/config/database", () => ({
    getRepository: jest.fn(),
}));

jest.mock("../src/services/cache.service", () => ({
    deleteCachedUrl: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/utils/generateCode", () => jest.fn());


const AppDataSource = require("../src/config/database");
const generateShortCode = require("../src/utils/generateCode");
const { deleteCachedUrl } = require("../src/services/cache.service");

const urlRepository = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
};

// Configure the repository BEFORE importing the service.
AppDataSource.getRepository.mockReturnValue(urlRepository);

const {
    createShortUrl,
    getUserUrls,
    deleteUserUrl,
} = require("../src/services/url.service");


describe("URL service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createShortUrl", () => {
        it("should reject when original URL is missing", async () => {
            await expect(
                createShortUrl({ userId: "user-1" })
            ).rejects.toThrow("Original URL is required");
        });

        it("should reject an invalid URL", async () => {
            await expect(
                createShortUrl({
                    originalUrl: "not-a-url",
                    userId: "user-1",
                })
            ).rejects.toThrow("Invalid URL");
        });

        it("should reject when user ID is missing", async () => {
            await expect(
                createShortUrl({
                    originalUrl: "https://example.com",
                })
            ).rejects.toThrow("User authentication required");
        });

        it("should reject a custom alias that already exists", async () => {
            urlRepository.findOne.mockResolvedValue({ id: "existing-url" });

            await expect(
                createShortUrl({
                    originalUrl: "https://example.com",
                    customAlias: "my-link",
                    userId: "user-1",
                })
            ).rejects.toThrow("Custom alias already exists");
        });

        it("should create a URL with a custom alias", async () => {
            urlRepository.findOne.mockResolvedValue(null);
            urlRepository.save.mockImplementation(async (url) => ({
                id: "url-1",
                ...url,
            }));

            const result = await createShortUrl({
                originalUrl: "https://example.com",
                customAlias: "my-link",
                userId: "user-1",
            });

            expect(result.shortCode).toBe("my-link");
            expect(urlRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    shortCode: "my-link",
                    originalUrl: "https://example.com",
                    user: { id: "user-1" },
                })
            );
            expect(generateShortCode).not.toHaveBeenCalled();
        });

        it("should generate a short code when no alias is provided", async () => {
            generateShortCode.mockReturnValue("abc123");
            urlRepository.findOne.mockResolvedValue(null);
            urlRepository.save.mockImplementation(async (url) => ({
                id: "url-2",
                ...url,
            }));

            const result = await createShortUrl({
                originalUrl: "https://example.com",
                userId: "user-1",
            });

            expect(result.shortCode).toBe("abc123");
            expect(generateShortCode).toHaveBeenCalledWith(6);
        });

        it("should retry when a generated short code already exists", async () => {
            generateShortCode
                .mockReturnValueOnce("taken1")
                .mockReturnValueOnce("free12");

            urlRepository.findOne
                .mockResolvedValueOnce({ id: "existing-url" })
                .mockResolvedValueOnce(null);

            urlRepository.save.mockImplementation(async (url) => url);

            const result = await createShortUrl({
                originalUrl: "https://example.com",
                userId: "user-1",
            });

            expect(result.shortCode).toBe("free12");
            expect(generateShortCode).toHaveBeenCalledTimes(2);
        });
    });

    describe("getUserUrls", () => {
        it("should return URLs belonging to the specified user", async () => {
            const urls = [{ id: "url-1" }];
            urlRepository.find.mockResolvedValue(urls);

            const result = await getUserUrls("user-1");

            expect(result).toEqual(urls);
            expect(urlRepository.find).toHaveBeenCalledWith({
                where: { user: { id: "user-1" } },
                order: { createdAt: "DESC" },
            });
        });
    });

    describe("deleteUserUrl", () => {
        it("should delete the URL and invalidate its cache", async () => {
            urlRepository.findOne.mockResolvedValue({
                id: "url-1",
                shortCode: "abc123",
            });
            urlRepository.remove.mockResolvedValue(undefined);

            const result = await deleteUserUrl("url-1", "user-1");

            expect(result).toBe(true);
            expect(urlRepository.remove).toHaveBeenCalledTimes(1);
            expect(deleteCachedUrl).toHaveBeenCalledWith("abc123");
        });

        it("should return 404 when the URL does not belong to the user or does not exist", async () => {
            urlRepository.findOne.mockResolvedValue(null);

            await expect(
                deleteUserUrl("missing-url", "user-1")
            ).rejects.toMatchObject({
                message: "URL not found",
                statusCode: 404,
            });

            expect(urlRepository.remove).not.toHaveBeenCalled();
            expect(deleteCachedUrl).not.toHaveBeenCalled();
        });
    });
});
