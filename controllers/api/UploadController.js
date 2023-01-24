class UploadController {
  async image(req, res) {
    return res.json({
      "status": true,
      "message": "image uploaded",
      "data": req.file
    })
  }

  async document(req, res) {
    return res.json({
      "status": true,
      "message": "file uploaded",
      "data": req.file
    })
  }
}

module.exports = UploadController