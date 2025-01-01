const CryptoJS = require('crypto.js');
function encryptText(text, password) {
    const encrypted = CryptoJS.AES.encrypt(text, password).toString();
    return encrypted;
}

// 导出加密函数
export { encryptText };