import axios from "axios";

class wikipediaService {
    static async getDocuments(discoveryJob) {
        const { query } = discoveryJob.config;
        if(!query) throw new Error("Query  is missing in discoveryJob config");
        const URL = "https://en.wikipedia.org/w/api.php";
        const LIMIT = 20;

        const params = {
            action: "query",
            generator: "search",
            gsrsearch: query,
            gsrlimit: LIMIT,
            prop:"extracts|info|coordinates",
            exintro:true,
            explaintext:true,
            inprop:"url",

            format: "json",
        };
        try {
            const response = await axios.get(URL, { params });
            const pages = response.data.query?.pages ?? {};
            return Object.values(pages).map(page=>({
                source_url:page.fullurl,
                content:page

            })) 
        } catch (error) {
            console.error("Error fetching documents from Wikipedia:", error);
            throw new Error("Failed to fetch documents from Wikipedia");
        }
    }
}
export default wikipediaService;