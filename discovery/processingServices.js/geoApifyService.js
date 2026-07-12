 import axios from "axios";
 
 
 class geMapifyService {

    static async getDocuments(discoveryJob) {

       
        const {placeId,categories} = discoveryJob.config;
        LIMIT=100;
        const URL="https://api.geoapify.com/v2/places"
        const params={
            categories:categories.join(","),
            filter:`place:${placeId}`,
            limit:LIMIT,
            apiKey:process.env.GEOMAPIFY_API_KEY
        }
        try{
            const response=await axios.get(URL,{params})
            return response.data.features ?? [];
            
        } catch (error) {
            console.error("Error fetching documents from Geoapify:", error);
            throw new Error("Failed to fetch documents from Geoapify");
        }
    }

 }  
 
 export default geMapifyService;