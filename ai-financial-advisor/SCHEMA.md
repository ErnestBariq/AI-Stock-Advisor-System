# Schéma de données — AI Financial Advisor

Déduit du code existant (`app.py`, `db.py`, `cosmosClient.py`, frontend). Le backend utilise Azure Cosmos DB (NoSQL, un seul container, partitionné par `partitionKey`), donc le schéma ci-dessous suit ce modèle plutôt qu'un schéma SQL relationnel classique.

## Container `Users` (partition key: `/partitionKey`, valeur = `email`)

Un seul type de document pour l'instant : l'utilisateur, avec son portfolio imbriqué.

```json
{
  "id": "user@example.com",
  "partitionKey": "user@example.com",
  "username": "string",
  "email": "string",
  "password": "string (bcrypt hash)",
  "gender": "string",
  "age": "number",
  "investmentGoal": "string (ex: Income Generation, Growth, Capital Preservation)",
  "riskAppetite": "string (Low | Medium | High)",
  "timeHorizon": "string (Short Term | Medium Term | Long Term | Lifetime)",
  "portfolio": [
    {
      "symbol": "string (ticker)",
      "amount": "number (montant investi en USD)",
      "shares": "number",
      "investmentType": "string (Lifetime | Short Term)",
      "purchasePrice": "number",
      "currentPrice": "number",
      "dateOfPurchase": "ISO 8601 datetime",
      "predictedPrice": "number | null",
      "riskAssessment": "string | null",
      "monthlyData": "array (snapshot des données mensuelles Alpha Vantage au moment de l'achat)",
      "companyOverview": "object (snapshot Alpha Vantage OVERVIEW)",
      "financialData": "object | null",
      "newsData": "array | null"
    }
  ]
}
```

### Champs requis vs optionnels
- **Requis** : `id`, `partitionKey`, `email`, `password`, `username`
- **Optionnels / peuvent être null** : `gender`, `age`, `investmentGoal`, `riskAppetite`, `timeHorizon`, `portfolio` (défaut `[]`)

### Contraintes actuellement appliquées uniquement côté application (pas par Cosmos DB)
- `email` doit être unique (vérifié par une requête avant insertion — pas de contrainte UNIQUE native)
- Pas de validation de format d'email ni de complexité de mot de passe côté backend

## Ce qui manque dans le code actuel (pas persistant aujourd'hui)

Ces éléments existent dans le code (top movers cache, embeddings) mais dans un container/DB séparés, jamais vraiment branchés :
- **Cache `top_movers`** : `db.py`/`app.py` insèrent un document `{id, partitionKey: 'top_movers', data, timestamp}` dans le même container Cosmos — actuellement en best-effort (silencieux si DB absente)
- **ChromaDB `stock_data` collection** : prévue pour stocker des embeddings de texte (`sentence-transformers`) pour recherche sémantique, mais le code d'insertion est commenté dans `app.py` (jamais activé)

## Recommandations si tu configures une vraie Cosmos DB

1. Séparer le portfolio dans un **container distinct** (`Portfolios`, partition key `/userId`) plutôt que de l'imbriquer dans le doc utilisateur — évite de réécrire tout l'historique/snapshots à chaque ajout d'action et limite la taille du document (Cosmos DB a une limite de 2 Mo par item).
2. Ne pas stocker `companyOverview`/`newsData`/`monthlyData` en snapshot dans chaque ligne de portfolio (duplication + données qui périment) — les refetch depuis `/stocks/overview` à l'affichage, ou un cache séparé avec TTL.
3. Ajouter une contrainte d'unicité applicative stricte sur `email` (actuellement une simple requête + insert, sujette à une race condition entre les deux appels).
