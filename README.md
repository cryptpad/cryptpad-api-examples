# Integration API documentation

CryptPad includes an integration API that allows other websites to use CryptPad applications to edit their documents. This API works in the browser and can be used with end-to-end encrypted services.

When used with this API, CryptPad only provides a collaborative session that multiple users can join to edit the same document. The data is end-to-end encrypted on the CryptPad side but doesn't persist. The integrating service is expected to manage **storage** and **access rights / sharing keys**.

## Demo

This repository contains examples using the CryptPad API:
* An **end-to-end encrypted** example where documents are stored encrypted on a server and any user who knows the password can access and create/join an collaborative editing session.
  * [Source code](https://github.com/cryptpad/cryptpad-api-examples/blob/main/examples/encrypted/editor.js)
  * In this example, the session keys are derived from the document password and are never rotated, which could represent a security issue in a production setting. See "Managing keys" for further details. 
* A **local text document** example where text documents are stored in your browser's local storage and for which you can create an collaborative editing session and share an edit link with others.
  * [Source code](https://github.com/cryptpad/cryptpad-api-examples/blob/main/examples/local/editor.js)

These examples can be tested here: https://api-examples.dev.cryptpad.net/

## API

### Pre-requisites

* A CryptPad instance running on version **2024.6 or later**
  * "Remote embedding" must be enabled in the administration's "Security" section

### Usage

* Include `https://{your-cryptpad-instance}/cryptpad-api.js` into your service's client
  * This file contains all the code you need to use the API
* Create an HTML element that will be replaced by the CryptPad editor once loaded and add an "id" attribute
* Call the API with the previously set "id" and a configuration object
  * `window.CryptPadAPI(containerId, configuration);`
* Store and share the collaborative session key to the correct users

### Configuration

* `config.document`
  * `config.document.url`: string
    * URL of the document you want to edit with CryptPad
    * If the document is not available from a remote server, you can create a local URL using the JavaScript method `URL.createObjectURL`
  * `config.document.fileType`: string
    * The document extension, used to convert the initial document provided and export to the correct format
  * `config.document.title`: string
    * The document title, sometimes displayed in the UI depending on the type of document
  * `config.document.key`: string - **optional**
    * The collaborative session key.
    * If you don't provide one, users will join a new session. The API will provide a new session key that can be shared with other users to edit the same document.
    * See the **Managing keys** section for further details
* `config.documentType`: string
  * The name of the CryptPad application you want to use to edit this document.
  * This is the path found in the URL when editing a document on CryptPad (for example: `https:cryptpad.fr/pad/...`)
    * "pad" for Rich Text
    * "sheet", "doc" and "presentation" for Office documents
    * "code" for markdown / plain text
    * etc.
* `config.editorConfig`
  * `config.editorConfig.lang`: string
    * Language code to use on the CryptPad editor (if available)
    * "en" for English, "fr" for French, etc.
* `config.autosave`: number
  * Number of seconds of inactivity before triggering an autosave of the content
  * Only one use will trigger the save during a collaborative session
  * See `config.events.onSave` for further details about saving back the content to your service
* `config.events`
  * `config.events.onSave`: function (file, callback)
    * Function called when the autosave is triggered
      * `file` is a Blob object containing the new version of your document
      * `callback` is a function that **must be called** when your service has performed the save
        * if the callback is not called, further attemps to save the file will occur
  * `config.events.onNewKey`: function (data, callback) - **optional**
    * **If provided**, your service will let CryptPad generate the session keys for each document directly and you will only be responsible for sharing the session key with the users trying to edit this document
    * **If not provided**, your service will have to generate secure keys (string) and provide them to the users.
    * Function called when a new key is provided by CryptPad, either because you didn't provide one in `config.document.key` or the one you provided is deprecated.
      * "data" is a object containing the "new" (generated) key and the "old" (provided) key
      * "callback" is a function that **must be called** with the correct "new" key as argument
    * See the **Managing keys** section for further details
  * `config.events.onHasUnsavedChanges`: function (unsaved) - **optional**
    * Function called when the editor detect unsaved changes and correct "saves"
      * "unsaved" is a boolean set to `true` if the editor contains unsaved changes and `false` is everything is saved
    * Note: this function can be used to warn the user about unsaved content if they try to leave the session early. It can also tell them when a save has been performed.

### Managing keys

The main difficulty when using the CryptPad API is to correctly manage the session keys. Since CryptPad is fully end-to-end encrypted, it doesn't know anything about the users and so it cannot manage access-rights with user sessions. The access rights then boiled down to: either you know the collaborative session key that is used to decrypt the data and you can access the document, or you don't know the key and you can't access it. **Correctly storing, sharing and rotating the keys is crucial for your documents' privacy.**


Knowing this, the API gives you 2 options to manage the session keys.

#### Option 1: let CryptPad generate the keys

With this API, you can let CryptPad generate the session keys for you. You will still have to **store the key** for each document and **provide it to the users** who have access to this file on your service. A few seconds after all the users have left a collaborative session, the key will be deprecated and will not be usable anymore, even for the same document. This will guarantee that if you remove the access to the document to one of your users, they won't be able to get its content from CryptPad directly if they remember the key.

To enable key management:

* Set `config.document.key` to the latest stored key for this document on your service
  * Don't worry about deprecated keys, the API will handle it
* Configure a `config.events.onNewKey` handler. This function will be called if the key you provided is deprecated (or missing in case it's the first time someone edits this document).
  * The function is called with 2 arguments: `data` and `callback`. `data` is an object containing:
    * `data.new`: the new key (string)
    * `data.old`: the old/provided key (string)
  * When this function is called, your service should set the key for this document to the value `data.new`, **but only** if the `data.old` key is the one that is already stored on your side.
    * This will avoid issues if multiple users try to create the session at the same time and CryptPad generate different keys for each of them.
      * The first user who receives this event will have the correct "data.old" key and will be able to set the new key
      * The second user won't have the correct "data.old" key because the stored key has been changed by the first user.
    * Note that your service must treat one change request at a time per document
  * Once the stored key has been updated on your service (which guarantees new clients will receive the correct new key), **you must call** the callback handler with the correct new key as an argument
    * example: `callback(myService.getKey('documentId'))`
* Example `onNewKey` handler
```javascript
const onNewKey = (data, callback) => {
  // new key received
  const oldKey = data.old;
  const newKey = data.new;

  // tell your backend to update the key to "newKey" if the current one matches "oldKey"
  // and return the stored key 
  updateDocumentKey(oldKey, newKey).then(newKey => {
    callback(newKey);
  }).catch(err => {
    // handle error
  });
};
```
* Use-case about onNewKey conflict
  * Alice and Bob both join "Document1" at the same time, with the key "KEY1" stored on your service.
  * Alice's client receives an "onNewKey" event with
    * `data.old` = "KEY1"  and `data.new` = "KEY_ALICE"
    * this is sent **first** to the backend
  * Bob's client received an "onNewKey" event with
    * `data.old` = "KEY1"  and `data.new` = "KEY_BOB"
    * this is sent **second** to the backend
  * Alice and Bob will both tell your backend to update the key to the new value they received
  * Your backend must only treat once request at a time (be careful with multithreading)
    * After receiving Alice's request, the stored key will now be "KEY_ALICE"
    * WHen receiving Bob's request, the old key "KEY1" doesn't match the currently stored key so the request will be ignored and "KEY_ALICE" will be responded to Bob
  * Alice and Bob will both receive "KEY_ALICE" as the new key from the server and their clients can both call `callback('KEY_ALICE')` for the "onNewKey" event and join the same collaborative session.


#### Option 2: generate the keys from your service

You can decide to generate and manage the keys yourselves. In this case, you must **not provide** a `config.events.onNewKey` handler. The CryptPad service won't check for deprecated documents or keys and will trust your service to rotate the keys correctly. Give the session key and set it to `config.document.key` to all the users who want to edit the same document and they will end up in the same collaborative session.

It is recommended to **at least** rotate the key for a given document when someone's access to this document has been revoked. This will guarantee they won't be able to use the session key to extract the document content from CryptPad directly. CryptPad will automatically destroy the document content after each collaborative session but as long as you know the key, you can always get the content while a session is online.
