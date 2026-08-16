import axios from "axios";

export const SERPER_PLACES_URL = "https://google.serper.dev/places";


class SerperPlacesService {

    static async getDocuments(discoveryJob) {

        const { q, gl = "in", hl = "en" } = discoveryJob.config ?? {};

        //validation
        if (typeof q !== "string" || q.trim() === "") {
            throw new Error("Serper discovery requires a non-empty config.q query.");
        }

        const apiKey = process.env.SERPER_API_KEY;
        if (!apiKey) {
            throw new Error("SERPER_API_KEY is not configured.");
        }

        try {
            const response = await axios.post(
                
                SERPER_PLACES_URL,
                { q: q.trim(), gl, hl },
                {
                    headers: {
                        "X-API-KEY": apiKey,
                        "Content-Type": "application/json",
                    },
                    timeout: 30_000,
                },
            );

            return [{
                source_url: SERPER_PLACES_URL,
                content: response.data,
            }];
        } catch (error) {
            const status = error.response?.status;
            const detail = status ? ` (HTTP ${status})` : "";
            throw new Error(`Serper Places request failed${detail}.`, { cause: error });
        }
    }
}

export default SerperPlacesService;
