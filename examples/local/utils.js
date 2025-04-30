(() => {
const Nacl = window.nacl;

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

// Store

const listDocuments = () => {
    return new Promise((resolve, reject) => {
        try {
            const keys = Object.keys(localStorage).filter(str => {
                return /^CP_data_\d+$/.test(str);
            });
            const json = {};
            keys.forEach(k => {
                const id = Number(k.slice(8));
                json[id] = decodeB64(localStorage.getItem(k));
            });
            resolve(json);
        } catch (e) {
            reject(e);
        }
    });
};
const getNewId = () => {
    try {
        const keys = Object.keys(localStorage).filter(str => {
            return /^CP_data_\d+$/.test(str);
        });
        let max = 0;
        keys.forEach(k => {
            const id = Number(k.slice(8));
            if (id > max) { max = id; }
        });
        return ++max;
    } catch (e) {
        return;
    }
};
const saveFile = (content, title, id) => {
    return new Promise((resolve, reject) => {
        if (!id) {
            id = getNewId();
        }
        try {
            const json = {
                title,
                content,
                mtime: +new Date()
            };
            localStorage.setItem(`CP_data_${id}`, encodeB64(json));
            resolve({
                id
            });
        } catch (e) {
            reject(e);
        }
    });
};
const getFile = (id) => {
    return new Promise((resolve, reject) => {
        try {
            const data = localStorage.getItem(`CP_data_${id}`)
            const json = decodeB64(data);
            resolve(json);
        } catch (e) {
            reject(e);
        }
    });
};
const getTitle = (id) => {
    return new Promise((resolve, reject) => {
        try {
            const data = localStorage.getItem(`CP_data_${id}`)
            if (!data) { throw new Error(404); }
            const json = decodeB64(data);
            resolve(json.title);
        } catch (e) {
            reject(+e.message || e);
        }
    });
};

const sanitizeHTML = function (str) {
    if (!str) { return ''; }
    return str.replace(/[<>&"']/g, function (x) {
        return ({ "<": "&lt;", ">": "&gt", "&": "&amp;", '"': "&#34;", "'": "&#39;" })[x];
    });
};


window.CryptPad_utils = {
    listDocuments,
    getTitle,
    getFile,
    saveFile,
    sanitizeHTML
};

})();
