(() => {
const Editor = window.CryptPad_editor;

const { getSessionKey,
        sanitizeHTML,
        saveFile,
        getMetadata,
        getDecryptedFile } = window.CryptPad_utils;

// Manage views
const hash = window.location.hash;
const docId = hash && Number(hash.slice(1));
const editor = document.getElementById('editor');
const editorForm = document.getElementById('editor-form');
const upload = document.getElementById('upload');
if (hash) {
    // editor view
    document.body.setAttribute('class', 'editor');
    document.getElementById('editor-title').innerHTML = `Editing document ${hash}`;
    getMetadata(docId).then(md => {
        console.error(md);
        document.getElementById('editor-title').innerHTML = `Editing document <em>${sanitizeHTML(md.name)}</em>`;
    }).catch(e => {
        if (e === 404) {
            alert("404: Not found");
            window.location.hash = '';
            window.location.reload();
        }
    });
}
const backLink = document.getElementById('back-link');
backLink.addEventListener('click', e => {
    e.preventDefault();
    window.location.hash = '';
    window.location.reload();
});


// EDITOR
// Editor password form
const editorButton = document.getElementById('editor-submit');
const editorPassword = document.getElementById('editor-pw');
const savingState = document.getElementById('state');
editorButton.addEventListener('click', () => {
    let pw = editorPassword.value;
    getDecryptedFile(docId, pw).then(data => {
        const { metadata, u8 } = data;

        // Create Blob from decrypted data
        const blob = new Blob([u8], {
            type: metadata.type
        });
        blob.name = metadata.name;

        // Remove password form
        editorForm.remove();

        // Extract session key from password
        const key = getSessionKey(docId, pw);

        // Create save handler
        const onSave = (data, cb) => {
            const blob = data;
            blob.name = metadata.name;
            blob.type = metadata.type;
            saveFile(blob, pw, docId).then(json => {
                console.error(json);
                cb();
            }).catch(err => {
                console.error(err);
            });
        };
        const onHasUnsavedChanges = (unsaved, cb) => {
            if (unsaved) {
                savingState.innerText = "The document has unsaved changes, please wait...";
                return;
            }
            savingState.innerText = "The document is saved";
        };

        const events = { onHasUnsavedChanges, onSave };

        // Call the API
        Editor.start(blob, key, events);
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
    saveFile(file, pw).then(json => {
        console.error(json);
        window.location.hash = String(json.id);
        window.location.reload();
    }).catch(err => {
        console.error(err);
    });
});

// List documents
const listAll = document.getElementById('list-all');
if (!hash) {
    listDocuments().then(json => {
        if (!Object.keys(json).length) { return; }
        let table = document.createElement('table');
        let head = document.createElement('tr');
        ['Name', 'Creation time', 'Last modified', 'Download'].forEach(txt => {
            let th = document.createElement('th');
            th.innerText = txt;
            head.appendChild(th);
        });
        table.appendChild(head);
        Object.keys(json).forEach(id => {
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            let td2 = document.createElement('td');
            let td3 = document.createElement('td');
            let td4 = document.createElement('td');
            td1.innerHTML = `<a href="/encrypted#${id}">
${json[id]?.metadata?.name}
</a>`;
            td2.innerText = new Date(json[id].stat.ctime).toLocaleString();
            td3.innerText = new Date(json[id].stat.mtime).toLocaleString();
            td4.innerHTML = `<button class="file-dl"><img class="download-icon" src="/static/download.svg" alt="Download" /></button>`;
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            table.appendChild(tr);

            const button = td4.children[0];
            if (!button) { return; }
            button.addEventListener('click', e => {
                const pw = prompt('Please enter the file password');
                getDecryptedFile(id, pw).then(data => {
                    const { metadata, u8 } = data;
                    if (!u8) { return; }
                    const blob = new Blob([u8], {
                        type: metadata.type
                    });
                    const a = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    a.href = url;
                    a.download = metadata.name;
                    a.click();
                    setTimeout(() => {
                      window.URL.revokeObjectURL(url);
                    }, 0)
                }).catch(e => {
                    alert(e.message || e);
                });
            });
        });
        listAll.appendChild(table);
    }).catch(e => {
        console.error(e);
    });

}

})();
