import express from "express";
import authenticate from "../../middleware/auth.js";
import createContent from "./create.js";
import updateContent from "./update.js";
import listContent from "./list.js";
import showContent from "./show.js";

const router = express.Router();

router.use(authenticate);
router.get("/", listContent);
router.get("/:id", showContent);
router.post("/", createContent);
router.put("/:id", updateContent);
router.patch("/:id", updateContent);

export default router;
