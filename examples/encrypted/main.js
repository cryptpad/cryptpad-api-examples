(() => {
const Nacl = window.nacl;
const API = window.CryptPadAPI;

// View
const hash = window.location.hash;
const docId = hash && Number(hash.slice(1));
const editor = document.getElementById('editor');
const editorForm = document.getElementById('editor-form');
const upload = document.getElementById('upload');
if (hash) {
    upload.setAttribute('style', 'display:none');
} else {
    editor.setAttribute('style', 'display:none');
}
if (hash) {
    document.getElementById('editor-title').innerHTML = `Editing document ${hash}`;
}


// Encryption
const encrypt = (content, pw) => {
    const key = Nacl.hash(Nacl.util.decodeUTF8(pw)).subarray(0,32);
    const nonce = Nacl.randomBytes(24);
    const packed = Nacl.secretbox(content, nonce, key);
    return `${Nacl.util.encodeBase64(nonce)}|${Nacl.util.encodeBase64(packed)}`;
};
const decrypt = (contentStr, pw) => {
    const key = Nacl.hash(Nacl.util.decodeUTF8(pw)).subarray(0,32);
    const arr = contentStr.split('|');
    const nonce = Nacl.util.decodeBase64(arr[0]);
    const packed = Nacl.util.decodeBase64(arr[1]);
    return Nacl.secretbox.open(packed, nonce, key);
};
const encodeB64 = json => {
    const str = JSON.stringify(json);
    const uint8 = Nacl.util.decodeUTF8(str);
    return Nacl.util.encodeBase64(uint8);
};
const decodeB64 = b64 => {
    const uint8 = Nacl.util.decodeBase64(b64);
    const str = Nacl.util.encodeUTF8(uint8);
    return JSON.parse(str);
};

// Basic upload to server
const postToServer = (file, pw, id) => {
    return new Promise((resolve) => {
        file.arrayBuffer().then(buffer => {
            let u8 = new Uint8Array(buffer);
            let encrypted = encrypt(u8, pw);
            let metadata = {
                name: file.name,
                type: file.type
            };
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


// EDITOR

const apps = {
    'md': 'code',
    'xlsx': 'sheet',
    'pptx': 'presentation',
    'docx': 'doc',
    'drawio': 'diagram'
};
const getApp = ext => {
    return apps[ext];
};
const getKey = (id, pw) => {
    const str = id + pw;
    const h = Nacl.hash(Nacl.util.decodeUTF8(str)).subarray(0,18);
    return Nacl.util.encodeBase64(h).replace(/\//g, '-').replace(/=+$/g, '');
};
const startEditor = (name, pw, blob) => {
    const docUrl = URL.createObjectURL(blob);
    const ext = name.split('.').pop();
    editorForm.remove();
    API('editor-container', {
        document: {
            url: docUrl,
            key: getKey(docId, pw),
            fileType: ext
        },
        documentType: getApp(ext),
        editorConfig: {},
        events: {
            onSave: (data, cb) => {
                const blob = data;
                blob.name = name;
                postToServer(blob, pw, docId).then(json => {
                    console.error(json);
                    cb();
                }).catch(err => {
                    console.error(err);
                });

            }
        }
    });
};



// Get decrypted document
const fetchFromServer = id => {
    return new Promise((resolve) => {
        fetch(`/data/${id}`)
        .then(response => response.text())
        .then(b64 => {
            resolve(b64);
        }).catch(e => {
            reject(e);
        });
    });
};

// Manage password field
const editorButton = document.getElementById('editor-submit');
const editorPassword = document.getElementById('editor-pw');
editorButton.addEventListener('click', () => {
    let pw = editorPassword.value;
    fetchFromServer(docId).then(str => {
        const idx = str.indexOf('|');
        const metadata64 = str.slice(0, str.indexOf('|'));
        const metadata = decodeB64(metadata64);
        const content = str.slice(idx+1);
        const u8 = decrypt(content, pw);
        if (!u8) {
            return void alert('Invalid password');
        }
        const blob = new Blob([u8], {
            type: metadata.type
        });

        startEditor(metadata.name, pw, blob);
    }).catch(err => {
        console.error(err);
    });
});


// UPLOAD

// Upload form
const uploadButton = document.getElementById('upload-submit');
const uploadFile = document.getElementById('upload-file');
const uploadPassword = document.getElementById('upload-pw');
uploadButton.addEventListener('click', () => {
    let pw = uploadPassword.value;
    let file = uploadFile.files && uploadFile.files[0];
    if (!file) {
        alert('Missing file');
        return;
    }
    postToServer(file, pw).then(json => {
        console.error(json);
        // XXX show ID or redirect to file
    }).catch(err => {
        console.error(err);
    });
});

})();
