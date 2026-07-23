const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3033;

// Middleware to serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all route to serve the React app's index.html for all unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
