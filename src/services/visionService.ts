import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "./firebaseConfig";
// Cloud Function URL configuration
const USE_EMULATOR = false;
const PROD_URL = 'https://vision-service-n5p5ozwbwa-uc.a.run.app';
const LOCAL_URL = 'http://192.168.4.39:5001/adaptivehealthengine/us-central1/vision_service';
const BASE_URL = USE_EMULATOR ? LOCAL_URL : PROD_URL;

export interface VisionAnalysisResult {
    isFood: boolean;
    description: string;
    dishName: string;
    visibleComponents: string[];
    suggestedIngredients: string[];
    potentialQuestions: Array<{ id: string; text: string }>;
}

/**
 * Uploads a local image file to Firebase Storage.
 */
export async function uploadImageToFirebase(imageUri: string, mealId: string, userId: string = 'anonymous'): Promise<string> {
    try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        // Define path in storage
        const storageRef = ref(storage, `users/${userId}/meals/${mealId}.jpg`);
        
        await uploadBytes(storageRef, blob, {
            contentType: 'image/jpeg',
        });
        
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
    } catch (error) {
        console.error("Error uploading image to Firebase Storage:", error);
        throw error;
    }
}

/**
 * Calls the Python Vision Service to analyze a food image.
 */
export async function analyzeFoodImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
        const token = await user.getIdToken();
        const response = await fetch(`${BASE_URL}/v1/analyze-food`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                base64Image,
                mimeType
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to analyze image: ${response.status} ${response.statusText}. ${errorBody.slice(0, 100)}`);
        }

        const data = await response.json();
        
        // Fallback for questions if the LLM returns strings instead of objects
        const rawQuestions = data.potentialQuestions || [];
        const potentialQuestions = rawQuestions.map((q: any, index: number) => {
            if (typeof q === 'string') {
                return { id: `q_${index}`, text: q };
            }
            if (typeof q === 'object' && q.text) {
                return { id: q.id || `q_${index}`, text: q.text };
            }
            return null;
        }).filter(Boolean) as Array<{ id: string; text: string }>;

        return {
            isFood: !!data.isFood,
            description: data.description || '',
            dishName: data.dishName || '',
            visibleComponents: data.visibleComponents || [],
            suggestedIngredients: data.suggestedIngredients || [],
            potentialQuestions
        };

    } catch (error) {
        console.error("Error analyzing image with Vision Service:", error);
        throw error;
    }
}
