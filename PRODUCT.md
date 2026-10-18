# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) installable en PWA, base Supabase (Auth + Postgres + RLS). Mode hors connexion avec synchronisation prévu, non prioritaire : il concernera surtout la saisie des enregistrements journaliers (dépenses/revenus), en file locale puis synchronisée. Étape actuelle : maquette UI/UX cliquable à valider avant le code.

## Users

Pour l'instant une seule utilisatrice (la propriétaire) qui suit ses finances personnelles, surtout sur mobile, au quotidien. Objectif à terme : ouvrir l'app au public (multi-comptes), donc ne rien coder en dur qui soit propre à une seule personne.

## Product Purpose

Enregistrer rapidement dépenses et revenus, suivre ses épargnes par catégorie, et avoir une vue générale claire sur l'ensemble. Succès : la saisie quotidienne prend quelques secondes et l'utilisatrice sait à tout moment combien elle a, gagne, dépense et épargne.

## Positioning

L'épargne y est traitée comme dans la vraie vie en Afrique francophone : pas seulement le compte bancaire, mais aussi les cotisations (tontines, groupes) et l'épargne familiale, chacune avec un solde de départ déclaré.

## Operating Context

- Saisie quotidienne de petites transactions, souvent depuis le téléphone, parfois sans réseau.
- Rappels par notification (push PWA) pour penser à mettre à jour ses données.
- Montants en FCFA, entiers, séparateur de milliers par espace (ex. 125 000 FCFA).

## Capabilities and Constraints

- Dépenses et revenus catégorisés.
- Épargnes réparties en catégories : Cotisations, Banque, Familiale (extensible).
- Solde initial saisi pour chaque catégorie d'épargne ; les mouvements s'y ajoutent.
- Vue générale : solde, revenus, dépenses, épargne totale, tendances.
- Notifications de rappel configurables.
- Undecided : catégories de dépenses par défaut, budgets mensuels, export.

## Brand Commitments

- Couleur préférée et principale : violet #9518ad (contrainte imposée par l'utilisatrice).
- App name: "Ma moni".
- Interface in English (the user is practicing toward a B2 level), amounts in FCFA with comma grouping (3,012,250 FCFA). Light and dark modes required.
- Categories (spending, income, savings) are user-configurable: name, icon from the app's icon set, color from a fixed palette.
- Préférence de style choisie : le standard des apps de finances perso, exécuté au niveau de finition de Revolut, Wave, Monarch / Copilot Money et Apple Wallet. Pas de motif folklorique ni de gadget.

## Evidence on Hand

Aucune donnée réelle ; les maquettes utilisent des données fictives clairement d'exemple.

## Product Principles

1. Saisir en moins de 5 secondes : l'ajout est toujours à un geste.
2. La vue générale répond d'abord à « où j'en suis ce mois-ci ? ».
3. L'épargne est visible et valorisée, pas reléguée.
4. Fonctionner en mobilité, réseau ou pas.
5. Pensé personnel aujourd'hui, prêt à être public demain.
