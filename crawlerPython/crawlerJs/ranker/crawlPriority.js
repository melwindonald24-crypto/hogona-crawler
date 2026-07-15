import TextNormalizer from './textNormalizer.js';


const HIGH_VALUE_KEYWORDS = [
    "waterfalls",
    "trek",
    "mountain",
    "peak",
    "hike",
    "river",
    "lake",
    "forest",
    "beach",
    "cave",
    "fort",
    "temple",
    "monument",
    "hidden",
    "offbeat",
    "unexplored",
    "wildlife",
    "viewpoint",
    "sanctuary",
    "safari",
];

const TRAVEL_KEYWORDS = [
    "travel",
    "tourism",
    "destination",
    "attraction",
    "place",
    "sightseeing",
    "guide",
    "explore",
    "adventure",
    "vacation",
    "holiday",
    "journey",
    "trip",
    "itinerary",
]

const HIGH_VALUE_SET = new Set(
    TextNormalizer.normalize(HIGH_VALUE_KEYWORDS.join(' '))
)
const TRAVEL_SET = new Set(
    TextNormalizer.normalize(TRAVEL_KEYWORDS.join(' '))
)

class CrawlPriority {

    static  urlScore({url,text=""}) {
        const priority=1;
        const parsedUrl=new URL(url);
        const URLTokens=new Set(TextNormalizer.normalize(parsedUrl.pathname));
        const textTokens=new Set(TextNormalizer.normalize(text));
        priority+=this.#calulate(
            URLTokens,
            HIGH_VALUE_SET,
            2
        )
        priority+=this.#calulate(
            URLTokens,
            TRAVEL_SET,
            1
        )
        priority+=this.#calulate(
            textTokens,
            HIGH_VALUE_SET,
            3
        )
        priority+=this.#calulate(
            textTokens,
            TRAVEL_SET,
            1.5
        )
        return priority;

    } 
    static #calulate(tokens,keywordSet,weight)
    {
        let score=0;
        for(const token of tokens)
        {
            if(keywordSet.has(token))
            {
                score+=weight;
            }
        }
        return score;
    }      
}

export default CrawlPriority;