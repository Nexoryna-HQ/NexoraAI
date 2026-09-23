const express = require("express")
const aiController = require("../controllers/aiController")

const router = express.Router()

router.get("/insights", aiController.listInsights)
router.get("/metrics", aiController.metrics)
router.post("/discover", aiController.discover)
router.get("/token/:id", aiController.analyzeToken)
router.post("/token/:id", aiController.analyzeToken)

module.exports = router
