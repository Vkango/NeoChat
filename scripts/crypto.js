// 消息加解密函数
export async function encrypt(text, password) {
    const key = await deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 生成随机IV
    const encodedText = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedText
    );
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    return ivHex + ':' + encryptedHex;
}

export async function decrypt(encryptedText, password) {
    const key = await deriveKey(password);
    const textParts = encryptedText.split(':');
    const iv = new Uint8Array(textParts[0].match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedData = new Uint8Array(textParts[1].match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encryptedData
    );
    return new TextDecoder().decode(decrypted);
}

async function deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("salt"), // 可以自定义盐值
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}