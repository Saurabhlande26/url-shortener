
jest.mock("../src/config/database", () => ({
    getRepository: jest.fn(),
}));

const AppDataSource = require("../src/config/database");

const clickRepository = {
    create: jest.fn((data) => data),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const urlRepository = {
    findOne: jest.fn(),
};

AppDataSource.getRepository.mockImplementation((entity) => {
    if (entity === "Click") return clickRepository;
    if (entity === "Url") return urlRepository;
    throw new Error(`Unexpected repository: ${entity}`);
});

const { recordClick, getUrlAnalytics } = require("../src/services/click.service");

describe("click.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("recordClick", () => {
        it("should create and save a click record", async () => {
            const clickData = {
                urlId: 1,
                ipAddress: "127.0.0.1",
                userAgent: "Mozilla/5.0",
                referer: "https://google.com",
            };

            const savedClick = { id: 10, url: { id: 1 }, ...clickData };
            clickRepository.save.mockResolvedValue(savedClick);

            const result = await recordClick(clickData);

            expect(clickRepository.create).toHaveBeenCalledWith({
                url: { id: 1 },
                ipAddress: "127.0.0.1",
                userAgent: "Mozilla/5.0",
                referer: "https://google.com",
            });
            expect(clickRepository.save).toHaveBeenCalled();
            expect(result).toEqual(savedClick);
        });

        it("should propagate errors when saving a click fails", async () => {
            clickRepository.save.mockRejectedValue(new Error("Database error"));

            await expect(
                recordClick({
                    urlId: 1,
                    ipAddress: "127.0.0.1",
                    userAgent: "test",
                    referer: null,
                })
            ).rejects.toThrow("Database error");
        });
    });

    describe("getUrlAnalytics", () => {
        it("should throw 404 when the URL does not belong to the user", async () => {
            urlRepository.findOne.mockResolvedValue(null);

            await expect(getUrlAnalytics(1, "user-1")).rejects.toMatchObject({
                message: "URL not found",
                statusCode: 404,
            });

            expect(clickRepository.count).not.toHaveBeenCalled();
            expect(clickRepository.createQueryBuilder).not.toHaveBeenCalled();
        });

        it("should return click summary and timeline for the URL owner", async () => {
            urlRepository.findOne.mockResolvedValue({
                id: 1,
                shortCode: "abc123",
                originalUrl: "https://example.com",
            });

            clickRepository.count.mockResolvedValue(25);

            const queryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getCount: jest.fn(),
                getRawMany: jest.fn(),
            };

            queryBuilder.getCount
                .mockResolvedValueOnce(5)  // Today
                .mockResolvedValueOnce(12); // Last 7 days

            queryBuilder.getRawMany.mockResolvedValue([
                { date: "2026-10-26", clicks: "7" },
                { date: "2026-10-27", clicks: "5" },
            ]);

            clickRepository.createQueryBuilder.mockReturnValue(queryBuilder);

            const result = await getUrlAnalytics(1, "user-1");

            expect(urlRepository.findOne).toHaveBeenCalledWith({
                where: {
                    id: 1,
                    user: { id: "user-1" },
                },
            });

            expect(clickRepository.count).toHaveBeenCalledWith({
                where: { url: { id: 1 } },
            });

            expect(result).toEqual({
                url: {
                    id: 1,
                    shortCode: "abc123",
                    originalUrl: "https://example.com",
                },
                summary: {
                    totalClicks: 25,
                    todayClicks: 5,
                    last7DaysClicks: 12,
                },
                timeline: [
                    { date: "2026-10-26", clicks: 7 },
                    { date: "2026-10-27", clicks: 5 },
                ],
            });
        });

        it("should return an empty timeline when there are no click records", async () => {
            urlRepository.findOne.mockResolvedValue({
                id: 2,
                shortCode: "empty1",
                originalUrl: "https://example.org",
            });

            clickRepository.count.mockResolvedValue(0);

            const queryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(0),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            clickRepository.createQueryBuilder.mockReturnValue(queryBuilder);

            const result = await getUrlAnalytics(2, "user-2");

            expect(result.summary).toEqual({
                totalClicks: 0,
                todayClicks: 0,
                last7DaysClicks: 0,
            });
            expect(result.timeline).toEqual([]);
        });
    });
});
