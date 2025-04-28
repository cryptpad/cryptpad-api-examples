const Express = require('express');
const Http = require('node:http');
const Path = require('node:path');
const Fs = require('node:fs');

const app = Express();

// Create database directory if needed
const dataPath = Path.resolve('./data');
if (!Fs.existsSync(dataPath)) {
    Fs.mkdirSync(dataPath);
}

// Listen for uploads
const storeFile = (content, id) => {
    return new Promise((resolve, reject) => {
        Fs.readdir(dataPath, (err, list) => {
            if (err) { return reject(err); }
            const max = Math.max(...list.map(Number).filter(Boolean), 0);
            const fileName = id || String(max + 1);
            const filePath = Path.join(dataPath, fileName);
            Fs.writeFile(filePath, content, err => {
                if (err) { return reject(err); }
                resolve({id: fileName});
            });
        });
    });
};
app.use('/upload', (req, res) => {
    let content = '';
    const id = req.query.id;
    req.on('data', data => {
        content += data;
    });
    req.on('end', () => {
        storeFile(content, id).then(json => {
            res.status(200).send(json);
        }).catch(err => {
            res.status(500).send(err);
        })
    });
});

app.use('/data', Express.static(dataPath));
app.use('/components', Express.static(Path.resolve('./components')));
app.use(Express.static(Path.resolve('./examples')));

const httpServer = Http.createServer(app);
httpServer.listen(4000, '::');
