const express = require("express");
const authenticate = require("../../middleware/auth");
const createContent = require("./create");
const updateContent = require("./update");
const listContent = require("./list");
const showContent = require("./show");

const router = express.Router();

router.use(authenticate);

router.get("/", listContent);
router.get("/:id", showContent);
router.post("/", createContent);
router.put("/:id", updateContent);
router.patch("/:id", updateContent);

module.exports = router;
