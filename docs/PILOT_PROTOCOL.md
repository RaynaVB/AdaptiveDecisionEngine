# Pilot Protocol (Phase 4)
## Adaptive Decision Engine (Health) — V2

This document defines the process for running the first user pilot of the Adaptive Decision Engine. The goal is to collect real-world data, validate the Recommender Engine (including the ML Contextual Bandit), and prove execution for M&T-style evidence.

---

## 1. Pilot Goals & Metrics

The pilot is designed to measure engagement and the efficacy of the adaptive recommendation loop over a **7-day period**.

### Key Metrics to Track:
1. **Logging Consistency:** Average number of meals and moods logged per day per user.
2. **Accept_Rate vs Reject_Rate:** The percentage of recommendations the user marks as "Adopted ✅", "Partially Accepted ⚠️", or "Rejected ❌".
3. **Bandit Model Efficacy:** Does the user's rejection rate decrease over the 7 days as the Contextual Bandit learns their preferences?
4. **Perceived Usefulness Rating:** A qualitative 1-5 score gathered at the end of the pilot.

---

## 2. Participant Profile
- **Target Size:** 3 to 10 users.
- **Commitment Level:** Will need to log meals and moods for 7 consecutive days and engage with recommendations.
- **Demographics:** Ideally a mix of structured eaters and intuitive/sporadic eaters to test pattern recognition boundaries.

---

## 3. Onboarding Instructions (5-Minute Setup)

**To the Participant:**
*Welcome to the Adaptive Decision Engine Pilot! This app helps identify invisible patterns between what you eat and how you feel, and offers low-friction suggestions to improve your daily rhythm.*

1. **Install the App:** Download the Expo Go app and scan the provided QR code to load the V2 environment.
2. **Create an Account:** Use the Sign Up screen.
3. **Your Daily Task (Takes < 1 minute/day):**
   - **Log Meals:** Snap a photo or write a quick text description of what you eat. Use the quick tags (Light, Heavy, Sweet, Caffeinated).
   - **Log Moods:** Check in at least twice a day (e.g., morning and afternoon). It takes 3 taps: Positivity, Energy, Stress.
4. **Engage with Insights:** After 2 days, check the "Recommendations" feed. Tell the app if you plan to do the suggested action ("Adopted ✅") or not ("Rejected ❌"). The app will learn from your choices.

---

## 4. End-of-Pilot Survey

At the end of the 7 days, participants will be asked to fill out a short, 3-minute survey.

**Survey Questions:**
1. On a scale of 1-5, how difficult was it to remember to log your meals and moods? *(1 = Very Hard, 5 = Very Easy)*
2. Did the "Weekly Patterns" screen accurately reflect your actual week? *(Yes/No/Partially)*
3. On a scale of 1-5, how useful were the daily recommendations? *(1 = Not useful at all, 5 = Extremely helpful)*
4. Did you notice the recommendations adapting or feeling more personal as the week went on? *(Yes/No)*
5. What is the #1 feature or change that would make you want to use this app every single week? *(Short text)*

---

## 5. Execution Timeline
- **Days 1-2:** Recruit users and distribute the app via Expo Go.
- **Days 3-5:** Users generate base data (patterns begin to form).
- **Days 6-9:** Continuous recommendation feedback loop active.
- **Day 10:** Cutoff. Export Firebase dataset and send the End-of-Pilot Survey.
