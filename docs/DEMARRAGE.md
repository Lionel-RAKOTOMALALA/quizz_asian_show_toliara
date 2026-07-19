# Guide de démarrage

Toutes les commandes se lancent **depuis la racine du projet** (`d:\Quizz`).

> ⚠️ **Erreur la plus fréquente.** Les scripts sont définis dans le
> `package.json` **racine**. Lancés depuis un sous-dossier, pnpm répond
> `Command "dev:display" not found`.
>
> ```bash
> cd d:\Quizz              # revenir à la racine
> pnpm dev:display
> ```
> ```bash
> pnpm -w run dev:display  # ou cibler la racine depuis n'importe où
> ```

---

## 1. Prérequis

| Outil | Version | Vérifier avec |
| ----- | ------- | ------------- |
| Node.js | ≥ 22 | `node -v` |
| pnpm | ≥ 10 | `pnpm -v` |
| Expo Go | **SDK 54 max** | sur le téléphone |
| Internet | requis | le backend est hébergé |

**Aucune base de données à installer.** Ni XAMPP, ni WAMP, ni Docker : tout
vit sur Supabase.

---

## 2. Installation

```bash
pnpm install
pnpm bootstrap    # compile packages/shared, dont dépendent les 2 apps
```

C'est tout. Aucune variable d'environnement à renseigner : l'URL du projet et
la clé publique sont dans le code (elles sont publiques par conception —
c'est la RLS qui protège les données).

---

## 3. Lancer

### L'écran de projection

```bash
pnpm dev:display
```

- **http://localhost:3000** — classement et diaporama
- **http://localhost:3000/admin** — gestion des questions (login requis)

### L'app mobile

```bash
pnpm dev:mobile
```

Scanne le QR code avec **Expo Go**. Contrairement à l'ancienne version locale,
**aucune adresse IP à configurer** : le mobile joint Supabase directement.

---

## 4. Parcours de démonstration

1. Sur le mobile : ticket à **4 chiffres** (ex. `3208`), conditions cochées.
2. Choix de la catégorie — **définitif**, le ticket ne peut plus rejouer.
3. `Commencer l'épreuve` : 20 questions, **5 minutes au total**.
4. Sur l'écran, le classement se met à jour **instantanément** (Supabase
   Realtime). Le badge en haut à gauche indique l'état :
   - 🟢 **En direct** — Realtime actif
   - 🟠 **En différé** — repli périodique (5 s)
   - 🔴 **Serveur injoignable** — le dernier classement reste affiché
5. `Lancer le 2e tour →` bascule sur le diaporama.
   Raccourcis : `←` `→` naviguer, `Espace` révéler.
   Le diaporama est **synchronisé entre tous les écrans ouverts**.

Chaque participant doit utiliser **un ticket différent**.

---

## 5. Administrer les questions

Deux façons :

**Page `/admin`** — recherche, filtre par catégorie, création, édition,
suppression. La bonne réponse se choisit par bouton radio.

**Table Editor du dashboard** — édition brute, utile pour des corrections en
masse.

### Créer un compte organisateur

Les inscriptions publiques sont **volontairement fermées** : les politiques RLS
donnent le CRUD des questions à tout compte authentifié. Pour ajouter un
organisateur : **Authentication → Users → Add user**.

---

## 6. Backend Supabase

Projet `quizz_asian_show_Toliara` — ref `xtqcbpagxuemohsjxwke`, région
`eu-west-1`.

```bash
pnpm sb login                 # se connecter au CLI
pnpm sb:deploy quiz-answer    # redéployer une fonction
pnpm sb:logs quiz-answer      # voir ses logs
```

### ⚠️ Le port 5432 est bloqué sur ce réseau

`pnpm sb db push` et toute connexion directe à Postgres échouent en timeout.
Ce n'est ni le mot de passe ni le projet : le réseau bloque le port.

**Ça n'affecte que l'outillage local.** L'application passe par HTTPS/443 et
fonctionne parfaitement.

Pour appliquer une migration, utilise le **SQL Editor** du dashboard : colle le
contenu du fichier `.sql` et exécute.

---

## 7. En cas de problème

| Symptôme | Cause probable | Solution |
| -------- | -------------- | -------- |
| `Command "dev:display" not found` | lancé depuis un sous-dossier | `cd d:\Quizz` ou `pnpm -w run …` |
| Mobile : « Serveur injoignable » | pas d'Internet | vérifier la connexion |
| `Ticket déjà utilisé` (409) | ticket rejoué | utiliser un autre numéro |
| Écran vide, badge orange | Realtime bloqué | le repli périodique prend le relais |
| `Cannot find module '@quizz/shared'` | `shared` pas compilé | `pnpm shared:build` |
| Migration : `i/o timeout` sur 5432 | port bloqué | passer par le SQL Editor |

### Modifier `packages/shared`

Les apps consomment la version **compilée**. Après modification :

```bash
pnpm shared:build      # une fois
pnpm shared:watch      # ou en continu
```

⚠️ `supabase/functions/_shared/quiz.ts` **duplique** les constantes de
`packages/shared` (Deno ne peut pas importer depuis le workspace pnpm). Toute
modification du chrono, du nombre de questions ou de la règle de qualification
doit être reportée **des deux côtés**, puis les fonctions redéployées.

---

## 8. Remettre à zéro avant l'événement

Dans le **SQL Editor** :

```sql
delete from public.session;   -- purge sessions, tentatives et résultats
```

Le `on delete cascade` nettoie `attempt` et `result`. **Les 300 questions ne
sont pas touchées.**

---

## 9. Ce qui n'est pas encore branché

- **Les images du 2e tour** : la table `round2_image` est vide, le diaporama
  affiche un placeholder. Il faut 5 paires silhouette + photo.
- **Les points du 2e tour** : synchronisés entre écrans mais **pas persistés**
  — un rechargement les remet à zéro.
- **Le compteur « Participants »** affiche le nombre d'épreuves *terminées* :
  la table `session` est fermée à la clé publique.
