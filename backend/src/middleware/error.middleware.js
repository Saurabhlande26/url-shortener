
function errorHandler(err, req, res, next) {
    console.error("Application Error:", err);

    // PostgreSQL query timeout
    if (err.code === "57014") {
        return res.status(504).json({
            success: false,
            message: "Database query timed out. Please try again.",
        });
    }

    const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599 ? err.statusCode : 500;

    res.status(statusCode).json({
        success: false,
        message:
            statusCode === 500
                ? "Internal Server Error"
                : err.message || "Something went wrong",
    });
}

module.exports = errorHandler;
