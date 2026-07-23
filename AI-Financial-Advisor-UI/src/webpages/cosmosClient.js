// cosmosClient.js
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
});

const databaseId = "os.environ.get('COSMOS_DATABASE', 'ToDoList')";
const containerId = "os.environ.get('COSMOS_CONTAINER', 'Items')YourContainerName";

async function createUser(data) {
    const database = client.database(databaseId);
    const container = database.container(containerId);

    const { resource: user } = await container.items.create(data);
    return user;
}

module.exports = { createUser };
