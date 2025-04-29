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

const start = (file, sessionKey, events) => {
    const docUrl = URL.createObjectURL(file); // create download url
    const ext = file.name.split('.').pop(); // extract extension
    const containerId = 'editor-container';

    const { onHasUnsavedChanges, onSave } = events;

    CryptPadAPI(containerId, {
        document: {
            url: docUrl,
            key: sessionKey,
            fileType: ext,
            title: file.name
        },
        documentType: getApp(ext),
        editorConfig: {
            
        },
        events: {
            onHasUnsavedChanges, // Called when we need to save
            onSave // called when the autosave if triggered
        },
        autosave: 10 // autosave after 10s without a change
    });
};

window.CryptPad_editor = {
    start
};
