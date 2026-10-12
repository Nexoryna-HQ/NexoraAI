const express = require("express")
const transactionController = require("../controllers/transactionController")

const router = new express.Router()

router.get("/snipping", transactionController.snipping)
router.get("/front", transactionController.front)

module.exports = router
