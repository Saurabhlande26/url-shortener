const crypto = require("crypto");

const CHARACTERS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateShortCode(length = 6) {
    const bytes = crypto.randomBytes(length);

    let result = "";

    for (let i = 0; i < length; i++) {
        result += CHARACTERS[bytes[i] % CHARACTERS.length];
    }

    return result;
}

module.exports = generateShortCode;