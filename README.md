# Myllo

Un tableau de tâches (kanban) simple et soigné : **À faire**, **En cours**, **Fait**.

<img width="906" height="590" alt="image" src="https://github.com/user-attachments/assets/d81ca637-55b6-4373-bed1-bae4ecce670f" />

Application 100 % front-end : HTML, CSS et JavaScript natif, sans dépendance ni étape de build. Les données restent dans votre navigateur.

## Fonctionnalités

- **Trois colonnes** : À faire, En cours, Fait, avec compteur par colonne.
- **Glisser-déposer** à la souris ou au doigt (appui long sur mobile), avec animations.
- **Tâches complètes** : titre, détails, priorité (basse, moyenne, haute, urgente), échéance et sous-tâches.
- **Échéances** : libellés « Aujourd'hui », « Demain » et « En retard ».
- **Liens cliquables** : les URL saisies dans les détails ou les sous-tâches s'affichent en puces sur la carte.
- **Recherche** dans les titres, détails et sous-tâches, et **filtre par priorité**.
- **Tri par priorité** de chaque colonne (puis par échéance).
- **Progression globale** en anneau dans l'en-tête.
- **Annulation** après suppression, vidage de la colonne « Fait » ou import.
- **Import / export JSON** pour sauvegarder ou transférer ses tâches.
- **Synchronisation entre onglets** ouverts sur Myllo.
- Respect de `prefers-reduced-motion`.

## Utilisation

Aucune installation : ouvrez `index.html` dans un navigateur récent.

Pour le servir en local :

```bash
python -m http.server 8000
# puis http://localhost:8000
```

> La police *Plus Jakarta Sans* est chargée depuis Google Fonts ; hors ligne, une police système est utilisée à la place.

## Raccourcis clavier

| Raccourci | Action |
| --- | --- |
| `N` | Nouvelle tâche |
| `/` | Rechercher |
| `Échap` | Fermer la fenêtre / vider la recherche |
| `Ctrl` + `Entrée` | Enregistrer la tâche en cours d'édition |
| `Entrée` / `Espace` | Ouvrir la carte sélectionnée |
| `Suppr` | Supprimer la carte sélectionnée |
| `Alt` + `←` / `→` | Déplacer la carte sélectionnée de colonne |

## Données

Les tâches sont enregistrées dans le `localStorage` du navigateur (clé `myllo.v1`). Elles ne quittent jamais votre machine. Vider les données du site les efface : pensez à l'export JSON pour en garder une copie.

Format d'export :

```json
{
  "app": "myllo",
  "version": 1,
  "exportedAt": "2026-10-15T08:00:00.000Z",
  "tasks": [
    {
      "id": "abc123",
      "title": "Ma tâche",
      "desc": "",
      "priority": "medium",
      "status": "todo",
      "due": "2026-10-20",
      "checklist": [{ "id": "x1", "text": "Étape 1", "done": false }],
      "createdAt": 1760000000000,
      "doneAt": null
    }
  ]
}
```

`priority` : `low`, `medium`, `high` ou `urgent`. `status` : `todo`, `doing` ou `done`.

## Structure du projet

```
index.html   Structure de la page (en-tête, colonnes, fenêtre d'édition)
styles.css   Styles (thème sombre « glassmorphism »)
app.js       Logique : état, rendu, glisser-déposer, import/export
```
