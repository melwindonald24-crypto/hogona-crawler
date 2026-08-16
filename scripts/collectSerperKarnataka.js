import "dotenv/config";

import sequelize from "../db/database.js";
import discovery_job from "../db/models/discovery_job.js";
import raw_evidence from "../db/models/raw_evidence.js";
import rawEvidenceService from "../services/discovery/RawEvidenceservice.js";
import serperPlacesService from "../services/discovery/serperPlacesService.js";



const TOURISM_DATASET = {
  TIER_1_ULTRA_HIGH_DENSITY: {
    "Uttara Kannada": ["water", "terrain", "culture", "wildlife", "tourism", "leisure"],
    "Kodagu": ["water", "terrain", "culture", "wildlife", "tourism"],
    "Chikkamagaluru": ["water", "terrain", "culture", "wildlife", "tourism"],
    "Mysuru": ["culture", "wildlife", "tourism", "leisure"],
    "Udupi": ["leisure", "culture", "terrain", "water", "tourism"]
  },
  TIER_2_HIGH_DENSITY: {
    "Vijayanagara": ["culture", "wildlife", "tourism", "leisure"],
    "Dakshina Kannada": ["leisure", "culture", "terrain", "tourism"],
    "Hassan": ["culture", "terrain", "water", "tourism"],
    "Shivamogga": ["water", "terrain", "wildlife", "culture", "tourism"],
    "Mandya": ["culture", "leisure", "water", "tourism"],
    "Bagalkote": ["culture", "tourism"],
    "Chamarajanagar": ["wildlife", "terrain", "culture"]
  },
  TIER_3_MODERATE_DENSITY: {
    "Bengaluru Urban": ["tourism", "wildlife", "culture"],
    "Ramanagara": ["terrain", "wildlife", "water", "leisure"],
    "Chikkaballapur": ["terrain", "culture"],
    "Vijayapura": ["culture", "tourism"],
    "Tumakuru": ["terrain", "culture", "leisure"],
    "Bidar": ["culture", "tourism"],
    "Belagavi": ["water", "culture", "wildlife", "terrain"],
    "Chitradurga": ["culture", "leisure"],
    "Ballari": ["culture"],
    "Kalaburagi": ["culture"],
    "Kolar": ["culture", "terrain"],
    "Koppal": ["culture"]
  }
};
const COASTAL_DISTRICTS=["Udupi", "Dakshina Kannada", "Uttara Kannada"];


const CATEGORY_QUERIES = {
    water: (district) => `waterfalls in ${district}, Karnataka`,
    terrain: (district) => `trekking hills viewpoints in ${district}, Karnataka`,
    culture: (district) => `historic temples forts historic sites in ${district}, Karnataka`,
    wildlife: (district) => `wildlife sanctuaries national parks in ${district}, Karnataka`,
    tourism: (district) => `tourist attractions in ${district}, Karnataka`,
    leisure: (district) =>
        COASTAL_DISTRICTS.includes(district)
            ? `beaches  in ${district}, Karnataka`
            : `lakes dams in ${district}, Karnataka`,
};

const source = "serper";

function configFor(district, category) {
    return {
        district,
        category,
        q: CATEGORY_QUERIES[category](district),
        gl: "in",
        hl: "en",
    };
}

async function getOrCreateJob(config) {
    return discovery_job.findOrCreate({
        where: { source, config },
        defaults: { source, config },
    });
}

async function collectDistrictCategory(district, category) {
    const config = configFor(district, category);
    const [job] = await getOrCreateJob(config);
    const label = `${district}/${category}`;

    if (job.status === "completed") {
        console.log(`Skipped ${label}: already completed (${job.id}).`);
        return "skipped";
    }

    try {
        await job.update({ status: "running" });
        const documents = await serperPlacesService.getDocuments(job);

        for (const document of documents) {
            await rawEvidenceService.createRawEvidence({
                discoveryJobId: job.id,
                sourceUrl: document.source_url,
                content: document.content,
            });
        }

        await job.update({ status: "completed" });
        console.log(`Collected ${label} (${job.id}).`);
        return "completed";
    } catch (error) {
        await job.update({ status: "failed" });
        console.error(`Failed ${label} (${job.id}): ${error.message}`);
        return "failed";
    }
}

async function main() {
    if (!process.env.SERPER_API_KEY) {
        throw new Error("SERPER_API_KEY is required. Add it to .env before running this script.");
    }

    await sequelize.authenticate();

    // Only the acquisition tables are synchronized; no enrichment tables are touched.
    await discovery_job.sync();
    await raw_evidence.sync();

    const categories = Object.keys(CATEGORY_QUERIES);
    const summary = { completed: 0, skipped: 0, failed: 0 };
   
    for(const [tier,districts] of Object.entries(TOURISM_DATASET)){
        for(const [district,categories] of Object.entries(districts)){
            for(const category of categories){
                const outcome = await collectDistrictCategory(district, category);
                summary[outcome] += 1;

            }

        }
    }

    const totalQueries = KARNATAKA_DISTRICTS.length * categories.length;
    console.log(`Finished ${totalQueries} district/category queries. completed=${summary.completed}, skipped=${summary.skipped}, failed=${summary.failed}`);

    if (summary.failed > 0) {
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error(`Serper discovery failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });
