const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;
const dataFilePath = '/app/data/items.json';
const savesDirPath = '/app/data/saves/';

app.use(express.json());
app.use(cors());

const loadData = () => {
    if (fs.existsSync(dataFilePath)) {
        const dataBuffer = fs.readFileSync(dataFilePath);
        return JSON.parse(dataBuffer.toString());
    }
    return {};
};

let playerIdentMapping = loadData();

const saveMapping = () => {
    fs.writeFileSync(dataFilePath, JSON.stringify(playerIdentMapping, null, 2));
};

const checkIdentUnique = (playerId, ident) => {
    for (const id in playerIdentMapping) {
        if (playerIdentMapping[id] === playerId && id === ident) {
            return false;
        }
    }
    return true;
};

app.post('/save', (req, res) => {
    const { playerId, ident, deviceDescription, timeStamp, saveData } = req.body;

    if (!playerId || !deviceDescription || !timeStamp || !saveData) {
        return res.status(400).json({ error: "Invalid input data" });
    }

    if (ident && !checkIdentUnique(playerId, ident)) {
        return res.status(400).json({ error: "Ident must be unique for a playerId" });
    }

    if (ident) {
        playerIdentMapping[ident] = playerId;
        saveMapping();
    }

    const playerSaveFilePath = path.join(savesDirPath, `${playerId}.json`);
    const existingSaves = fs.existsSync(playerSaveFilePath) ? JSON.parse(fs.readFileSync(playerSaveFilePath)) : { lastSlots: [], historySlots: [] };

    if (existingSaves.lastSlots.length >= 5) {
        existingSaves.historySlots.push(existingSaves.lastSlots.shift());
    }

    existingSaves.lastSlots.push({ playerId, ident, deviceDescription, timeStamp, saveData });

    fs.writeFileSync(playerSaveFilePath, JSON.stringify(existingSaves, null, 2));
    res.status(201).json({ playerId, ident, deviceDescription, timeStamp, saveData });
});

app.delete('/deleteAllSaves', (req, res) => {
    fs.readdir(savesDirPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to scan directory: ' + err });
        }

        files.forEach(file => {
            fs.unlinkSync(path.join(savesDirPath, file));
        });

        res.status(200).json({ message: 'All saves deleted' });
    });
});

// Other routes remain unchanged...

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
