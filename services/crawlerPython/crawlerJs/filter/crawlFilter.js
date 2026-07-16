
const BLACKLIST_KEYWORDS = new Set([
    "about-us",
    "contact-us",
    "privacy-policy",
    "terms-of-service", 
    "terms-and-conditions",
    "login",
    "signup",
    "register",
    "disclaimer",
    "faq",
    "help", 
    "support",
    "careers",
    "jobs",
    "contact",
    "advertise",
    "advertising",
    "about",
    "terms",

])

class CrawlFilter {
    static isBlacklisted(url) 
        {
            try {
                const parsedURL = new URL(url);
                const segments = parsedURL.pathname
                    .toLowerCase()
                    .split('/')
                    .filter(Boolean);

                for (const segment of segments) {
                    if (BLACKLIST_KEYWORDS.has(segment)) {
                        return true;
                    }
                }
            } catch {
                return true;
            }
            return false;
        }

}
export default CrawlFilter;
