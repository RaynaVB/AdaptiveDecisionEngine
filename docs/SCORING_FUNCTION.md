# Recommendation Engine Scoring Function

As per the Phase 3 requirements, this document outlines how the **Adaptive Decision Engine** evaluates and ranks potential candidate actions before displaying them to the user.

## Base Architecture
The engine uses an additive formula with weights resulting in a `total` score between `0.0` and `1.0`. The scoring relies on the metadata bound to both the matched **Pattern** and the candidate **ActionTemplate**.

### 1. The Core Variables
1. **Impact (Base Weight: 40%)**
   - Derived directly from `template.intensity`.
   - `high` = 0.9, `medium` = 0.7, `low` = 0.4.
2. **Feasibility (Base Weight: 40%)**
   - Inversely correlated to `template.intensity` (high friction actions are less feasible).
   - `low` intensity = 0.9 feasibility, `medium` = 0.7, `high` = 0.4.
3. **Confidence (Base Weight: 20%)**
   - Derived directly from the underlying `pattern.confidence`.
   - `high` pattern confidence = 0.9, `medium` = 0.7, `low` = 0.4.

## Adaptive Logic (Feedback Loop)
When the Recommender Engine detects that the user has previously rejected a specific `recommendationType`, it actively adjusts the scoring mechanism during runtime to favor better outcomes:

### 1. Weight Shifting ("Feasibility First")
If a recommendation type has any historical rejections (`rejectionRate > 0`), the base weights dynamically shift. The engine infers the user is experiencing friction and re-prioritizes feasibility:
- **Impact** weight drops from `0.4` to `0.2`.
- **Feasibility** weight rises from `0.4` to `0.6`.

### 2. Intensity Reduction (Total Penalty)
After calculating the weighted sum, a linear penalty is subtracted from the total score based on the raw rejection rate. A 100% rejection rate results in a `0.4` subtraction from the total score:
```typescript
const penalty = rejectionRate * 0.4;
total = Math.max(0, total - penalty);
```

## Special Cases: Safe Baselines
When patterns yield no matches due to `TRUST_POLICY.md` constraints, the engine injects "Safe Fallback" `safe_` templates. These templates override the base scoring manually:
- `feasibility` is locked to `1.0`.
- `impact` is locked to `0.3`.
This guarantees they appear reliably but rank cleanly below any legitimate, highly-confident pattern matches.
