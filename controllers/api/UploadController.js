class UploadController {
  async image(req, res) {
    console.log(req.file)
    try {
      return res.json({
        "status": true,
        "message": "image uploaded",
        "data": req.file
      })
    } catch (error) {
      return res.json({
        "status": true,
        "message": error.message,
      })
    }
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