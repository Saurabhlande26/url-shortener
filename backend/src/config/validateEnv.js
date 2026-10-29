
const requiredEnvVars = [
    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_NAME",
    "REDIS_URL",
    "JWT_SECRET",
];

function validateEnv() {
    const missingVars = requiredEnvVars.filter((key) => {
        return !process.env[key] || !process.env[key].trim();
    });

    if (missingVars.length > 0) {
        console.error(
            `Missing required environment variables: ${missingVars.join(", ")}`
        );

        process.exit(1);
    }
}

module.exports = validateEnv;
