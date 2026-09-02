# Discord Message Builder Bot

Bot Discord + interface web locale pour construire et envoyer :
- messages texte ;
- embeds ;
- boutons Discord ;
- menus de sélection ;
- réponses automatiques aux boutons et sélections.

## Installation

1. Installe Node.js 20+.
2. Crée une application/bot dans le Discord Developer Portal.
3. Invite le bot sur ton serveur avec les permissions :
   - View Channels
   - Send Messages
   - Embed Links
4. Copie `.env.example` vers `.env`.
5. Mets le token du bot dans `.env`.
6. Lance :

```bash
npm install
npm start
```

7. Ouvre `http://127.0.0.1:3000`.

## Sécurité

L'interface écoute uniquement sur `127.0.0.1` par défaut dans le code.
Ne publie jamais ton token Discord et ne commit jamais le fichier `.env`.

## Fonctionnement

L'interface charge les serveurs et salons auxquels le bot a accès.
Tu peux construire un message, ajouter un embed, plusieurs boutons et un menu de sélection.

Les boutons "Lien" ouvrent directement une URL.
Les autres boutons et les options des menus peuvent avoir une réponse éphémère.
Les actions sont sauvegardées dans `data/actions.json`, donc elles continuent de fonctionner après un redémarrage.


## Tickets
Un bouton peut maintenant avoir l'action Ticket. Choisis une catégorie, un rôle staff et le message d'accueil. Le bot crée un salon privé et ajoute un bouton Fermer le ticket. Le bot doit avoir la permission Gérer les salons.


## V3

Nouveautés :
- plusieurs messages peuvent être préparés dans l'interface ;
- bouton `Ticket + sélecteur` ;
- après le clic, l'utilisateur choisit le type de ticket ;
- chaque type peut avoir sa propre catégorie, son rôle staff et son message d'accueil ;
- bouton automatique `Fermer le ticket`.

Pour les tickets, le bot doit avoir la permission **Gérer les salons**.
