const Nacl = window.nacl;

// Encryption functions

// Encrypt a document with a password
const encrypt = (content, pw) => {
    const key = Nacl.hash(Nacl.util.decodeUTF8(pw)).subarray(0,32);
    const nonce = Nacl.randomBytes(24);
    const packed = Nacl.secretbox(content, nonce, key);
    return `${Nacl.util.encodeBase64(nonce)}|${Nacl.util.encodeBase64(packed)}`;
};
// Decrypt the docoument
const decrypt = (contentStr, pw) => {
    const key = Nacl.hash(Nacl.util.decodeUTF8(pw)).subarray(0,32);
    const arr = contentStr.split('|');
    const nonce = Nacl.util.decodeBase64(arr[0]);
    const packed = Nacl.util.decodeBase64(arr[1]);
    return Nacl.secretbox.open(packed, nonce, key);
};

// Utility functions

// Encode JSON into base64
const encodeB64 = json => {
    const str = JSON.stringify(json);
    const uint8 = Nacl.util.decodeUTF8(str);
    return Nacl.util.encodeBase64(uint8);
};
// Decode base64 into JSON
const decodeB64 = b64 => {
    const uint8 = Nacl.util.decodeBase64(b64);
    const str = Nacl.util.encodeUTF8(uint8);
    return JSON.parse(str);
};

// Server POST and GET

// List existing documents from server
const listDocuments = () => {
    return new Promise((resolve, reject) => {
        fetch("/list")
        .then(response => response.json())
        .then(json => {
            Object.keys(json).forEach(id => {
                try {
                    json[id].metadata = decodeB64(json[id].metadata);
                } catch (e) {
                    console.error(e);
                }
            });
            resolve(json);
        }).catch(e => {
            reject(e);
        });
    });
};

// Encrypt and upload file to the server
const saveFile = (file, pw, id) => {
    return new Promise((resolve, reject) => {
        let metadata = {
            name: file.name,
            type: file.type
        };
        file.arrayBuffer().then(buffer => {
            let u8 = new Uint8Array(buffer);
            let encrypted = encrypt(u8, pw);
            let content = `${encodeB64(metadata)}|${encrypted}`;
            let queryStr = id ? `?id=${id}` : '';
            fetch("/upload"+queryStr, {
                method: 'POST',
                body: content
            })
            .then(response => response.json())
            .then(json => {
                resolve(json);
            }).catch(e => {
                reject(e);
            });
        });
    });
};

const cache = {};
const download = id => {
    return new Promise((resolve, reject) => {
        if (cache[id]) {
            console.error('using cache');
            return resolve(cache[id]);
        }
        fetch(`/data/${id}`)
        .then(response => {
            if (!response.ok) {
                return Promise.reject(response.status);
            }
            return response;
        })
        .then(response => response.text())
        .then(str => {
            console.error(str);
            cache[id] = str;
            resolve(str);
        }).catch(e => {
            reject(e);
        });
    });

};

const getMetadata = id => {
    return new Promise((resolve, reject) => {
        download(id).then(str => {
            const idx = str.indexOf('|');
            const metadata64 = str.slice(0, str.indexOf('|'));
            const metadata = decodeB64(metadata64);
            resolve(metadata);
        }).catch(e => {
            reject(e);
        });
    });
};

// Download and decrypt file from the server
const getDecryptedFile = (id, pw) => {
    return new Promise((resolve, reject) => {
        download(id).then(str => {
            const idx = str.indexOf('|');
            const metadata64 = str.slice(0, str.indexOf('|'));
            const metadata = decodeB64(metadata64);
            const content = str.slice(idx+1);
            const u8 = decrypt(content, pw);
            if (!u8) { return void reject('Invalid password'); }
            resolve({metadata, u8});
        }).catch(e => {
            reject(e);
        });
    });
};

// Get a valid CryptPad session key from a document id and a password
const getSessionKey = (id, pw) => {
    const str = id + pw;
    const h = Nacl.hash(Nacl.util.decodeUTF8(str)).subarray(0,18);
    return Nacl.util.encodeBase64(h).replace(/\//g, '-').replace(/=+$/g, '');
};

const sanitizeHTML = function (str) {
    if (!str) { return ''; }
    return str.replace(/[<>&"']/g, function (x) {
        return ({ "<": "&lt;", ">": "&gt", "&": "&amp;", '"': "&#34;", "'": "&#39;" })[x];
    });
};


window.CryptPad_utils = {
    listDocuments,
    getSessionKey,
    saveFile,
    getMetadata,
    getDecryptedFile,
    sanitizeHTML
};

