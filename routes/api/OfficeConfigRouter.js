const express = require('express')
const router = express.Router()
const OfficeConfigController = require('../../controllers/api/OfficeConfigController')
const ctl = new OfficeConfigController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/office_config', AuthMiddleware.check, ctl.list)
router.post('/office_config/update/:id', AuthMiddleware.check, ctl.update)

module.exports = router
