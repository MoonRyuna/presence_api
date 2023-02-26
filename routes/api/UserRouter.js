const express = require('express')
const router = express.Router()
const User = require('../../controllers/api/UserController')
const ctl = new User()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')

router.get('/user', AuthMiddleware.check, ctl.list)
router.get('/user/:id', AuthMiddleware.check, ctl.findById)
router.post('/user', AuthMiddleware.check, ctl.create)
router.put('/user/:id', AuthMiddleware.check, ctl.update)
router.delete('/user/:id', AuthMiddleware.check, ctl.delete)
router.delete('/user/soft/:id', AuthMiddleware.check, ctl.softDelete)
router.post('/user/restore/:id', AuthMiddleware.check, ctl.restore)
router.put('/user/change_password/:id', AuthMiddleware.check, ctl.changePassword)
router.post('/user/reset_imei', AuthMiddleware.check, ctl.resetImei)
router.post('/user/reset_device_uid', AuthMiddleware.check, ctl.resetDeviceUID)

module.exports = router
