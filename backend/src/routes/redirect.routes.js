const express = require("express");

const {
    redirectToOriginalUrl,
} = require("../controllers/redirect.controller");

const router = express.Router();

router.get("/:shortCode", redirectToOriginalUrl);

module.exports = router;