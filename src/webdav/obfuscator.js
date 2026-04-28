/**
 * 数据混淆模块
 * 注意：这里只是降低 WebDAV 上直接阅读 JSON 的便利性，不是安全加密。
 * 新版本使用 UTF-8 字节序列，兼容中文内容；旧版本仍然可以继续读取。
 */

const OBFUSCATION_KEY = 'NyaaDiary@2024!Immersive#Journal';
const HEADER_V2 = 'NYAA2:';
const HEADER_V1 = 'NYAA:';

function xorBuffer(buffer, keyBuffer) {
    const output = Buffer.alloc(buffer.length);

    for (let index = 0; index < buffer.length; index += 1) {
        output[index] = buffer[index] ^ keyBuffer[index % keyBuffer.length];
    }

    return output;
}

function xorLegacyString(input, key) {
    let output = '';
    for (let index = 0; index < input.length; index += 1) {
        output += String.fromCharCode(
            input.charCodeAt(index) ^ key.charCodeAt(index % key.length)
        );
    }
    return output;
}

function obfuscate(data) {
    const jsonBuffer = Buffer.from(JSON.stringify(data), 'utf8');
    const keyBuffer = Buffer.from(OBFUSCATION_KEY, 'utf8');
    return HEADER_V2 + xorBuffer(jsonBuffer, keyBuffer).toString('base64');
}

function deobfuscate(content) {
    if (content.startsWith(HEADER_V2)) {
        const encoded = content.slice(HEADER_V2.length);
        const payload = Buffer.from(encoded, 'base64');
        const keyBuffer = Buffer.from(OBFUSCATION_KEY, 'utf8');
        return JSON.parse(xorBuffer(payload, keyBuffer).toString('utf8'));
    }

    if (content.startsWith(HEADER_V1)) {
        const encoded = content.slice(HEADER_V1.length);
        const legacyBinary = Buffer.from(encoded, 'base64').toString('binary');
        const legacyJson = xorLegacyString(legacyBinary, OBFUSCATION_KEY);
        return JSON.parse(legacyJson);
    }

    return JSON.parse(content);
}

function isObfuscated(content) {
    return content.startsWith(HEADER_V1) || content.startsWith(HEADER_V2);
}

module.exports = {
    obfuscate,
    deobfuscate,
    isObfuscated
};
