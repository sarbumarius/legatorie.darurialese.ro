# Welcome to your Lovable project
# Dashboard-ul Companiei cu Integrare API Extern

## Prezentare generală

Acesta este un dashboard de management pentru o companie, cu integrare directă cu un API extern pentru obținerea datelor despre statusurile comenzilor.

## Caracteristici

- Integrare directă cu API-ul extern (https://crm.actium.ro/api/statusuriproductie)
- Afișare statusuri în timp real (reîmprospătate la fiecare 2 secunde)
- Selectare și memorare a zonei active (debitare, printare, gravare, producție etc.)
- Monitorizare pontaj angajați în timp real
- Vizualizare rapoarte lunare de pontaj
- Arhitectură simplificată fără backend propriu
- Logging extins pentru debugging
- Interfață simplă și ușor de utilizat

## Configurare

### Instalare

```bash
npm install
```

### Arhitectură

Proiectul folosește o arhitectură extrem de simplificată cu doar 2 componente principale:

- `src/components/Dashboard.tsx` - Componentă principală care include și logica de comunicare cu API-ul extern
- `src/components/Login.tsx` - Componentă pentru autentificare

Toate constantele și funcțiile de comunicare cu API-ul extern sunt definite direct în componenta Dashboard, eliminând complexitatea inutilă a fișierelor separate.

### Rulare aplicație

```bash
npm run dev
```

## API Extern

Proiectul utilizează patru API-uri externe:

1. **API pentru statusuri comenzi**:
```
https://crm.actium.ro/api/statusuriproductie
```

2. **API pentru autentificare**:
```
https://crm.actium.ro/api/login-angajati
```
Acest API necesită email și parolă și returnează un token de autentificare care este utilizat pentru toate celelalte cereri API.

3. **API pentru verificarea pontajului zilnic**:
```
https://crm.actium.ro/api/azi-nou-angajat/{id}
```
Unde `{id}` este ID-ul angajatului. Acest API returnează informații despre pontajul angajatului în ziua curentă.

4. **API pentru pontajul lunar**:
```
https://crm.actium.ro/api/zile-muncite-luna-curenta-nou/{id}
```
Unde `{id}` este ID-ul angajatului. Acest API returnează istoricul de pontaj pentru luna curentă.

## Tehnologii utilizate

- React
- TypeScript
- Tailwind CSS
- Radix UI / shadcn-ui
## Project info

**URL**: https://lovable.dev/projects/e4018d3f-815a-44f0-a249-375c26a4591c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e4018d3f-815a-44f0-a249-375c26a4591c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e4018d3f-815a-44f0-a249-375c26a4591c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
