export interface Recommendation {
    id: string; // Instance UUID
    templateId: string; // The underlying template ID from actionLibrary
    recommendationType: string;
    title: string;
    action: string;
    whyThis: string;
    linkedPatternIds: string[];
    scores: {
        impact: number;
        feasibility: number;
        mlScore: number;
        confidence: number;
        total: number;
    };
    createdAt: string;
}
