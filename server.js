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


async function readFile(filePath) {
    const readStream = Fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: 1024
    });

    let md = '';
    let found = false;
    try {
        for await (const chunk of readStream) {
            const idx = chunk.indexOf('|');
            if (idx !== -1) {
                md += chunk.slice(0, idx);
                found = true;
                break;
            }
            md += chunk;
        }
    } catch (error) {
        console.error(`Error reading file ${filePath}: ${error.message}`);
    }

    if (!found) { return; }

    let stat;
    try {
        stat = await new Promise((resolve, reject) => {
            Fs.stat(filePath, (err, value) => {
                if (err) { return reject(err); }
                resolve(value);
            });
        });
    } catch (e) {}

    return {
        metadata: md,
        stat: {
            mtime: +stat?.mtime,
            ctime: +stat?.ctime
        }
    };
}

app.get('/list', (req, res) => {
    Fs.readdir(dataPath, (err, list) => {
        if (err) { return reject(err); }
        const names = []
        const promises = [];
        list.forEach(name => {
            names.push(name);
            promises.push(readFile(Path.join(dataPath, name)));
        });
        Promise.all(promises).then(values => {
            const json = {};
            names.forEach((name, idx) => {
                json[name] = values[idx];
            });
            res.status(200).send(json);
        });
    });
});

app.use('/data', Express.static(dataPath));
app.use('/components', Express.static(Path.resolve('./components')));
app.use(Express.static(Path.resolve('./examples')));
app.use((req, res) => {
    res.status(404).send({});
});


const httpServer = Http.createServer(app);
httpServer.listen(4000, '::');
