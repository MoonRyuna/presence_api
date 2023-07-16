const express = require('express')
const router = express.Router()
const UploadController = require('../../controllers/api/UploadController')
const ctl = new UploadController()
const AuthMiddleware = require('../../middlewares/AuthMiddleware')
const multer = require('multer')

const storageImage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1])
  }
})

const storageDocument = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/documents')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + + file.mimetype.split('/')[1])
  }
})

const uploadImage = multer({
  storage: storageImage,
  // limits: {
  //   fileSize: 1024 * 1024 * 1 //10 MB
  // },
  fileFilter: (req, file, cb) => {
    console.log("ini adalah type " + file.mimetype)
    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  },
})

const uploadDocument = multer({
  storage: storageDocument,
  // limits: {
  //   fileSize: 1024 * 1024 * 1 //10 MB
  // },
  fileFilter: (req, file, cb) => {
    if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg" || file.mimetype == "application/pdf") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png, .jpg, .jpeg and .pdf format allowed!'));
    }
  },
})

router.post('/upload/image', AuthMiddleware.check, uploadImage.single('image'), ctl.image)
router.post('/upload/document', AuthMiddleware.check, uploadDocument.single('document'), ctl.document)

module.exports = router
