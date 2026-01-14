# Adaptive Decision Engine (Health)

An AI-driven decision intelligence system that converts multimodal lifestyle inputs (meal logs + mood signals) into ranked, actionable health recommendations optimized for impact, feasibility, and user follow-through.

Unlike traditional food logging apps that emphasize nutrition breakdown and dashboards, this project focuses on behavior change by detecting patterns (timing, mood-linked eating, meal-type correlations) and generating a single best “next action” with explainable reasoning, uncertainty handling, and feedback-driven adaptation.

## Why this project
Most food logging systems provide information (calories/macros) but fail to meaningfully change lifestyle behavior. This project is a response to that gap: it reframes logging into decision support.

**V1:** Nutrition breakdown from logged meals  
**Learning:** Information alone did not reliably change behavior  
**V2 (this repo):** A decision engine that produces prioritized recommendations based on personal patterns and compliance feedback

## What V2 does
- Fast meal logging (photo or short text) + meal type tags
- Fast mood logging (tap-based predefined moods)
- Pattern detection:
  - mood dips followed by eating
  - late-night eating clusters
  - weekday vs weekend shifts
  - meal type ↔ mood correlations
- Recommendation engine:
  - outputs 1 best next action + up to 2 ranked alternatives
  - includes “why this, why now”
  - adapts based on accept/reject outcomes
- Uncertainty handling:
  - confidence scoring for inference and patterns
  - graceful fallback when signals are weak

## Not included (by design)
- Full calorie/macronutrient dashboards
- Meal planning/recipes
- Social features, streaks, gamification
- Wearables integration (HRV/Apple Health/etc.) — future phase only
- Medical claims, diagnosis, supplements, labs

## Repository structure (planned)
- `app/` UI screens
- `src/core/` pattern engine + recommender engine
- `src/models/` data models and schemas
- `docs/` PRD, scope, architecture, evaluation

## Setup
> Coming soon. Initial focus is requirements + architecture + logging MVP.

## Key docs
- `docs/PRD.md`
- `docs/SCOPE.md`
- `docs/DATA_MODEL.md` (coming)
- `docs/ARCHITECTURE.md` (coming)

## Demo
> Demo clips will be added incrementally as weekly artifacts.

## License
MIT (or TBD)
