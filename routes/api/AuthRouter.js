const express = require('express')
const router = express.Router()
const AuthController = require('../../controllers/api/AuthController')
const ctl = new AuthController()

router.post('/auth', ctl.auth)
router.post('/desktop_auth', ctl.desktop_auth)

router.post('/forgot_password', ctl.forgot_password)
router.post('/verify_otp', ctl.verify_otp)
router.post('/change_password', ctl.change_password)

module.exports = router
