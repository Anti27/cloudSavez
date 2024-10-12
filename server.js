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

class Save {
    constructor(playerId, ident, deviceDescription, timeStamp, saveData) {
        this.playerId = playerId;
        this.ident = ident || '';
        this.deviceDescription = deviceDescription;
        this.timeStamp = timeStamp;
        this.saveData = saveData;
    }
}

const loadData = () => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const dataBuffer = fs.readFileSync(dataFilePath);
            return JSON.parse(dataBuffer.toString());
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
    return {};
};

let playerIdentMapping = loadData();
const saveMapping = () => {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(playerIdentMapping, null, 2));
    } catch (error) {
        console.error('Error saving mapping:', error);
    }
};

const checkIdentUnique = (playerId, ident) => {
    return !Object.keys(playerIdentMapping).some(id => playerIdentMapping[id] === playerId && id !== ident);
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
    let existingSaves;
    try {
        existingSaves = fs.existsSync(playerSaveFilePath) ? JSON.parse(fs.readFileSync(playerSaveFilePath)) : { lastSlots: [], historySlots: [] };
    } catch (error) {
        console.error('Error reading existing saves:', error);
        return res.status(500).json({ error: 'Failed to read existing saves' });
    }
    if (existingSaves.lastSlots.length >= 5) {
        existingSaves.historySlots.push(existingSaves.lastSlots.shift());
    }
    existingSaves.lastSlots.push(new Save(playerId, ident, deviceDescription, timeStamp, saveData));
    try {
        fs.writeFileSync(playerSaveFilePath, JSON.stringify(existingSaves, null, 2));
        res.status(201).json({ playerId, ident, deviceDescription, timeStamp, saveData });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.delete('/deleteAllSaves', (req, res) => {
    fs.readdir(savesDirPath, (err, files) => {
        if (err) {
            console.error('Error reading saves directory:', err);
            return res.status(500).json({ error: 'Unable to scan directory: ' + err });
        }
        files.forEach(file => {
            fs.unlinkSync(path.join(savesDirPath, file));
        });
        playerIdentMapping = {};
        saveMapping();
        res.status(200).json({ message: 'All saves and player ident mappings deleted' });
    });
});

app.get('/getSavesByPlayerId/:playerId', (req, res) => {
    const playerId = req.params.playerId;
    const playerSaveFilePath = path.join(savesDirPath, `${playerId}.json`);
    try {
        if (fs.existsSync(playerSaveFilePath)) {
            const saves = JSON.parse(fs.readFileSync(playerSaveFilePath));
            res.json(saves);
        } else {
            res.status(404).json({ error: 'No saves found for this playerId' });
        }
    } catch (error) {
        console.error('Error getting saves by playerId:', error);
        res.status(500).json({ error: 'Failed to get saves by playerId' });
    }
});

app.get('/getSavesByIdent/:ident', (req, res) => {
    const ident = req.params.ident;
    const playerId = playerIdentMapping[ident];

    if (!playerId) {
        return res.status(404).json({ error: 'No playerId found for this ident' });
    }

    const playerSaveFilePath = path.join(savesDirPath, `${playerId}.json`);

    try {
        if (fs.existsSync(playerSaveFilePath)) {
            const saves = JSON.parse(fs.readFileSync(playerSaveFilePath));
            res.json(saves);
        } else {
            res.status(404).json({ error: 'No saves found for this playerId' });
        }
    } catch (error) {
        console.error('Error getting saves by ident:', error);
        res.status(500).json({ error: 'Failed to get saves by ident' });
    }
});

app.get('/returnAllPlayerIds', (req, res) => {
    try {
        res.json(Object.keys(playerIdentMapping));
    } catch (error) {
        console.error('Error getting all player IDs:', error);
        res.status(500).json({ error: 'Failed to get all player IDs' });
    }
});

app.get('/fullStorageTree', (req, res) => {
    try {
        const tree = {
            playerIdentMapping,
            saves: fs.readdirSync(savesDirPath).map(file => file.replace('.json', ''))
        };
        res.json(tree);
    } catch (error) {
        console.error('Error getting full storage tree:', error);
        res.status(500).json({ error: 'Failed to get full storage tree' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});
