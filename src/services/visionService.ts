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
    isFood: boolean;
    description: string;
    dishName: string;
    visibleComponents: string[];
    suggestedIngredients: string[];
    tags: MealTypeTag[];
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
            Analyze this food image for a medical-grade symptom tracking app. It is critical to identify ALL possible ingredients that could trigger symptoms (e.g., dairy, gluten, specific spices, oils, legumes).
            
            Provide the following structured data:
            1. isFood: boolean, true if the image is primarily of food.
            2. description: A brief summary of the meal.
            3. dishName: The specific name of the dish.
            4. visibleComponents: A comprehensive list of individual ingredients clearly seen in the image. Be specific (e.g., "whole wheat bread", "cheddar cheese", "romaine lettuce").
            5. suggestedIngredients: A list of ingredients that are almost certainly present in this dish but not explicitly visible (e.g., "butter", "cooking oil", "salt", "garlic", "onion", "wheat flour" in a breaded item). Be exhaustive.
            6. tags: Select relevant tags from this exact list: [${VALID_TAGS.join(', ')}].
            7. potentialQuestions: 2-3 smart follow-up questions to clarify unknown ingredients or hidden components. 
               Format each question as an object: {"id": "unique_id", "text": "Question text?"}.
               IMPORTANT: Each question MUST be a Yes/No question. Use specific ingredient checks like "Was there any butter?" or "Does this contain dairy?" NOT "Was this A or B?".

            Return ONLY a strict JSON object. If isFood is false, the other fields can be empty/null, but still return the object.
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
            tags: safeTags,
            potentialQuestions
        };


    } catch (error) {
        console.error("Error analyzing image with Vertex AI:", error);
        throw error;
    }
}
