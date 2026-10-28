
jest.mock("redis", () => ({
    createClient: jest.fn(),
}));

const { createClient } = require("redis");

describe("Redis configuration", () => {
    let handlers;
    let mockRedisClient;

    beforeEach(() => {
        jest.clearAllMocks();
        handlers = {};

        mockRedisClient = {
            on: jest.fn((event, callback) => {
                handlers[event] = callback;
                return mockRedisClient;
            }),
        };

        createClient.mockReturnValue(mockRedisClient);
    });

    it("should create a Redis client using REDIS_URL", () => {
        process.env.REDIS_URL = "redis://localhost:6379";

        jest.isolateModules(() => {
            require("../src/config/redis");
        });

        expect(createClient).toHaveBeenCalledWith({
            url: "redis://localhost:6379",
        });

        delete process.env.REDIS_URL;
    });

    it("should register error, connect, and ready handlers", () => {
        jest.isolateModules(() => {
            require("../src/config/redis");
        });

        expect(mockRedisClient.on).toHaveBeenCalledWith(
            "error",
            expect.any(Function)
        );
        expect(mockRedisClient.on).toHaveBeenCalledWith(
            "connect",
            expect.any(Function)
        );
        expect(mockRedisClient.on).toHaveBeenCalledWith(
            "ready",
            expect.any(Function)
        );
    });

    it("should log Redis errors", () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });

        jest.isolateModules(() => {
            require("../src/config/redis");
        });

        const error = new Error("Connection failed");
        handlers.error(error);

        expect(consoleError).toHaveBeenCalledWith("Redis Error:", error);

        consoleError.mockRestore();
    });

    it("should log when Redis connects", () => {
        const consoleLog = jest
            .spyOn(console, "log")
            .mockImplementation(() => { });

        jest.isolateModules(() => {
            require("../src/config/redis");
        });

        handlers.connect();

        expect(consoleLog).toHaveBeenCalledWith("Redis connecting...");

        consoleLog.mockRestore();
    });

    it("should log when Redis is ready", () => {
        const consoleLog = jest
            .spyOn(console, "log")
            .mockImplementation(() => { });

        jest.isolateModules(() => {
            require("../src/config/redis");
        });

        handlers.ready();

        expect(consoleLog).toHaveBeenCalledWith("Redis ready");

        consoleLog.mockRestore();
    });
});
