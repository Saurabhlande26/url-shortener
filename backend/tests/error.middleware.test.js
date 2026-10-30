
const request = require("supertest");
const express = require("express");
const errorHandler = require("../src/middleware/error.middleware");
const {
    BadRequestError,
    UnauthorizedError,
    NotFoundError,
} = require("../src/utils/errors");

describe("Centralized error handler", () => {
    let app;

    beforeEach(() => {
        app = express();

        app.get("/test-error", (req, res, next) => {
            const error = new Error("Something went wrong");
            error.statusCode = 400;
            next(error);
        });

        app.get("/test-server-error", (req, res, next) => {
            next(new Error("Database password leaked"));
        });

        app.use(errorHandler);
    });

    it("returns the correct client error response", async () => {
        const response = await request(app).get("/test-error");

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: "Something went wrong",
        });
    });

    it("hides internal server error messages", async () => {
        const response = await request(app).get("/test-server-error");

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            success: false,
            message: "Internal Server Error",
        });
    });
});

describe("Custom application errors", () => {
    it("creates a BadRequestError", () => {
        const error = new BadRequestError("Invalid URL");

        expect(error.message).toBe("Invalid URL");
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
    });

    it("creates an UnauthorizedError", () => {
        const error = new UnauthorizedError();

        expect(error.statusCode).toBe(401);
    });

    it("creates a NotFoundError", () => {
        const error = new NotFoundError("URL not found");

        expect(error.message).toBe("URL not found");
        expect(error.statusCode).toBe(404);
    });
});