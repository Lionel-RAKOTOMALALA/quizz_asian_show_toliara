# Guide de démarrage

Toutes les commandes se lancent **depuis la racine du projet** (`d:\Quizz`),
sauf mention contraire.

> ⚠️ **Erreur la plus fréquente.** Les scripts `bootstrap`, `dev:api`,
> `dev:display` sont définis dans le `package.json` **racine**. Lancés depuis
> un sous-dossier (`apps/api`, `apps/mobile`…), pnpm répond
> `Command "dev:api" not found`.
>
> Deux solutions :
>
> ```bash
> cd d:\Quizz          # revenir à la racine
> pnpm dev:api
> ```
>
> ```bash
> pnpm -w run dev:api  # ou cibler la racine depuis n'importe où
> ```

---

## 1. Prérequis

| Outil | Version | Vérifier avec |
| ----- | ------- | ------------- |
| Node.js | ≥ 22 | `node -v` |
| pnpm | ≥ 10 | `pnpm -v` |
| MySQL | via **XAMPP** ou **WAMP** | voir ci-dessous |
| Expo Go | **SDK 54 max** (contrainte de l'app mobile) | sur le téléphone |

### Démarrer MySQL

Ouvre le panneau **XAMPP** (ou **WAMP**) et démarre le service **MySQL**.
Rien d'autre n'est nécessaire : ni Apache, ni PHP.

Pour vérifier que MySQL écoute bien :

```bash
netstat -ano | findstr :3306
```

Une ligne `LISTENING` doit apparaître. Sans ça, l'API ne démarrera pas.

---

## 2. Installation (une seule fois)

```bash
pnpm install
pnpm bootstrap
```

`pnpm bootstrap` enchaîne trois étapes :

1. compile `packages/shared` (les autres apps en dépendent) ;
2. génère le client Prisma ;
3. applique les migrations — **la base `quizz` est créée automatiquement**,
   pas besoin de passer par phpMyAdmin.

> ⚠️ Ne renomme pas ce script en `setup` : `pnpm setup` est une commande
> interne de pnpm qui modifie ton `PATH` au lieu de lancer le script.

### Configuration

Le fichier `apps/api/.env` existe déjà avec les valeurs par défaut de
XAMPP/WAMP (utilisateur `root`, mot de passe vide) :

```env
DATABASE_URL="mysql://root:@localhost:3306/quizz"
PORT=3333
```

Si ton MySQL a un mot de passe root, adapte l'URL :
`mysql://root:MOT_DE_PASSE@localhost:3306/quizz`

---

## 3. Lancer les trois apps

Chaque app tourne dans **son propre terminal**.

### Terminal 1 — l'API (obligatoire)

```bash
pnpm dev:api
```

Attendu : `API prête sur http://localhost:3333`, précédé de
`100 questions chargées (kpop)` et `200 questions chargées (anime)`.

### Terminal 2 — l'écran de projection

```bash
pnpm dev:display
```

Puis ouvre **http://localhost:3000**.

### Terminal 3 — l'app mobile

Il faut d'abord **l'adresse IP de ton PC sur le réseau local** — le téléphone
ne peut pas joindre `localhost` :

```bash
ipconfig
```

⚠️ **Cette machine affiche plusieurs adresses IPv4.** Il faut celle qui
commence par **`192.168.`** (la carte Wi-Fi). Les adresses en `172.x.x.x` sont
des cartes virtuelles (Docker / WSL / Hyper-V) : le téléphone ne les atteindra
jamais.

```
Adresse IPv4. . . : 172.21.16.1     ← carte virtuelle, ignorer
Adresse IPv4. . . : 172.28.64.1     ← carte virtuelle, ignorer
Adresse IPv4. . . : 192.168.7.9     ← celle-ci ✅
```

Pour filtrer directement :

```bash
ipconfig | findstr /C:"192.168."
```

Ensuite :

```bash
cd apps/mobile
$env:EXPO_PUBLIC_API_URL="http://192.168.7.9:3333"; pnpm start
```

En Git Bash :

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://192.168.7.9:3333 pnpm start
```

Scanne le QR code avec **Expo Go**. Le téléphone et le PC doivent être sur
**le même réseau Wi-Fi**.

---

## 4. Les ports

| Port | App | Note |
| ---- | --- | ---- |
| 3306 | MySQL | XAMPP / WAMP |
| 3333 | API NestJS | |
| 3000 | Écran de projection | |
| 8081 | Metro (Expo) | |

Le port **3001 est volontairement évité** : un autre projet l'occupe sur cette
machine.

---

## 5. Parcours de démonstration

1. Sur le mobile : saisis un ticket à **4 chiffres** (ex. `3208`), coche les
   conditions, `Continuer`.
2. Choisis une catégorie — **le choix est définitif**, le ticket ne peut plus
   rejouer.
3. `Commencer l'épreuve` : 20 questions, **5 minutes au total**.
4. À la fin, le score et le classement s'affichent.
5. Sur l'écran de projection, le classement se met à jour **instantanément**
   (poussé par WebSocket dès qu'un participant termine, ~200 ms).
   Le badge en haut à gauche indique l'état :
   - 🟢 **En direct · réseau local** — WebSocket actif
   - 🟠 **En différé · repli réseau** — socket indisponible, rafraîchi toutes
     les 5 s par REST
   - 🔴 **Serveur injoignable** — API éteinte (le dernier classement reste
     affiché)
6. `Lancer le 2e tour →` bascule sur le diaporama.
   Raccourcis : `←` `→` pour naviguer, `Espace` pour révéler.
   Le diaporama est **synchronisé entre tous les écrans ouverts** : ouvre
   `http://192.168.7.9:3000` sur un portable pour piloter la projection à
   distance, l'image et les points suivent.

Chaque nouveau participant doit utiliser **un numéro de ticket différent**.

---

## 6. En cas de problème

| Symptôme | Cause probable | Solution |
| -------- | -------------- | -------- |
| API : `Can't reach database server` | MySQL éteint | Démarrer MySQL dans XAMPP/WAMP |
| API : `EADDRINUSE :::3333` | Port déjà pris | `npx kill-port 3333` |
| Mobile : « Serveur injoignable » | `localhost` au lieu de l'IP | Refaire `ipconfig`, relancer avec `EXPO_PUBLIC_API_URL` |
| Mobile : QR code refusé par Expo Go | Version de SDK | L'app cible le **SDK 54** — ne pas l'upgrader |
| Écran web vide, badge « Serveur injoignable » | API éteinte | Lancer `pnpm dev:api` |
| Erreur `Cannot find module '@quizz/shared'` | `shared` pas compilé | `pnpm shared:build` |
| `Ticket déjà utilisé` (409) | Ticket rejoué | Utiliser un autre numéro, ou vider la base (§7) |

### Modifier `packages/shared`

Les apps consomment la version **compilée** de `shared`. Après une
modification, il faut recompiler :

```bash
pnpm shared:build
```

Ou laisser tourner la recompilation automatique dans un terminal dédié :

```bash
pnpm shared:watch
```

---

## 7. Gérer les données

Inspecter la base dans une interface graphique :

```bash
pnpm db:studio
```

Repartir d'une base vide (⚠️ **supprime tous les résultats**) :

```bash
pnpm --filter @quizz/api exec prisma migrate reset --force
```

---

## 8. Ce qui n'est pas encore branché

- **Les images du 2e tour** : la table `Round2Image` est vide, le diaporama
  affiche donc un placeholder. Il faut 5 paires silhouette + photo.
- **L'attribution des points du 2e tour** : les boutons `+` sont synchronisés
  entre écrans mais **pas persistés en base** — un rechargement les remet à
  zéro (règle « à affiner avec le client »).
