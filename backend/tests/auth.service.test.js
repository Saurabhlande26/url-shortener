
jest.mock("../src/config/database", () => ({
    getRepository: jest.fn(),
}));

jest.mock("bcrypt", () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
    sign: jest.fn(),
}));

const AppDataSource = require("../src/config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userRepository = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
};

// Configure repository before importing the service.
AppDataSource.getRepository.mockReturnValue(userRepository);

const { registerUser, loginUser } = require("../src/services/auth.service");

describe("Auth service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = "test-secret";
        AppDataSource.getRepository.mockReturnValue(userRepository);
    });

    describe("registerUser", () => {
        it("should reject when email or password is missing", async () => {
            await expect(registerUser({ email: "test@example.com" }))
                .rejects.toThrow("Email and password are required");
        });

        it("should reject a password shorter than 8 characters", async () => {
            await expect(
                registerUser({
                    email: "test@example.com",
                    password: "short",
                })
            ).rejects.toThrow("Password must be at least 8 characters");
        });

        it("should reject an existing user", async () => {
            userRepository.findOne.mockResolvedValue({ id: "user-1" });

            await expect(
                registerUser({
                    email: "test@example.com",
                    password: "Password123!",
                })
            ).rejects.toThrow("User already exists");
        });

        it("should hash the password and register a user", async () => {
            userRepository.findOne.mockResolvedValue(null);
            bcrypt.hash.mockResolvedValue("hashed-password");
            userRepository.save.mockResolvedValue({
                id: "user-2",
                email: "test@example.com",
                passwordHash: "hashed-password",
            });

            const result = await registerUser({
                email: "test@example.com",
                password: "Password123!",
            });

            expect(bcrypt.hash).toHaveBeenCalledWith("Password123!", 12);
            expect(userRepository.create).toHaveBeenCalledWith({
                email: "test@example.com",
                passwordHash: "hashed-password",
            });
            expect(result).toEqual({
                id: "user-2",
                email: "test@example.com",
            });
            expect(result.passwordHash).toBeUndefined();
        });
    });

    describe("loginUser", () => {
        it("should reject an unknown email", async () => {
            userRepository.findOne.mockResolvedValue(null);

            await expect(
                loginUser({
                    email: "unknown@example.com",
                    password: "Password123!",
                })
            ).rejects.toThrow("Invalid email or password");
        });

        it("should reject an incorrect password", async () => {
            userRepository.findOne.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                passwordHash: "hashed-password",
            });
            bcrypt.compare.mockResolvedValue(false);

            await expect(
                loginUser({
                    email: "test@example.com",
                    password: "WrongPassword!",
                })
            ).rejects.toThrow("Invalid email or password");

            expect(jwt.sign).not.toHaveBeenCalled();
        });

        it("should return user details and a JWT on successful login", async () => {
            userRepository.findOne.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                passwordHash: "hashed-password",
            });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue("mock-jwt-token");

            const result = await loginUser({
                email: "test@example.com",
                password: "Password123!",
            });

            expect(bcrypt.compare).toHaveBeenCalledWith(
                "Password123!",
                "hashed-password"
            );
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: "user-1" },
                "test-secret",
                { expiresIn: "1d" }
            );
            expect(result).toEqual({
                user: {
                    id: "user-1",
                    email: "test@example.com",
                },
                token: "mock-jwt-token",
            });
        });

        it("should use the configured JWT expiration", async () => {
            process.env.JWT_EXPIRES_IN = "2h";

            userRepository.findOne.mockResolvedValue({
                id: "user-1",
                email: "test@example.com",
                passwordHash: "hashed-password",
            });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue("mock-jwt-token");

            await loginUser({
                email: "test@example.com",
                password: "Password123!",
            });

            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: "user-1" },
                "test-secret",
                { expiresIn: "2h" }
            );

            delete process.env.JWT_EXPIRES_IN;
        });
    });
});
