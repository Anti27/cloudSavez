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

    const currentDate = new Date(timeStamp).toISOString().split('T')[0];
    if (existingSaves.lastSlots.length >= 5) {
        const oldestLastSave = existingSaves.lastSlots[0];
        const sameDateInHistory = existingSaves.historySlots.some(save => 
            new Date(save.timeStamp).toISOString().split('T')[0] === currentDate
        );

        if (sameDateInHistory) {
            existingSaves.historySlots = existingSaves.historySlots.filter(save => 
                new Date(save.timeStamp).toISOString().split('T')[0] !== currentDate
            );
        } else if (existingSaves.historySlots.length >= 5) {
            existingSaves.historySlots.shift();
        }
        existingSaves.historySlots.push(oldestLastSave);
        existingSaves.lastSlots.shift();
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

app.get('/returnAllPlayerIdsFromFiles', (req, res) => {
    try {
        const playerIds = fs.readdirSync(savesDirPath)
            .filter(file => file.endsWith('.json'))  // Only keep JSON files
            .map(file => path.basename(file, '.json'))  // Remove the '.json' extension
            .filter(playerId => {
                const playerSaveFilePath = path.join(savesDirPath, `${playerId}.json`);
                
                // Check if the file contains valid JSON content
                try {
                    const fileContent = fs.readFileSync(playerSaveFilePath, 'utf8');
                    if (fileContent.trim()) {
                        JSON.parse(fileContent);  // Try to parse the content
                        return true;  // Return true if it's valid JSON
                    }
                } catch (error) {
                    console.warn(`Skipping invalid or empty file: ${file}`);
                    return false;  // Skip files that can't be parsed or are empty
                }

                return false;  // Skip empty files
            });

        res.json(playerIds);  // Return the list of playerIds (filenames without extension)
    } catch (error) {
        console.error('Error getting all player IDs from files:', error);
        res.status(500).json({ error: 'Failed to get all player IDs from files' });
    }
});

app.get('/returnAllIdents', (req, res) => {
    try {
        res.json(Object.keys(playerIdentMapping));
    } catch (error) {
        console.error('Error getting all idents:', error);
        res.status(500).json({ error: 'Failed to get all idents' });
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
