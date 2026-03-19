from typing import List, Dict, Any

def rank_recommendations(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Sort by total score descending
    candidates.sort(key=lambda x: x["scores"]["total"], reverse=True)
    # Return top 3
    return candidates[:3]
