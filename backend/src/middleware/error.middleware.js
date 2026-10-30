
function errorHandler(err, req, res, next) {
    console.error("Application Error:", err);

    const statusCode =
        Number.isInteger(err.statusCode) &&
            err.statusCode >= 400 &&
            err.statusCode <= 599
            ? err.statusCode
            : 500;

    res.status(statusCode).json({
        success: false,
        message:
            statusCode === 500
                ? "Internal Server Error"
                : err.message || "Something went wrong",
    });
}

module.exports = errorHandler;
