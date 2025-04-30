const start = (file, events) => {
    const docUrl = URL.createObjectURL(file); // create download url
    const ext = file.name.split('.').pop(); // extract extension
    const containerId = 'editor-container';

    const { onHasUnsavedChanges, onSave, onNewKey } = events;

    window.CryptPadAPI(containerId, {
        document: {
            url: docUrl,
            //key: sessionKey,
            fileType: '.md',
            title: file.name
        },
        documentType: 'code',
        editorConfig: {
            
        },
        events: {
            onNewKey, // Called when we receive a session key
            onHasUnsavedChanges, // Called when we need to save
            onSave // called when the autosave if triggered
        },
        autosave: 10 // autosave after 10s without a change
    });
};

window.CryptPad_editor = {
    start
};
