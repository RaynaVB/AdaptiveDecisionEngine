# CANONICAL_RULES.md

## What is canonical?

A canonical ingredient is the stable internal concept Recycler uses for storage, analytics, inference, and symptom correlation.

## Canonical decision rules

Create a separate canonical ingredient when one or more is true:
1. It changes allergen behavior.
2. It changes likely symptom behavior.
3. It changes how a user interprets what they ate.
4. It changes cooking role significantly.
5. It changes nutrition behavior significantly.

## Keep separate
- milk
- cream
- yogurt
- butter
- cheese
- onion
- garlic
- wheat flour
- almond flour
- soy sauce
- miso
- chickpeas
- lentils
- cashews
- peanuts
- chili pepper
- msg

## Usually collapse
- red onion -> onion
- yellow onion -> onion
- white onion -> onion
- roma tomato -> tomato
- cherry tomato -> tomato
- baby spinach -> spinach
- cilantro leaves -> cilantro

## Unresolved queue policy
Send a phrase to unresolved review when:
- two or more targets are plausible
- the phrase is a full dish, not an ingredient
- the phrase includes multiple ingredients
- the phrase is too noisy to map safely
