function GenerateUserCode(prefix, lastCode) {
  try {
    const prefixRules = ["10", "11", "12"]
    if(!prefixRules.includes(prefix)) throw Error("Invalid prefix");

    if(!lastCode || lastCode == null) return `${prefix}.001`

    let suffix = lastCode.substr(3, 5)
    suffix = (+suffix + 1).toString().padStart(3, '0')
  
    return `${prefix}.${suffix}`
  } catch (error) {
    throw Error(`Something went wrong (${error.message})`)
  }
}
  
function GetPrefixUserCode(account_type){
  account_type = account_type.trim().toLowerCase()
  // console.log(account_type)
  let prefix = '';
  switch (account_type) {
    case "admin":
      prefix = "10";
      break;
    case "hrd":
      prefix = "11";
      break;
    case "karyawan":
      prefix = "12";
      break;
  
    default:
      prefix = null
      break;
  }

  if(prefix == null) throw Error("Invalid account type")
  return prefix
}

module.exports = { GenerateUserCode, GetPrefixUserCode }