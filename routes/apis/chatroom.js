const express = require('express')
const router = express.Router()
const chatroomController = require('../../controllers/chatroomController.js')


router.get('/public', chatroomController.publicChat)
router.get('/getHistoryMsg', chatroomController.getHistoryMsg)


module.exports = router