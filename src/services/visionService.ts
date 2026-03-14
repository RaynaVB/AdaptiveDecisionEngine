import { getGenerativeModel, Part } from "firebase/ai";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { geminiAI, storage } from "./firebaseConfig";
import { MealTypeTag } from "../models/types";

// Base tags in our app logic
const VALID_TAGS: MealTypeTag[] = [
    'light', 'regular', 'heavy',
    'sweet', 'savory', 'homemade', 'restaurant', 'packaged',
    'high_sugar', 'fried_greasy', 'high_protein', 'high_fiber', 'caffeinated'
];

export interface VisionAnalysisResult {
    description: string;
    tags: MealTypeTag[];
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
 * Calls Gemini through Firebase Vertex AI to analyze a food image.
 */
export async function analyzeFoodImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<VisionAnalysisResult> {
    try {
        // Initialize the Gemini Model
        const model = getGenerativeModel(geminiAI, { 
            model: "gemini-3-flash-preview",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `
            Analyze this food image. Provide a short, plain-text description (e.g., "Grilled salmon with asparagus") 
            and select all relevant tags that roughly apply from this exact list: 
            [${VALID_TAGS.join(', ')}]. 
            Return a JSON object with two fields: "description" (string) and "tags" (array of strings).
        `;

        const imagePart: Part = {
            inlineData: {
                data: base64Image,
                mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();

        // Parse JSON output
        const data = JSON.parse(responseText.replace(/```json\n?|\n?```/g, ''));
        
        // Filter out any tags that aren't in our valid list just to be safe
        const safeTags = (data.tags || []).filter((t: any) => VALID_TAGS.includes(t as MealTypeTag)) as MealTypeTag[];

        return {
            description: data.description || '',
            tags: safeTags
        };

    } catch (error) {
        console.error("Error analyzing image with Vertex AI:", error);
        throw error;
    }
}
