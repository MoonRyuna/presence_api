const express = require('express')
const router = express.Router()
const UploadController = require('../../controllers/api/UploadController')
const ctl = new UploadController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.post('/upload/image', AuthMiddleware.check, ctl.image)
router.post('/upload/attachment', AuthMiddleware.check, ctl.attachment)

module.exports = router
