

function RandomNumber(length) {
  var digits = '0123456789';
  let random = '';
  for (let i = 0; i < length; i++ ) {
    random += digits[Math.floor(Math.random() * 10)];
  }
  return random;
}
  
module.exports = { RandomNumber }