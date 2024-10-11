const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;
const dataFilePath = '/app/data/items.json';

app.use(express.json());
const loadData = () => {
    if (fs.existsSync(dataFilePath)) {
        const dataBuffer = fs.readFileSync(dataFilePath);
        return JSON.parse(dataBuffer.toString());
    }
    return [];
};
let data = loadData();
app.post('/items', (req, res) => {
    const newItem = req.body;
    data.push(newItem);
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    res.status(201).json(newItem);
});
app.get('/items', (req, res) => {
    res.json(data);
});
app.put('/items/:id', (req, res) => {
    const { id } = req.params;
    const updatedItem = req.body;
    data[id] = updatedItem;
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    res.json(updatedItem);
});
app.delete('/items/:id', (req, res) => {
    const { id } = req.params;
    data.splice(id, 1);
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    res.status(204).send();
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
