(() => {
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

const start = (file, sessionKey, opts, events) => {
    const docUrl = URL.createObjectURL(file); // create download url
    const ext = file.name.split('.').pop(); // extract extension
    const containerId = 'editor-container';
    const { name, view } = opts;

    const { onHasUnsavedChanges, onUserlistChange, onSave } = events;

    window.CryptPadAPI(containerId, {
        document: {
            url: docUrl,
            key: sessionKey,
            fileType: ext,
            title: file.name,
            permissions: {
                print: false,
            }
        },
        mode: view ? 'view' : 'edit',
        documentType: getApp(ext),
        editorConfig: {
            user: {
                name: name,
                jwt: 'TOKEN-EXAMPLE-' + name
            }
        },
        events: {
            onReady: () => {
                console.error('READY OUTSIDE')
            },
            onHasUnsavedChanges, // Called when we need to save
            onUserlistChange,
            onSave // called when the autosave if triggered
        },
        autosave: 10 // autosave after 10s without a change
    });
};

window.CryptPad_editor = {
    start
};

})();
