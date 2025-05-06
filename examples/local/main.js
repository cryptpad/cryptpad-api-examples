(() => {
const Editor = window.CryptPad_editor;

const { getFile,
        sanitizeHTML,
        saveFile,
        getTitle,
        listDocuments } = window.CryptPad_utils;

const views = {};
const hash = window.location.hash;
const docId = hash && Number(hash.slice(1));
const editor = document.getElementById('editor');
const editorForm = document.getElementById('editor-form');
const upload = document.getElementById('upload');

views.edit = () => {
    // Get document title and show initial form
    document.body.setAttribute('class', 'editor');
    document.getElementById('editor-title').innerHTML = `Editing document ${hash}`;
    getTitle(docId).then(title => {
        document.getElementById('editor-title').innerHTML = `Editing document <em>${sanitizeHTML(title)}</em>`;
    }).catch(e => {
        console.error(e);
        if (e === 404) {
            alert("404: Not found");
            window.location.hash = '';
            window.location.reload();
        }
    });

    // Create back link
    const backLink = document.getElementById('back-link');
    backLink.addEventListener('click', e => {
        e.preventDefault();
        window.location.hash = '';
        window.location.reload();
    });

    // Load api freom correct instance
    const loadScript = url => {
        return new Promise((resolve, reject) => {
            const tag = document.createElement('script');
            tag.setAttribute('src', url);
            tag.setAttribute('async', 'true');
            tag.setAttribute('type', 'text/javascript');
            tag.onload = resolve;
            tag.onerror = reject;
            document.head.appendChild(tag);
        });
    };

    // Editor password form
    const editorButton = document.getElementById('editor-submit');
    const editorInstance = document.getElementById('editor-instance');
    const savingState = document.getElementById('state');
    const share = document.getElementById('share');
    editorButton.addEventListener('click', () => {
        let instance = editorInstance.value;
        let origin = new URL(instance).origin;
        let url = `${origin}/cryptpad-api.js`;
        loadScript(url).then(() => {
            if (!window.CryptPadAPI) {
                return alert('Invalid CryptPad instance');
            }
            localStorage.CryptPad_instance = editorInstance.value;
            getFile(docId).then(json => {
                const blob = new Blob([json.content], {
                    type: 'text/markdown'
                });
                blob.name = json.title;

                // Remove form
                editorForm.remove();

                // Extract session key from password
                //const key = getSessionKey(docId, pw);

                // Create save handler
                const onSave = (data, cb) => {
                    data.text().then(str => {
                        saveFile(str, json.title, docId).then(json => {
                            console.error(json);
                            cb();
                        }).catch(err => {
                            console.error(err);
                        });
                    }).catch(err => {
                        console.error(err);
                    });
                };
                const onHasUnsavedChanges = (unsaved) => {
                    if (unsaved) {
                        savingState.innerText = "The document has unsaved changes, please wait...";
                        return;
                    }
                    savingState.innerText = "The document is saved";
                };
                const onNewKey = (data, cb) => {
                    const key = data.new;
                    share.innerText = "Share link:";
                    const input = document.createElement('input');
                    input.setAttribute('readonly', 'readonly');
                    input.value = `${instance}/code/#${key}embed`;
                    input.addEventListener('focus', () => {
                        input.select();
                    });
                    share.appendChild(input);
                    cb(key);
                };

                const events = { onHasUnsavedChanges, onSave, onNewKey };

                // Call the API
                Editor.start(blob, events);
            }).catch(err => {
                console.error(err);
            });
        }).catch(err => {
            alert("Error while loading API from this instance.");
            console.error(err);
        });
    });
    if (window.location.protocol === "http:") {
        editorInstance.value = "http://localhost:3000";
    }
    if (localStorage.CryptPad_instance) {
        editorInstance.value = localStorage.CryptPad_instance;
    }
};

views.create = () => {
    // CREATE
    // Create form
    const createButton = document.getElementById('create-submit');
    const createTitle = document.getElementById('create-title');
    const createContent = document.getElementById('create-content');
    createButton.addEventListener('click', () => {
        let title = createTitle.value;
        let content = createContent.value;
        if (!title) {
            alert('Missing title');
            return;
        }
        saveFile(content, title).then(json => {
            console.error(json);
            window.location.hash = String(json.id);
            window.location.reload();
        }).catch(err => {
            console.error(err);
        });
    });

    // List documents
    const listAll = document.getElementById('list-all');
    listDocuments().then(json => {
        if (!Object.keys(json).length) { return; }
        let table = document.createElement('table');
        let head = document.createElement('tr');
        ['Name', 'Last modified', 'Download'].forEach(txt => {
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
            td1.innerHTML = `<a href="/local#${id}">
${json[id]?.title}
</a>`;
            td2.innerText = new Date(json[id].mtime).toLocaleString();
            td3.innerHTML = `<button class="file-dl"><img class="download-icon" src="/static/download.svg" alt="Download" /></button>`;
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            table.appendChild(tr);

            const button = td3.children[0];
            if (!button) { return; }
            button.addEventListener('click', e => {
                getFile(id).then(json => {
                    const blob = new Blob([json.content], {
                        type: 'text/markdown'
                    });
                    const a = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    a.href = url;
                    a.download = json.title;
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
};

// Manage views
if (hash) {
    return views.edit();
}
views.create();

})();
