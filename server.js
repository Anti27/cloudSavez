const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());

let data = [];

app.post('/items', (req, res) => {
    const newItem = req.body;
    data.push(newItem);
    res.status(201).json(newItem);
});

app.get('/items', (req, res) => {
    res.json(data);
});

app.put('/items/:id', (req, res) => {
    const { id } = req.params;
    const updatedItem = req.body;
    data[id] = updatedItem;
    res.json(updatedItem);
});
app.delete('/items/:id', (req, res) => {
    const { id } = req.params;
    data.splice(id, 1);
    res.status(204).send();
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
