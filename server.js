const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;
const dataFilePath = '/app/data/items.json';
const savesDir = '/app/data/saves/';

app.use(express.json());
app.use(cors());

class Save {
    constructor(playerId, ident, deviceDescription, timeStamp, saveData) {
        this.playerId = playerId;
        this.ident = ident;
        this.deviceDescription = deviceDescription;
        this.timeStamp = timeStamp;
        this.saveData = saveData;
    }
}

const createSavesDirIfNotExists = () => {
    if (!fs.existsSync(savesDir)) {
        fs.mkdirSync(savesDir, { recursive: true });
    }
};

const loadData = () => {
    if (fs.existsSync(dataFilePath)) {
        const dataBuffer = fs.readFileSync(dataFilePath);
        return JSON.parse(dataBuffer.toString());
    }
    return [];
};

const checkIdentUnique = (ident) => {
    const playerFiles = fs.readdirSync(savesDir);
    for (const file of playerFiles) {
        const content = JSON.parse(fs.readFileSync(`${savesDir}${file}`));
        if (content.ident === ident) {
            return false; // Ident is not unique
        }
    }
    return true; // Ident is unique
};

const manageSaves = (playerId, newSave) => {
    const playerFile = `${savesDir}${playerId}.json`;
    const historySlots = [];
    const lastSlots = [];

    if (fs.existsSync(playerFile)) {
        const playerSaves = JSON.parse(fs.readFileSync(playerFile));
        playerSaves.forEach(save => {
            if (lastSlots.length < 5) {
                lastSlots.push(save);
            } else {
                historySlots.push(save);
            }
        });
    }

    if (lastSlots.length >= 5) {
        const oldestLastSlot = lastSlots[0];
        const oldestDate = new Date(oldestLastSlot.timeStamp).toISOString().split('T')[0];
        const sameDateInHistory = historySlots.findIndex(save => new Date(save.timeStamp).toISOString().split('T')[0] === oldestDate);

        if (sameDateInHistory !== -1) {
            historySlots.splice(sameDateInHistory, 1);
        } else {
            historySlots.shift();
        }
        lastSlots.shift();
    }
    lastSlots.push(newSave);
    
    const combinedSaves = [...lastSlots, ...historySlots];
    fs.writeFileSync(playerFile, JSON.stringify(combinedSaves, null, 2));
};

createSavesDirIfNotExists();

app.post('/save', (req, res) => {
    const { playerId, ident, deviceDescription, timeStamp, saveData } = req.body;

    if (!playerId || !deviceDescription || !timeStamp || !saveData) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    if (ident && !checkIdentUnique(ident)) {
        return res.status(400).json({ error: 'Ident must be unique for a playerId' });
    }

    const newSave = new Save(playerId, ident, deviceDescription, timeStamp, saveData);
    manageSaves(playerId, newSave);
    
    if (ident) {
        const identFile = `${savesDir}${ident}.json`;
        const identData = { playerId, ident };
        if (!fs.existsSync(identFile)) {
            fs.writeFileSync(identFile, JSON.stringify(identData, null, 2));
        }
    }

    res.status(201).json(newSave);
});

app.get('/getSavesByPlayerId/:playerId', (req, res) => {
    const playerId = req.params.playerId;
    const playerFile = `${savesDir}${playerId}.json`;
    if (fs.existsSync(playerFile)) {
        const saves = JSON.parse(fs.readFileSync(playerFile));
        return res.json(saves);
    }
    res.status(404).json({ error: 'Saves not found' });
});

app.get('/getSavesByIdent/:ident', (req, res) => {
    const ident = req.params.ident;
    const identFile = `${savesDir}${ident}.json`;
    if (fs.existsSync(identFile)) {
        const identData = JSON.parse(fs.readFileSync(identFile));
        const playerFile = `${savesDir}${identData.playerId}.json`;
        if (fs.existsSync(playerFile)) {
            const saves = JSON.parse(fs.readFileSync(playerFile));
            return res.json(saves);
        }
    }
    res.status(404).json({ error: 'Saves not found' });
});

app.get('/returnAllPlayerIds', (req, res) => {
    const playerFiles = fs.readdirSync(savesDir).map(file => file.replace('.json', ''));
    res.json(playerFiles);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
