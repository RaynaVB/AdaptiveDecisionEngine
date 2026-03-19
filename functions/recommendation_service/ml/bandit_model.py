import numpy as np
import math
from typing import Dict, List, Optional
from firebase_admin import firestore

class ContextualBandit:
    def __init__(self, db: firestore.client, user_id: str):
        self.db = db
        self.user_id = user_id
        self.learning_rate = 0.1
        self.weights: Dict[str, List[float]] = {}
        self.loaded = False

    def _get_doc_ref(self):
        return self.db.collection('users').document(self.user_id).collection('ml_metadata').document('bandit_weights')

    def ensure_loaded(self):
        if self.loaded:
            return
        
        doc = self._get_doc_ref().get()
        if doc.exists:
            self.weights = doc.to_dict() or {}
        self.loaded = True

    def get_weights_for_template(self, template_id: str) -> List[float]:
        if template_id not in self.weights:
            self.weights[template_id] = [0.0, 0.0, 0.0, 0.0]
        return self.weights[template_id]

    def predict(self, template_id: str, context: List[float]) -> float:
        w = self.get_weights_for_template(template_id)
        # Dot product
        score = sum(wi * ci for wi, ci in zip(w, context))
        # Sigmoid
        return 1.0 / (1.0 + math.exp(-max(min(score, 20), -20))) # Clamp to avoid overflow

    def update(self, template_id: str, context: List[float], reward: float):
        self.ensure_loaded()
        w = self.get_weights_for_template(template_id)
        
        predicted_reward = self.predict(template_id, context)
        error = reward - predicted_reward

        for i in range(len(w)):
            w[i] += self.learning_rate * error * context[i]

        self.weights[template_id] = w
        self.save()

    def save(self):
        self._get_doc_ref().set(self.weights)
