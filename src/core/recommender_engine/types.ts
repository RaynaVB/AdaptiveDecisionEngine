export interface Recommendation {
    id: string;
    recommendationType: string;
    title: string;
    action: string;
    whyThis: string;
    linkedPatternIds: string[];
    scores: {
        impact: number;
        feasibility: number;
        confidence: number;
        total: number;
    };
    createdAt: string;
}
