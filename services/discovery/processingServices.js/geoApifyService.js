 import axios from "axios";
 
 
 class geoMapifyService {

    static async getDocuments(discoveryJob) {
        const { placeId, categories } = discoveryJob.config ?? {};
        const limit = 100;

        if (!placeId || !Array.isArray(categories) || categories.length === 0) {
            throw new Error("Geoapify discovery requires a placeId and at least one category.");
        }

        const apiKey = process.env.GEOAPIFY_API_KEY ?? process.env.GEOMAPIFY_API_KEY;
        if (!apiKey) {
            throw new Error("GEOAPIFY_API_KEY is not configured.");
        }

        const URL="https://api.geoapify.com/v2/places"
        const params={
            categories:categories.join(","),
            filter:`place:${placeId}`,
            limit,
            apiKey,
        }
        try{
            const response=await axios.get(URL,{params})

            if(response.status!==200)
            {
                throw new Error(`geoapify returned http ${response.status}`)
            }

            return {content:response.data.features ?? []};
            
        } catch (error) {
            console.error("Error fetching documents from Geoapify:", error);
            throw new Error("Failed to fetch documents from Geoapify");
        }
    }

 }  
 
 export default geoMapifyService;
