<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Save Test</title>
</head>
<body>
    <h1>Save Test</h1>
    <script>
        const apiUrl = 'https://cloudsavez-production.up.railway.app';

        async function deleteAllSaves() {
            try {
                const response = await fetch(`${apiUrl}/deleteAllSaves`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const result = await response.json();
                console.log('Delete All Saves Response:', result);
            } catch (error) {
                console.error('Error deleting all saves:', error);
            }
        }

        async function saveData(playerId, ident, deviceDescription, timeStamp, saveData) {
            try {
                const response = await fetch(`${apiUrl}/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ playerId, ident, deviceDescription, timeStamp, saveData }),
                });

                const result = await response.json();
                console.log('Save Response:', result);
            } catch (error) {
                console.error('Error saving data:', error);
            }
        }

        async function test() {
            await deleteAllSaves();
            await saveData('player123', 'ident123', 'Chrome Browser', new Date().toISOString(), { score: 100 });
            await saveData('player456', 'ident456', 'Firefox Browser', new Date().toISOString(), { score: 200 });
            await saveData('player789', 'ident789', 'Safari Browser', new Date().toISOString(), { score: 300 });

            // Fetch saves by playerId to check if they were saved correctly
            await fetchSaves('player123');
            await fetchSaves('player456');
            await fetchSaves('player789');

            // Fetch all player IDs
            await fetchAllPlayerIds();
        }

        async function fetchSaves(playerId) {
            try {
                const response = await fetch(`${api
