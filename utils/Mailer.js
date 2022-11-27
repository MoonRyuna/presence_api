const nodemailer = require('nodemailer');

class Mailer {
  constructor(params) {
    this.from = params.from;
    this.transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_KEY
      }
    });
  }

  prepare(params){
    this.mail = {
      from: this.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    }
    return this
  }

  send(){
    return this.transport.sendMail(this.mail);
  }

}

module.exports = Mailer