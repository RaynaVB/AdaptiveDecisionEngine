# Personal Food & Mood Recommendation Engine: Technical Spec

## 1. Data Model (Event-Sourced)
We store Mood and Food as independent event streams to allow for asynchronous logging.

| Table | Field | Type | Description |
| :--- | :--- | :--- | :--- |
| **Events** | `event_id` | UUID | Primary Key |
| | `user_id` | UUID | FK to User |
| | `timestamp` | DateTime | ISO8601 |
| | `type` | Enum | FOOD_ENTRY, MOOD_ENTRY |
| | `metadata` | JSONB | Weather, Location, Source (Cam/Text) |
| **Mood_Details**| `label` | String | e.g., "Anxious", "Exhausted" |
| | `valence` | Float | -1.0 to 1.0 (Pleasantness) |
| | `arousal` | Float | -1.0 to 1.0 (Energy level) |
| **Food_Details**| `raw_text` | String | User's typed input |
| | `tags` | Array | AI-extracted (e.g., ["spicy", "crunchy"]) |
| | `nutrients` | JSONB | Macro/Micro estimates |

---

## 2. The Weighted Decay Function
To link an asynchronous mood to a subsequent meal, we calculate the Mood Influence Weight ($W$).

$$W = e^{-\lambda \Delta t}$$

* **$\Delta t$**: Hours since mood log.
* **$\lambda$ (Decay Constant)**: 
    * Fast (2.0): For "Spike" moods (Hangry, Excited).
    * Slow (0.3): For "Persistent" moods (Sad, Burnt out).

---

## 3. The ML Model Architecture
For a personalized engine, we utilize a **Contextual Multi-Armed Bandit (CMAB)** or a **Deep Collaborative Filtering** approach.

### Feature Engineering
1. **User Context (Input):**
   * Last 3 Mood Vectors (weighted by decay).
   * Current Time/Weather.
   * User's 7-day flavor preference average.
2. **Food Candidates (Output):**
   * Predicted "Preference Score" for $N$ food items.

### Model Choice: XGBoost or LightGBM
Since food data is often tabular and sparse, Gradient Boosted Decision Trees (GBDT) are highly effective.

**Objective Function:** Maximize the "Satisfaction Score" (User feedback or repeat order probability).

```python
# Conceptual Model Training (Pseudo-code)
import xgboost as xgb

# X: [Weighted_Mood_Valence, Weighted_Mood_Arousal, Hour_of_Day, Day_of_Week]
# y: [Food_Feature_Spicy, Food_Feature_Carb, Food_Feature_Texture]

model = xgb.XGBRegressor(objective='reg:squarederror')
model.fit(X_train, y_train)

# Prediction
current_context = [[-0.4, 0.7, 18, 5]] # Stressed, Energetic, 6PM, Friday
recommended_food_features = model.predict(current_context)

# 4. The Sliding Window Algorithm
When training, the system looks back from a Food Event using a 4-hour window.

* **Collect**: Find all MOOD_ENTRY where $T_{food} - 4hr < T_{mood} < T_{food}$.
* **Flatten**: Multiply each mood's Valence/Arousal by its $W$.
* **Average**: Create one single "Context Vector" for that specific meal.
* **Train**: Use this Context Vector as the features ($X$) and the Food Tags as the target ($y$).



